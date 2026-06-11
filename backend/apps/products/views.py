"""
MVC ROLE: CONTROLLER — thin HTTP boundary, delegates all logic outward.
DESIGN PATTERNS APPLIED:
  • Repository    — all queryset logic lives in ProductRepository /
                    CategoryRepository; views never call Product.objects.xxx()
  • Factory       — ProductCreateView delegates creation to ProductFactory,
                    which picks the right Builder based on product_type
  • RBAC          — permission_classes enforce who can create/update/delete

WHY VIEWS ARE DELIBERATELY THIN:
---------------------------------
Each view method does the same three things:
  1. Parse and validate input (via DRF Serializer)
  2. Call a repository or factory
  3. Serialize the result and return a Response

If a view does anything else (SQL queries, business rules, conditionals
unrelated to HTTP), it's a sign the logic belongs in a service or repository.

PATTERN — REPOSITORY IN ACTION:
  ProductListView.get_queryset() calls product_repo.get_all_published()
  The repo applies select_related / prefetch_related for N+1 prevention.
  The view has no idea how those are fetched — it just asks for the data.

PATTERN — FACTORY IN ACTION:
  ProductCreateView.post() delegates to ProductFactory.create(product_type, ...).
  The factory picks SimpleProductBuilder or VariableProductBuilder.
  The view doesn't know or care which builder ran — it just gets a Product back.

DUAL-ROUTE DESIGN (slug vs id):
  ProductDetailView  → /products/{slug}/     — used by the storefront (SEO)
  ProductByIdView    → /products/by-id/{id}/ — used by the seller edit form
  Two clear routes are better than one route that switches behaviour based on
  whether the parameter looks like a number or a string.

SOFT DELETE:
  ProductDeleteView unpublishes the product (is_published=False) rather than
  deleting it from the DB. Orders and reviews that reference it are preserved.
"""
from rest_framework import status, generics
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet
from rest_framework import mixins

from core.permissions import IsSeller, IsAdmin, IsSellerOwnerOrAdmin
from .models import ProductImage
from .serializers import (
    ProductListSerializer, ProductDetailSerializer,
    ProductCreateSerializer, ProductUpdateSerializer,
    CategorySerializer, ProductImageSerializer,
)
from .repositories import ProductRepository, CategoryRepository
from .factories import ProductFactory
from .filters import ProductFilter

product_repo = ProductRepository()
category_repo = CategoryRepository()


def _wishlisted_ids(request):
    """Return set of product IDs the authenticated user has wishlisted. Empty set otherwise."""
    if not (request and request.user and request.user.is_authenticated):
        return set()
    from apps.users.models import WishlistItem
    return set(
        WishlistItem.objects.filter(user=request.user).values_list('product_id', flat=True)
    )


class ProductListView(generics.ListAPIView):
    """GET /api/v1/products/ — public product catalogue with filtering."""
    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'brand']
    ordering_fields = ['base_price', 'average_rating', 'created_at', 'review_count']
    ordering = ['-created_at']

    def get_queryset(self):
        return product_repo.get_all_published()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['wishlisted_ids'] = _wishlisted_ids(self.request)
        return ctx


class ProductDetailView(generics.RetrieveAPIView):
    """GET /api/v1/products/{slug}/ — full product detail."""
    serializer_class = ProductDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    def get_object(self):
        slug = self.kwargs['slug']
        return product_repo.get_by_slug(slug)


class ProductByIdView(generics.RetrieveAPIView):
    """GET /api/v1/products/by-id/{id}/ [Seller/Admin] — for the edit form.

    Why a separate endpoint? Sellers identify products by numeric ID in the
    admin/edit UI; customers use slugs on the storefront. Keeping both routes
    means we don't have to overload one endpoint with mode-switching logic.
    """
    serializer_class = ProductDetailSerializer
    permission_classes = [IsSeller]

    def get_object(self):
        product = product_repo.get_by_id(self.kwargs['pk'])
        # Sellers can only fetch their own products; admins can fetch any.
        if self.request.user.role == 'seller' and product.created_by_id != self.request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only view your own products.')
        return product


