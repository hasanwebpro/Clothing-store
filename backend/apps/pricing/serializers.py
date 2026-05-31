"""
MVC ROLE: SERIALIZER — validates coupon input and shapes coupon JSON output.
DESIGN PATTERN: Input Validation Gate (write serializer) + DTO (read serializer)

CouponSerializer (read + write for admin):
  Exposes all coupon fields for the admin management UI.
  used_count is read_only — admins set max_uses, the system increments
  used_count automatically when an order applies the coupon.

CouponApplySerializer (write-only input for customer):
  Validates { code, order_total } from the validate endpoint request body.
  Does NOT expose any Coupon fields — it's a pure input validator.
  This separation means the validate endpoint can never accidentally
  return internal coupon data the customer shouldn't see.
"""
from rest_framework import serializers
from .models import Coupon


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ['id', 'code', 'type', 'value', 'min_order_value',
                  'max_uses', 'used_count', 'valid_from', 'valid_until', 'is_active']
        read_only_fields = ['id', 'used_count']


class CouponApplySerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)
    order_total = serializers.DecimalField(max_digits=10, decimal_places=2)
