"""
MVC ROLE: CONTROLLER — HTTP boundary for all order operations.
DESIGN PATTERNS APPLIED:
  • Service Layer — all order business logic (placement, status transitions,
                    stock validation, event publishing) lives in OrderService
  • RBAC          — role-scoped data access: customers see own orders,
                    sellers/admins see all orders

CONTROLLER RESPONSIBILITY SPLIT:
---------------------------------
OrderListView    → scopes queryset by role (admin/seller sees all, customer sees own)
PlaceOrderView   → delegates entirely to order_service.place_order()
OrderDetailView  → scopes by role for security (customers can't see other orders)
UpdateOrderStatusView → delegates to order_service.update_status()
CancelOrderView  → validates "pending" state, then delegates to order_service

DOMAIN LOGIC LOCATION:
  ALL business rules (stock check, coupon deduction, event publishing,
  cart clearing, order number generation) live in OrderService (services.py).
  These views are deliberately thin — they validate HTTP input and
  translate service exceptions into HTTP responses.

EXCEPTION MAPPING:
  InsufficientStockError → 400 (caller's fault — invalid cart state)
  ValueError             → 400 (empty cart, missing address, etc.)
  Order.DoesNotExist     → 404

SECURITY:
  OrderDetailView checks both order_number AND user ownership for customers.
  Admins/sellers can look up any order by number for support purposes.
  CancelOrderView additionally validates order.status == 'pending' before
  cancelling — customers cannot cancel shipped orders.
"""
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from core.permissions import IsAdmin, IsSeller, IsOwnerOrAdmin
from core.exceptions import InsufficientStockError
from .models import Order, OrderReturn
from .serializers import (
    OrderSerializer, OrderListSerializer,
    PlaceOrderSerializer, UpdateOrderStatusSerializer,
    OrderReturnSerializer, CreateReturnSerializer, ResolveReturnSerializer,
)
from .services import OrderService

order_service = OrderService()


class OrderListView(APIView):
    """GET /api/v1/orders/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role in ('admin', 'seller'):
            orders = Order.objects.all().order_by('-created_at')
        else:
            orders = Order.objects.filter(user=request.user).order_by('-created_at')

        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)


class PlaceOrderView(APIView):
    """POST /api/v1/orders/ — customer places order from cart"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PlaceOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            order = order_service.place_order(
                user=request.user,
                shipping_address_id=serializer.validated_data['shipping_address_id'],
                payment_method=serializer.validated_data['payment_method'],
                notes=serializer.validated_data.get('notes', ''),
            )
        except InsufficientStockError as e:
            return Response({'message': e.message}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


class OrderDetailView(APIView):
    """GET /api/v1/orders/{order_number}/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, order_number):
        try:
            if request.user.role in ('admin', 'seller'):
                order = Order.objects.get(order_number=order_number)
            else:
                order = Order.objects.get(order_number=order_number, user=request.user)
        except Order.DoesNotExist:
            return Response({'message': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(OrderSerializer(order).data)


class UpdateOrderStatusView(APIView):
    """PATCH /api/v1/orders/{id}/status/ [Admin/Seller]"""
    permission_classes = [IsSeller]

    def patch(self, request, pk):
        serializer = UpdateOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = order_service.update_status(
            order_id=pk,
            new_status=serializer.validated_data['status'],
            changed_by=request.user,
            note=serializer.validated_data.get('note', ''),
            rider_name=serializer.validated_data.get('rider_name', ''),
            tracking_note=serializer.validated_data.get('tracking_note', ''),
        )
        return Response(OrderSerializer(order).data)


class CancelOrderView(APIView):
    """POST /api/v1/orders/{id}/cancel/ — customer cancels own order before it ships"""
    permission_classes = [IsAuthenticated]

    # A customer may cancel any time before the order leaves the warehouse.
    CANCELLABLE_STATUSES = ('pending', 'confirmed', 'processing')

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({'message': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status not in self.CANCELLABLE_STATUSES:
            return Response(
                {'message': f'This order has already been {order.status} and can no longer be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = (request.data.get('reason') or '').strip()
        note = f'Cancelled by customer. Reason: {reason}' if reason else 'Cancelled by customer.'
        order = order_service.update_status(
            order_id=pk, new_status='cancelled',
            changed_by=request.user, note=note,
        )
        return Response(OrderSerializer(order).data)


class ReturnListCreateView(APIView):
    """
    MVC ROLE: CONTROLLER — return-request collection endpoint.
    PATTERNS: Service Layer (delegates to OrderService.create_return) + RBAC
              (the GET queryset is role-scoped: staff see all, customers see own).

    GET  /api/v1/orders/returns/        → list return requests (own, or all for staff)
    POST /api/v1/orders/{pk}/returns/   → customer requests a return/refund/exchange
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role in ('admin', 'seller'):
            returns = OrderReturn.objects.select_related('order').all()
        else:
            returns = OrderReturn.objects.select_related('order').filter(order__user=request.user)
        return Response(OrderReturnSerializer(returns, many=True).data)

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({'message': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CreateReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            ret = order_service.create_return(
                order=order,
                kind=serializer.validated_data['kind'],
                reason=serializer.validated_data['reason'],
                customer_note=serializer.validated_data.get('customer_note', ''),
            )
        except ValueError as e:
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(OrderReturnSerializer(ret).data, status=status.HTTP_201_CREATED)


class ResolveReturnView(APIView):
    """
    MVC ROLE: CONTROLLER — staff resolution endpoint for a return request.
    PATTERNS: Service Layer (OrderService.resolve_return owns the state
              transition + the 'completed refund → order refunded' side effect)
              and RBAC (IsSeller gates this to seller/admin only).

    PATCH /api/v1/orders/returns/{pk}/  → approve / reject / complete
    """
    permission_classes = [IsSeller]

    def patch(self, request, pk):
        try:
            OrderReturn.objects.get(pk=pk)
        except OrderReturn.DoesNotExist:
            return Response({'message': 'Return request not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ResolveReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ret = order_service.resolve_return(
            return_id=pk,
            new_status=serializer.validated_data['status'],
            admin_note=serializer.validated_data.get('admin_note', ''),
        )
        return Response(OrderReturnSerializer(ret).data)