class ProductAutocompleteView(APIView):
    """GET /api/v1/products/autocomplete/?q=<query>
    Returns up to 6 lightweight matches for the search-as-you-type dropdown.
    Each result includes name, slug, image, price, and brand.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response([])

        from django.db.models import Q
        qs = (
            Product.objects
            .filter(is_published=True)
            .filter(Q(name__icontains=q) | Q(brand__icontains=q) | Q(tags__icontains=q))
            .prefetch_related('images')
            .only('id', 'name', 'slug', 'base_price', 'brand', 'average_rating')[:6]
        )

        results = []
        for p in qs:
            first_img = p.images.first()
            results.append({
                'id': p.id,
                'name': p.name,
                'slug': p.slug,
                'brand': p.brand,
                'price': float(p.base_price),
                'rating': float(p.average_rating or 0),
                'image': request.build_absolute_uri(first_img.image.url) if first_img else None,
            })
        return Response(results)


class ProductFeaturedView(generics.ListAPIView):
    """GET /api/v1/products/featured/"""
    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return product_repo.get_featured()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['wishlisted_ids'] = _wishlisted_ids(self.request)
        return ctx


class ProductCreateView(APIView):
    """POST /api/v1/products/ [Seller/Admin] — uses Factory + Builder patterns."""
    permission_classes = [IsSeller]

    def post(self, request):
        serializer = ProductCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_type = serializer.validated_data.get('product_type', 'simple')
        try:
            product = ProductFactory.create(
                product_type=product_type,
                data=serializer.validated_data,
                seller=request.user,
            )
        except ValueError as e:
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        product_repo.invalidate_product_cache()
        return Response(
            ProductDetailSerializer(product, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class ProductUpdateView(generics.UpdateAPIView):
    """PATCH /api/v1/products/{id}/ [Seller/Admin]"""
    serializer_class = ProductUpdateSerializer
    permission_classes = [IsSeller, IsSellerOwnerOrAdmin]

    def get_object(self):
        product = product_repo.get_by_id(self.kwargs['pk'])
        self.check_object_permissions(self.request, product)
        return product

    def perform_update(self, serializer):
        super().perform_update(serializer)
        product_repo.invalidate_product_cache()


class ProductDeleteView(APIView):
    """DELETE /api/v1/products/{id}/ [Admin only] — soft delete"""
    permission_classes = [IsAdmin]

    def delete(self, request, pk):
        product_repo.soft_delete(pk)
        product_repo.invalidate_product_cache()
        return Response({'message': 'Product unpublished.'}, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# Seller's own product management
# ─────────────────────────────────────────────────────────────────────────────

class ProductImageUploadView(APIView):
    """POST /api/v1/products/{pk}/images/  — upload an image for a product.
       DELETE /api/v1/products/{pk}/images/{image_id}/ — delete one image.
    """
    permission_classes = [IsSeller]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        product = product_repo.get_by_id(pk)
        if request.user.role == 'seller' and product.created_by_id != request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Not your product.')

        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'message': 'No image file provided'}, status=status.HTTP_400_BAD_REQUEST)

        is_first = not ProductImage.objects.filter(product=product).exists()
        make_primary = request.data.get('is_primary', 'false').lower() == 'true' or is_first

        if make_primary and not is_first:
            ProductImage.objects.filter(product=product).update(is_primary=False)

        img = ProductImage.objects.create(
            product=product,
            image=image_file,
            alt_text=request.data.get('alt_text', '') or product.name,
            is_primary=make_primary,
        )
        return Response(
            ProductImageSerializer(img, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, pk, image_id):
        ProductImage.objects.filter(product_id=pk, id=image_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SellerProductListView(generics.ListAPIView):
    """GET /api/v1/products/mine/ [Seller] — own products only"""
    serializer_class = ProductListSerializer
    permission_classes = [IsSeller]

    def get_queryset(self):
        return product_repo.get_by_seller(self.request.user.id)


# ─────────────────────────────────────────────────────────────────────────────
# Category views
# ─────────────────────────────────────────────────────────────────────────────

class CategoryListView(generics.ListAPIView):
    """GET /api/v1/categories/"""
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return category_repo.get_all_active()


class CategoryProductListView(generics.ListAPIView):
    """GET /api/v1/categories/{slug}/products/"""
    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]
    filterset_class = ProductFilter

    def get_queryset(self):
        category = category_repo.get_by_slug(self.kwargs['slug'])
        return product_repo.search(category_id=category.id)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['wishlisted_ids'] = _wishlisted_ids(self.request)
        return ctx
