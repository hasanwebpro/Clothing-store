"""
MVC ROLE: MODEL — represents discount coupons and their validation rules.
DESIGN PATTERN: Domain Model with embedded business rules (Rich Domain Object)

WHY BUSINESS LOGIC BELONGS ON THE COUPON MODEL:
-------------------------------------------------
is_valid() and calculate_discount() are methods on the Coupon model, not in
a separate service or view. This is the Rich Domain Model approach:
the object that holds the data also knows the rules for that data.

ALTERNATIVE (Anaemic Domain Model) — puts all logic in services:
  CouponService.is_valid(coupon, order_total) — coupon is a dumb data bag
  Problem: if CouponService is imported in 5 places, we have 5 places to
  update if the coupon validation logic changes.

OUR APPROACH — keeps validation on the model:
  coupon.is_valid(order_total) — the coupon validates itself
  coupon.calculate_discount(order_total) — the coupon computes its own discount
  Result: wherever a Coupon instance exists, its validation rules travel with it.

HOW IT INTEGRATES WITH THE DECORATOR PATTERN:
  pricing/decorators.py wraps CartPriceCalculator in a CouponDecorator.
  CouponDecorator calls coupon.is_valid() and coupon.calculate_discount()
  from this model. The decorator handles the "when to apply the discount";
  the model handles the "how much discount and whether it's valid".

COUPON TYPES:
  'percentage' → value% off the order total (e.g. 10% off)
  'fixed'      → flat PKR amount off (e.g. PKR 200 off, min order PKR 500)

EXPIRY / USAGE LIMITS:
  valid_from / valid_until → time-gated coupons (Eid sale, etc.)
  max_uses + used_count   → single-use or limited-use coupons
  min_order_value         → prevents applying a PKR 500 coupon to a PKR 100 order
"""
from django.db import models
from django.utils import timezone


class Coupon(models.Model):
    TYPE_CHOICES = [
        ('percentage', 'Percentage Discount'),
        ('fixed', 'Fixed Amount Discount'),
    ]

    code = models.CharField(max_length=50, unique=True, db_index=True)
    type = models.CharField(max_length=15, choices=TYPE_CHOICES)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    min_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'coupons'

    def __str__(self):
        return f"{self.code} ({self.type}: {self.value})"

    def is_valid(self, order_total: float) -> tuple[bool, str]:
        """Returns (is_valid, reason_if_invalid)."""
        now = timezone.now()
        if not self.is_active:
            return False, 'Coupon is inactive.'
        if now < self.valid_from:
            return False, 'Coupon is not yet active.'
        if now > self.valid_until:
            return False, 'Coupon has expired.'
        if self.max_uses and self.used_count >= self.max_uses:
            return False, 'Coupon usage limit reached.'
        if order_total < float(self.min_order_value):
            return False, f'Minimum order value for this coupon is PKR {self.min_order_value}.'
        return True, ''

    def calculate_discount(self, order_total: float) -> float:
        """Returns the discount amount to subtract from the order total."""
        if self.type == 'percentage':
            return round(order_total * float(self.value) / 100, 2)
        return min(float(self.value), order_total)
