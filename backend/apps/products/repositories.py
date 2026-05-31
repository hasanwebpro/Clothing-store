"""
DESIGN PATTERN: Repository

ProductRepository is the ONLY place that queries the products database.
Views and Services never call Product.objects.xxx() directly.

PROBLEM SOLVED: If we rename the 'base_price' column tomorrow, we fix
it in ONE place (here) instead of hunting through every view.

SDA Note: Think of a Repository as a "data librarian". You ask it for
data by name ("get me featured products") and it handles the SQL details.
"""
from django.db.models import Q
from .models import Product, Category, ProductVariant, ProductImage, Attribute, AttributeValue


class ProductRepository:

    def get_all_published(self):
        return (
            Product.objects
            .filter(is_published=True)
            .select_related('category', 'created_by')
            .prefetch_related('images', 'variants')
        )

    def get_featured(self, limit: int = 8):
        return (
            Product.objects
            .filter(is_published=True, is_featured=True)
            .select_related('category')
            .prefetch_related('images')[:limit]
        )

    def get_by_slug(self, slug: str):
        return (
            Product.objects
            .select_related('category', 'created_by')
            .prefetch_related(
                'images',
                'variants__attribute_values__attribute',
                'variants__images',
            )
            .get(slug=slug, is_published=True)
        )

    def get_by_id(self, product_id: int):
        return Product.objects.get(pk=product_id)

    def get_by_seller(self, seller_id: int):
        return (
            Product.objects
            .filter(created_by_id=seller_id)
            .select_related('category')
            .prefetch_related('images')
        )

    def search(self, query: str = None, category_id: int = None,
               min_price=None, max_price=None, brand: str = None,
               is_featured: bool = None):
        qs = Product.objects.filter(is_published=True).select_related('category')

        if query:
            qs = qs.filter(
                Q(name__icontains=query) |
                Q(description__icontains=query) |
                Q(brand__icontains=query) |
                Q(tags__icontains=query)
            )
        if category_id:
            qs = qs.filter(
                Q(category_id=category_id) | Q(category__parent_id=category_id)
            )
        if min_price is not None:
            qs = qs.filter(base_price__gte=min_price)
        if max_price is not None:
            qs = qs.filter(base_price__lte=max_price)
        if brand:
            qs = qs.filter(brand__iexact=brand)
        if is_featured is not None:
            qs = qs.filter(is_featured=is_featured)

        return qs.prefetch_related('images')

    def create(self, data: dict) -> Product:
        return Product.objects.create(**data)

    def update(self, product_id: int, data: dict) -> Product:
        Product.objects.filter(pk=product_id).update(**data)
        return self.get_by_id(product_id)

    def soft_delete(self, product_id: int) -> None:
        Product.objects.filter(pk=product_id).update(is_published=False)

    def update_rating(self, product_id: int, avg_rating: float, count: int) -> None:
        Product.objects.filter(pk=product_id).update(
            average_rating=avg_rating,
            review_count=count,
        )


class CategoryRepository:

    def get_all_active(self):
        return Category.objects.filter(is_active=True, parent__isnull=True).prefetch_related('children')

    def get_by_slug(self, slug: str):
        return Category.objects.get(slug=slug, is_active=True)

    def get_all(self):
        return Category.objects.filter(is_active=True).order_by('sort_order', 'name')


class VariantRepository:

    def get_by_id(self, variant_id: int):
        return ProductVariant.objects.select_related('product').get(pk=variant_id, is_active=True)

    def get_by_sku(self, sku: str):
        return ProductVariant.objects.select_related('product').get(sku=sku, is_active=True)

    def get_product_variants(self, product_id: int):
        return (
            ProductVariant.objects
            .filter(product_id=product_id, is_active=True)
            .prefetch_related('attribute_values__attribute')
        )
