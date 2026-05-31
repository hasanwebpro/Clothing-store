"""
MVC ROLE: Controller support layer — translates URL query parameters into
          Django ORM filters before the queryset reaches the Serializer.
DESIGN PATTERN: Specification (via django-filter's FilterSet)

WHAT IS THE SPECIFICATION PATTERN?
------------------------------------
The Specification pattern represents a business rule as an object that can
be combined with other rules. Here, each filter field is a "specification":
  min_price spec: base_price >= N
  category spec:  category__slug == 'women-tops'
  has_sale spec:  sale_price IS NOT NULL

django-filter's FilterSet combines all active specs into a single QuerySet
filter chain. The view doesn't write any filtering logic — it just declares
filterset_class = ProductFilter.

USAGE:
  GET /api/v1/products/?min_price=500&max_price=2000&category=women-tops
  GET /api/v1/products/?brand=Limelight&is_featured=true
  GET /api/v1/products/?has_sale=true

HOW IT FITS IN MVC:
  Controller (ProductListView) → declares filterset_class
  FilterSet (this file)       → translates ?param=value into ORM filter
  Repository                  → returns the base queryset to filter
  Serializer                  → shapes the filtered rows into JSON

BENEFIT:
  Adding a new filter (e.g. by tag) = add one field here.
  Zero changes to the view, repository, or serializer.
"""
import django_filters
from .models import Product


class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name='base_price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='base_price', lookup_expr='lte')
    category = django_filters.CharFilter(field_name='category__slug', lookup_expr='exact')
    brand = django_filters.CharFilter(field_name='brand', lookup_expr='iexact')
    is_featured = django_filters.BooleanFilter(field_name='is_featured')
    has_sale = django_filters.BooleanFilter(method='filter_has_sale')

    class Meta:
        model = Product
        fields = ['min_price', 'max_price', 'category', 'brand', 'is_featured']

    def filter_has_sale(self, queryset, name, value):
        if value:
            return queryset.filter(sale_price__isnull=False)
        return queryset.filter(sale_price__isnull=True)
