"""
MVC ROLE: SERIALIZER — shapes Cart and CartItem data for the API response.
DESIGN PATTERN: Data Transfer Object (DTO)

SERIALIZER RESPONSIBILITIES HERE:
-----------------------------------
CartItemSerializer:
  • Exposes product_name and sku by traversing variant → product (source paths)
  • Builds the full image URL via the request context (absolute URI)
  • Exposes max_quantity (available stock) so the frontend can cap the qty input
  • variant_attrs flattens the M2M attribute values into a readable list

CartSerializer:
  • Nests CartItemSerializer for each line item
  • Exposes item_count and subtotal (@properties from the Model layer)

WHY SEPARATE READ AND WRITE SERIALIZERS?
  CartSerializer is read-only (GET /cart/ response).
  AddToCartSerializer and UpdateCartItemSerializer are write-only input validators.
  This separation prevents a consumer from PATCHING the unit_price field
  by accident — write serializers expose ONLY the fields callers may provide.

SECURITY NOTE:
  unit_price is read_only in CartItemSerializer. Even if a user sends
  {"unit_price": 1} in a PATCH request, it is ignored — the price snapshot
  from add-to-cart is preserved.
"""
from rest_framework import serializers
from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='variant.product.name', read_only=True)
    sku = serializers.CharField(source='variant.sku', read_only=True)
    variant_attrs = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    total_price = serializers.FloatField(read_only=True)
    max_quantity = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            'id', 'variant', 'sku', 'product_name', 'variant_attrs',
            'quantity', 'unit_price', 'total_price', 'primary_image', 'max_quantity',
        ]
        read_only_fields = ['id', 'unit_price', 'added_at']

    def get_variant_attrs(self, obj):
        return [
            {'attribute': av.attribute.name, 'value': av.value}
            for av in obj.variant.attribute_values.all()
        ]

    def get_primary_image(self, obj):
        request = self.context.get('request')
        img = obj.variant.product.images.filter(is_primary=True).first()
        if not img:
            img = obj.variant.product.images.first()
        if img and request:
            return request.build_absolute_uri(img.image.url)
        return None

    def get_max_quantity(self, obj):
        try:
            return obj.variant.inventory.available
        except Exception:
            return 0


class CartSerializer(serializers.ModelSerializer):
    # The single CartItem set is presented to the client as two lists —
    # `items` (active) and `saved_items` (save-for-later) — mirroring the
    # soft partition described in models.py. We iterate the already-prefetched
    # `obj.items.all()` in Python (rather than two queries) to avoid an extra
    # round-trip on a relation that is small per-user.
    items = serializers.SerializerMethodField()
    saved_items = serializers.SerializerMethodField()
    item_count = serializers.IntegerField(read_only=True)
    subtotal = serializers.FloatField(read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'items', 'saved_items', 'item_count', 'subtotal', 'coupon_code']

    def get_items(self, obj):
        active = [i for i in obj.items.all() if not i.saved_for_later]
        return CartItemSerializer(active, many=True, context=self.context).data

    def get_saved_items(self, obj):
        saved = [i for i in obj.items.all() if i.saved_for_later]
        return CartItemSerializer(saved, many=True, context=self.context).data


class AddToCartSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=0)


class ApplyCouponSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)
