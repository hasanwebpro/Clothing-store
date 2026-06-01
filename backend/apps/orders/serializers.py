"""
MVC ROLE: SERIALIZER — shapes Order data for both list and detail API responses.
DESIGN PATTERN: Two-speed serialization (compact list vs full detail)

WHY TWO ORDER SERIALIZERS?
---------------------------
OrderListSerializer — used by GET /orders/ (many=True)
  Returns only the fields needed for an order list table:
  id, order_number, status, payment_method, payment_status, total_amount, item_count, created_at
  Fetching full item + status_history data for 50 orders in a list would
  create N+1 queries and return megabytes of JSON nobody reads in a list view.

OrderSerializer — used by GET /orders/{order_number}/ (single object)
  Returns everything: items, status_history, shipping_address (nested).
  The detail page renders the full timeline and line-item breakdown.

SERIALIZER COMPOSITION (nested serializers):
  OrderSerializer embeds:
    OrderItemSerializer     → line items with snapshot product_name + sku
    OrderStatusHistorySerializer → full audit trail for the tracking timeline
    AddressSerializer       → the shipping address fields the UI shows

WHY SNAPSHOT FIELDS MATTER IN THE SERIALIZER:
  OrderItemSerializer exposes product_name and sku from OrderItem columns
  (not from variant.product.name). This is correct — we want the name
  that was current at order time, not today's name.

INPUT SERIALIZERS (write-only validators):
  PlaceOrderSerializer validates: shipping_address_id, payment_method, notes.
  UpdateOrderStatusSerializer validates the status transition (choices list).
  These never serialize model instances — they just validate POST/PATCH bodies.
"""
from rest_framework import serializers
from apps.users.serializers import AddressSerializer
from .models import Order, OrderItem, OrderStatusHistory


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'variant', 'product_name', 'sku', 'quantity', 'unit_price', 'total_price']


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.get_full_name', read_only=True)

    class Meta:
        model = OrderStatusHistory
        fields = ['old_status', 'new_status', 'note', 'changed_by_name', 'changed_at']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    shipping_address = AddressSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'payment_method', 'payment_status',
            'subtotal', 'shipping_cost', 'discount_amount', 'total_amount',
            'coupon_code', 'shipping_address', 'notes',
            'estimated_delivery', 'rider_name', 'tracking_note',
            'items', 'status_history', 'created_at', 'updated_at',
        ]


class OrderListSerializer(serializers.ModelSerializer):
    """Compact serializer for order list views."""
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'payment_method', 'payment_status',
            'total_amount', 'item_count', 'created_at',
        ]

    def get_item_count(self, obj):
        return obj.items.count()


class PlaceOrderSerializer(serializers.Serializer):
    shipping_address_id = serializers.IntegerField()
    payment_method = serializers.ChoiceField(choices=['cod', 'easypaisa', 'card'])
    notes = serializers.CharField(required=False, default='', allow_blank=True)


class UpdateOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[
        'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
    ])
    note = serializers.CharField(required=False, default='', allow_blank=True)
    rider_name = serializers.CharField(required=False, default='', allow_blank=True)
    tracking_note = serializers.CharField(required=False, default='', allow_blank=True)
