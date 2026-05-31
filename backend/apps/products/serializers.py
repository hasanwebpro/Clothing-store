"""
Product serializers — validate input and shape JSON output.

MVC Role: SERIALIZER (part of the View/Controller layer).
Serializers are the data CONTRACT between the API and the database — they:
  1. VALIDATE incoming JSON (POST/PATCH) against model rules
  2. CONVERT model instances into JSON for outgoing responses
  3. HIDE internal fields (passwords, raw DB columns) from API consumers

SDA NOTE: Keeping serializers thin and separate from views is the
"Single Responsibility Principle" — each class has ONE job. If we change
the JSON shape, ONLY this file changes.
"""
from rest_framework import serializers
from .models import Product, Category, ProductVariant, ProductImage, Attribute, AttributeValue


# ─────────────────────────────────────────────────────────────────────────────
# Helper / nested serializers
# ─────────────────────────────────────────────────────────────────────────────

class AttributeValueSerializer(serializers.ModelSerializer):
    """Serialize one attribute value (e.g. Size: 'L', Color: 'Red')."""
    attribute_name = serializers.CharField(source='attribute.name', read_only=True)

    class Meta:
        model = AttributeValue
        fields = ['id', 'attribute_name', 'value']


class ProductImageSerializer(serializers.ModelSerializer):
    """Serialize a product image — exposes a fully-qualified URL."""
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'image_url', 'alt_text', 'sort_order', 'is_primary', 'variant']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else None


class ProductVariantSerializer(serializers.ModelSerializer):
    """Serialize a single purchasable SKU with stock + computed price."""
    attribute_values = AttributeValueSerializer(many=True, read_only=True)
    stock = serializers.SerializerMethodField()
    # NOTE: 'price' is a @property on the Model — we use a method field to
    # expose it as JSON (DRF would error if we used source='price' since the
    # source equals the field name).
    price = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = ['id', 'sku', 'price', 'price_override', 'weight_grams',
                  'attribute_values', 'stock', 'is_active']

    def get_price(self, obj):
        # Reads the @property defined on the Model
        return str(obj.price)

    def get_stock(self, obj):
        # If a variant has no inventory record, treat it as out of stock.
        try:
            inv = obj.inventory
            return max(0, inv.quantity_on_hand - inv.quantity_reserved)
        except Exception:
            return 0


class CategorySerializer(serializers.ModelSerializer):
    """Recursive serializer: a category may have nested sub-categories."""
    children = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'image', 'children']

    def get_children(self, obj):
        active = obj.children.filter(is_active=True)
        return CategorySerializer(active, many=True, context=self.context).data

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else None


class _SellerSummarySerializer(serializers.Serializer):
    """Lightweight read-only seller summary (used inside product responses).

    PATTERN: composition over inheritance — we expose only the seller fields
    needed by the UI without leaking sensitive fields (password hash, etc.).
    """
    id = serializers.IntegerField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()


# ─────────────────────────────────────────────────────────────────────────────
# Product list / detail serializers
# ─────────────────────────────────────────────────────────────────────────────

class ProductListSerializer(serializers.ModelSerializer):
    """Compact serializer for /products/ list endpoints.

    Exposes everything the storefront grid AND admin table need:
      - storefront fields (name, price, image, rating)
      - admin fields (is_published, created_by, category object)
    """
    category = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    created_by = _SellerSummarySerializer(read_only=True)
    primary_image = serializers.SerializerMethodField()
    # 'effective_price' is a @property on the model — use a method field.
    effective_price = serializers.SerializerMethodField()
    discount_percentage = serializers.IntegerField(read_only=True)

    variants = serializers.SerializerMethodField()
    is_wishlisted = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'category_name', 'created_by',
            'brand', 'base_price', 'sale_price', 'effective_price', 'discount_percentage',
            'average_rating', 'review_count', 'is_featured', 'is_published',
            'primary_image', 'product_type', 'created_at', 'variants', 'is_wishlisted',
        ]

    def get_variants(self, obj):
        # Lightweight variant list for the storefront card — just enough for
        # Quick Add (needs variant ID + stock) without the full attribute payload.
        return [
            {
                'id': v.id,
                'sku': v.sku,
                'is_active': v.is_active,
                'stock': max(0, v.inventory.quantity_on_hand - v.inventory.quantity_reserved)
                         if hasattr(v, 'inventory') else 0,
            }
            for v in obj.variants.filter(is_active=True)
        ]

    def get_is_wishlisted(self, obj):
        ids = self.context.get('wishlisted_ids')
        if ids is None:
            return False
        return obj.id in ids

    def get_effective_price(self, obj):
        return str(obj.effective_price)

    def get_category(self, obj):
        if not obj.category_id:
            return None
        return {
            'id': obj.category_id,
            'name': obj.category.name if obj.category else None,
            'slug': obj.category.slug if obj.category else None,
        }

    def get_primary_image(self, obj):
        request = self.context.get('request')
        images = list(obj.images.all())  # uses prefetch_related cache when present
        primary = next((img for img in images if img.is_primary), None) or (images[0] if images else None)
        if not primary or not primary.image:
            return None
        if request:
            return request.build_absolute_uri(primary.image.url)
        return primary.image.url


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full serializer for the product-detail page (heavier — uses prefetches)."""
    category = CategorySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    effective_price = serializers.SerializerMethodField()
    discount_percentage = serializers.IntegerField(read_only=True)
    created_by = _SellerSummarySerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'category', 'created_by',
            'base_price', 'sale_price', 'effective_price', 'discount_percentage',
            'product_type', 'brand', 'tags',
            'average_rating', 'review_count',
            'is_published', 'is_featured',
            'images', 'variants',
            'created_at', 'updated_at',
        ]

    def get_effective_price(self, obj):
        return str(obj.effective_price)


# ─────────────────────────────────────────────────────────────────────────────
# Write serializers (used by sellers/admins to create or modify products)
# ─────────────────────────────────────────────────────────────────────────────

class ProductCreateSerializer(serializers.ModelSerializer):
    """Validate payload for product creation.

    DRF maps `category` automatically to the FK PK during validation, so the
    builder receives `validated_data['category']` as a Category instance.
    """
    variants = serializers.ListField(child=serializers.DictField(), required=False, write_only=True)

    class Meta:
        model = Product
        fields = [
            'name', 'category', 'description', 'base_price', 'sale_price',
            'product_type', 'brand', 'tags', 'is_published', 'is_featured', 'variants',
        ]


class ProductUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'name', 'category', 'description', 'base_price', 'sale_price',
            'brand', 'tags', 'is_published', 'is_featured',
        ]
        extra_kwargs = {f: {'required': False} for f in fields}
