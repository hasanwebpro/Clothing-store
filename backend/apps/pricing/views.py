"""
MVC ROLE: CONTROLLER — HTTP boundary for coupon management and validation.
DESIGN PATTERNS APPLIED:
  • RBAC         — CouponListCreateView / CouponDetailView restricted to [IsAdmin]
  • Decorator    — ValidateCouponView uses CartPriceCalculator (Decorator pattern)
                   to compute the discounted total without knowing discount math
  • Rich Domain  — delegates coupon.is_valid() and coupon.calculate_discount()
                   to the Coupon model (not reimplementing the logic here)

TWO AUDIENCES, TWO ENDPOINTS:
------------------------------
Admin endpoints (IsAdmin):
  GET/POST /pricing/coupons/        → create and list all coupons
  GET/PATCH/DELETE /pricing/coupons/{id}/ → manage a specific coupon

Customer endpoint (public):
  POST /pricing/coupons/validate/   → check if a coupon code is valid for
                                      a given order total, return discount amount

The validation endpoint is PUBLIC (no authentication needed) because the
customer needs to see the discount before they are asked to log in.
A brute-force attack is mitigated by the fact that invalid codes return
a non-200 response, and rate limiting can be added at the MIDDLEWARE level.

COUPON → DECORATOR INTEGRATION:
  ValidateCouponView instantiates CartPriceCalculator and calls
  calculate_cart(items=[], coupon_code=code). For the validate endpoint
  we only need the discount amount, so we pass a synthetic single item
  equal to the order_total. The Decorator handles the rest.
"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from core.permissions import IsAdmin
from .models import Coupon
from .serializers import CouponSerializer, CouponApplySerializer
from .decorators import CartPriceCalculator


class CouponListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/pricing/coupons/ [Admin]"""
    serializer_class = CouponSerializer
    permission_classes = [IsAdmin]
    queryset = Coupon.objects.all().order_by('-created_at')


class CouponDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/pricing/coupons/{id}/ [Admin]"""
    serializer_class = CouponSerializer
    permission_classes = [IsAdmin]
    queryset = Coupon.objects.all()


class ValidateCouponView(APIView):
    """POST /api/v1/pricing/coupons/validate/ — public (customers use this at cart)"""

    def post(self, request):
        serializer = CouponApplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data['code']
        order_total = float(serializer.validated_data['order_total'])

        try:
            coupon = Coupon.objects.get(code=code.upper(), is_active=True)
        except Coupon.DoesNotExist:
            return Response({'valid': False, 'message': 'Coupon not found.'}, status=status.HTTP_200_OK)

        valid, reason = coupon.is_valid(order_total)
        if not valid:
            return Response({'valid': False, 'message': reason})

        discount = coupon.calculate_discount(order_total)
        return Response({
            'valid': True,
            'code': coupon.code,
            'type': coupon.type,
            'discount_amount': discount,
            'new_total': round(order_total - discount, 2),
        })
