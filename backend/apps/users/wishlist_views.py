from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from apps.products.models import Product
from apps.products.serializers import ProductListSerializer
from .models import WishlistItem


class WishlistView(APIView):
    """
    GET  /api/v1/wishlist/           — list the authenticated user's wishlisted products
    POST /api/v1/wishlist/           — add a product  (body: {product_id: N})
    DELETE /api/v1/wishlist/{product_id}/ — remove a product
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = (
            WishlistItem.objects
            .filter(user=request.user)
            .select_related('product__category')
            .prefetch_related('product__images', 'product__variants')
        )
        products = [item.product for item in items]
        data = ProductListSerializer(
            products, many=True, context={'request': request}
        ).data
        return Response(data)

    def post(self, request):
        product_id = request.data.get('product_id')
        if not product_id:
            return Response({'message': 'product_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = Product.objects.get(pk=product_id, is_published=True)
        except Product.DoesNotExist:
            return Response({'message': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        _, created = WishlistItem.objects.get_or_create(user=request.user, product=product)
        return Response(
            {'message': 'Added to wishlist.' if created else 'Already in wishlist.'},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request, product_id):
        WishlistItem.objects.filter(user=request.user, product_id=product_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
