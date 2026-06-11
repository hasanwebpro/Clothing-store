"""
Pattern   : Repository  (Data Access — Fowler, PEAA)
------------------------------------------------------
What it does : ProductRepository is the only place that queries the products
               database. Views and Services call methods like get_featured() or
               search() — they never write Product.objects.filter() themselves.

Why we used it: Without Repository, every view has its own ORM query. A column
               rename, a query optimisation, or adding a cache must be applied
               in every view that touches that table — scattered and risky.

Why preferred : All product queries live in one file. Changing a query (adding
               select_related for performance, switching to raw SQL, adding Redis
               cache) touches exactly one place. Views stay thin and readable.
               Think of it as a "data librarian" — you ask by name, it handles
               the SQL details.
"""
from django.core.cache import cache
from django.db.models import Q
from .models import Product, Category, ProductVariant, ProductImage, Attribute, AttributeValue

_FEATURED_KEY  = 'products:featured'
_PUBLISHED_KEY = 'products:published'
_CACHE_TTL     = 600  # 10 minutes


class ProductRepository:

    def get_all_published(self):
        # Returns a queryset (not a list) so DRF's SearchFilter and FilterSet
        # can apply further filtering/ordering on top of it.
        return (
            Product.objects
            .filter(is_published=True)
            .select_related('category', 'created_by')
            .prefetch_related('images', 'variants')
        )

    def get_featured(self, limit: int = 8):
        key = f'{_FEATURED_KEY}:{limit}'
        qs = cache.get(key)
        if qs is None:
            qs = list(
                Product.objects
                .filter(is_published=True, is_featured=True)
                .select_related('category')
                .prefetch_related('images')[:limit]
            )
            cache.set(key, qs, _CACHE_TTL)
        return qs

    def invalidate_product_cache(self):
        cache.delete(_FEATURED_KEY + ':8')

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
