"""
MVC ROLE: CONTROLLER — thin HTTP boundary for cart operations.
DESIGN PATTERNS APPLIED:
  • Service Layer  — all cart business logic lives in CartService;
                     views simply delegate and return the result
  • RBAC           — all cart endpoints require IsAuthenticated
                     (guests cannot have server-side carts in this version)

CONTROLLER THINNESS DEMONSTRATED:
  CartView.get():
    1. Calls cart_service.get_or_create_cart()       ← repository concern
    2. Calls cart_service.get_cart_totals()          ← pricing concern
    3. Calls CartSerializer(cart).data               ← serializer concern
    4. Returns Response(data)                        ← HTTP concern
  The view itself contains zero business logic.

ERROR HANDLING CONTRACT:
  CartService raises typed exceptions (InsufficientStockError, InvalidCouponError).
  The controller catches them and maps to HTTP 400 with the exception message.
  All other unhandled exceptions are caught by custom_exception_handler (core/exceptions.py)
  and returned as 500 with a generic message.

COUPON FLOW:
  ApplyCouponView delegates to cart_service.apply_coupon() which uses the
  Decorator pattern (CartPriceCalculator in pricing/decorators.py) to compute
  the discounted totals. The view just returns the totals dict from the service.
"""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from core.exceptions import InsufficientStockError, InvalidCouponError
from .models import CartItem
from .serializers import (
    CartSerializer, AddToCartSerializer, UpdateCartItemSerializer, ApplyCouponSerializer
)
from .services import CartService

cart_service = CartService()


class CartView(APIView):
    """GET /api/v1/cart/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart = cart_service.get_or_create_cart(request.user)
        totals = cart_service.get_cart_totals(request.user)
        data = CartSerializer(cart, context={'request': request}).data
        data['totals'] = totals
        return Response(data)


class AddToCartView(APIView):
    """POST /api/v1/cart/add/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = cart_service.add_item(
                user=request.user,
                variant_id=serializer.validated_data['variant_id'],
                quantity=serializer.validated_data['quantity'],
            )
        except InsufficientStockError as e:
            return Response({'message': e.message}, status=status.HTTP_400_BAD_REQUEST)

        cart = cart_service.get_or_create_cart(request.user)
        return Response(CartSerializer(cart, context={'request': request}).data)


class CartItemView(APIView):
    """PATCH/DELETE /api/v1/cart/items/{id}/"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, item_id):
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            cart_service.update_item_quantity(
                user=request.user,
                item_id=item_id,
                quantity=serializer.validated_data['quantity'],
            )
        except InsufficientStockError as e:
            return Response({'message': e.message}, status=status.HTTP_400_BAD_REQUEST)

        cart = cart_service.get_or_create_cart(request.user)
        return Response(CartSerializer(cart, context={'request': request}).data)

    def delete(self, request, item_id):
        cart_service.remove_item(request.user, item_id)
        cart = cart_service.get_or_create_cart(request.user)
        return Response(CartSerializer(cart, context={'request': request}).data)


class SaveForLaterView(APIView):
    """POST /api/v1/cart/items/{id}/save/ — move an active line to 'saved for later'"""
    permission_classes = [IsAuthenticated]

    def post(self, request, item_id):
        try:
            cart_service.save_for_later(request.user, item_id)
        except CartItem.DoesNotExist:
            return Response({'message': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)
        cart = cart_service.get_or_create_cart(request.user)
        return Response(CartSerializer(cart, context={'request': request}).data)


class MoveToCartView(APIView):
    """POST /api/v1/cart/items/{id}/move-to-cart/ — move a saved item back to the cart"""
    permission_classes = [IsAuthenticated]

    def post(self, request, item_id):
        try:
            cart_service.move_to_cart(request.user, item_id)
        except CartItem.DoesNotExist:
            return Response({'message': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)
        except InsufficientStockError as e:
            return Response({'message': e.message}, status=status.HTTP_400_BAD_REQUEST)
        cart = cart_service.get_or_create_cart(request.user)
        return Response(CartSerializer(cart, context={'request': request}).data)


class ApplyCouponView(APIView):
    """POST /api/v1/cart/coupon/apply/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ApplyCouponSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            totals = cart_service.apply_coupon(request.user, serializer.validated_data['code'])
            return Response({'message': 'Coupon applied.', 'totals': totals})
        except InvalidCouponError as e:
            return Response({'message': e.message}, status=status.HTTP_400_BAD_REQUEST)


class RemoveCouponView(APIView):
    """DELETE /api/v1/cart/coupon/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        cart_service.remove_coupon(request.user)
        return Response({'message': 'Coupon removed.'})
