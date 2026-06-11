"""
MVC ROLE: CONTROLLER — HTTP boundary for payment initiation and callbacks.
DESIGN PATTERNS APPLIED:
  • Strategy   — PaymentStrategyFactory.get_strategy(payment_method) returns
                 CODStrategy / EasypaisaAdapterStrategy / CardStrategy;
                 the view calls strategy.process() without knowing the gateway
  • Adapter    — each Strategy wraps a gateway Adapter (adapters.py) that
                 translates the gateway's API into our internal dict shape
  • Observer   — on successful payment the Controller publishes
                 Events.PAYMENT_CONFIRMED via EventBus; downstream observers
                 (notifications, analytics) react without coupling to this view

THE PAYMENT FLOW:
-----------------
  1. Customer POSTs to /payments/initiate/ with {order_number, card_data?}
  2. InitiatePaymentView retrieves the Order and delegates to the Strategy:
       COD        → immediate success, no redirect
       Easypaisa  → returns merchant phone + instructions, sets status pending
       Card       → sandbox charge, immediate success
  3. A PaymentTransaction row is written with the gateway result
  4. If immediate success → Order.payment_status = 'paid', EventBus fires
  5. If redirect (future JazzCash) → gateway calls /payments/callback/?gateway=...

SECURITY:
  PaymentCallbackView is AllowAny — payment gateways call it without auth.
  We verify the callback's legitimacy using the gateway adapter's
  verify_payment() method (HMAC signature check in production).

  InitiatePaymentView guards against double-payment:
    if order.payment_status == 'paid': return 400

IDEMPOTENCY:
  Each initiation creates a new PaymentTransaction. The Order FK on
  PaymentTransaction allows multiple attempts. Only the final 'success'
  one matters for the order's payment_status.
"""
import logging
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.conf import settings
from apps.orders.models import Order
from core.events import EventBus, Events
from .models import PaymentTransaction
from .strategies import PaymentStrategyFactory

logger = logging.getLogger(__name__)


class InitiatePaymentView(APIView):
    """POST /api/v1/payments/initiate/ — starts gateway payment flow"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_number = request.data.get('order_number')
        try:
            order = Order.objects.get(order_number=order_number, user=request.user)
        except Order.DoesNotExist:
            return Response({'message': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.payment_status == 'paid':
            return Response({'message': 'Order is already paid.'}, status=status.HTTP_400_BAD_REQUEST)

        # Strategy Pattern — get the right payment strategy based on order's payment method
        try:
            strategy = PaymentStrategyFactory.get_strategy(order.payment_method)
        except ValueError as e:
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        customer_phone   = request.user.phone or ''
        card_data        = request.data.get('card_data', {})
        transaction_ref  = request.data.get('transaction_ref', '')
        result = strategy.process(
            order,
            customer_phone=customer_phone,
            card_data=card_data,
            transaction_ref=transaction_ref,
        )

        # Payments that resolve immediately (no gateway redirect):
        # COD and Card both confirm on the spot.
        # Easypaisa redirects to an external page → confirmed via callback.
        immediate = result['success'] and not result.get('redirect_url')

        PaymentTransaction.objects.create(
            order=order,
            gateway=order.payment_method,
            transaction_id=result.get('transaction_id', ''),
            amount=order.total_amount,
            status='success' if immediate else 'pending',
            gateway_response=result.get('raw_response', {}),
            processed_at=timezone.now() if immediate else None,
        )

        if immediate:
            order.payment_status = 'paid'
            order.save()
            EventBus.publish(Events.PAYMENT_CONFIRMED, {
                'order_id': order.id,
                'order_number': order.order_number,
                'user_id': request.user.id,
            })

        return Response({
            'success': result['success'],
            'message': result['message'],
            'redirect_url': result.get('redirect_url'),
            'form_data': result.get('form_data', {}),
        })


class PaymentCallbackView(APIView):
    """
    POST /api/v1/payments/callback/?gateway=easypaisa
    Handles IPN (Instant Payment Notification) from Easypaisa.
    This endpoint must be PUBLIC (AllowAny) as the gateway calls it directly.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        gateway = request.query_params.get('gateway', 'easypaisa')
        callback_data = request.data

        # Verify the payment with the gateway's adapter
        order_number = callback_data.get('orderRefNum', '')

        try:
            transaction = PaymentTransaction.objects.get(
                order__order_number=order_number,
                gateway=gateway,
            )
        except PaymentTransaction.DoesNotExist:
            logger.error(f"Callback for unknown order: {order_number}")
            return Response({'message': 'Transaction not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Use the appropriate adapter to verify the callback hash
        from .adapters import EasypaisaAdapter
        adapter = EasypaisaAdapter()
        result = adapter.verify_payment(transaction.transaction_id, dict(callback_data))

        transaction.status = 'success' if result['success'] else 'failed'
        transaction.gateway_response = dict(callback_data)
        transaction.processed_at = timezone.now()
        transaction.save()

        order = transaction.order
        order.payment_status = 'paid' if result['success'] else 'failed'
        order.save()

        if result['success']:
            EventBus.publish(Events.PAYMENT_CONFIRMED, {
                'order_id': order.id,
                'order_number': order.order_number,
                'user_id': order.user_id,
            })

        return Response({'received': True})


class PaymentStatusView(APIView):
    """GET /api/v1/payments/{order_id}/status/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        try:
            order = Order.objects.get(pk=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response({'message': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'order_number': order.order_number,
            'payment_status': order.payment_status,
            'payment_method': order.payment_method,
        })


class EasypaisaInfoView(APIView):
    """GET /api/v1/payments/easypaisa-info/ — returns merchant phone (public)"""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'merchant_phone': settings.EASYPAISA_MERCHANT_PHONE,
            'account_title': 'VOGUE Store',
        })
