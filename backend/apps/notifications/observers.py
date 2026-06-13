"""
Pattern   : Observer  (Behavioural — GoF)
------------------------------------------
What it does : These observers subscribe to order events via EventBus. When
               'order.placed' or 'order.status_changed' fires, they react:
                 EmailNotificationObserver  → sends email to the customer
                 InAppNotificationObserver  → writes a Notification DB record
               Neither knows about the other, and OrderService knows about neither.

Why we used it: When an order is placed, email and in-app notifications must fire.
               Calling both directly from OrderService creates tight coupling —
               OrderService would grow every time a new channel is added, and
               a broken email sender could crash the entire order placement.

Why preferred : Adding a new channel (SMS, push notification, WhatsApp) = one
               new observer class + one EventBus.subscribe() call in apps.py.
               OrderService never changes. Each channel is independently testable
               and isolated — one failing observer does not block the others.
"""
import logging
from datetime import datetime
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from core.events import BaseObserver

logger = logging.getLogger(__name__)
User = get_user_model()

# ── Status → copy mapping ─────────────────────────────────────────────────────
# SINGLE SOURCE OF TRUTH for notification wording. Every notification's title,
# body and type are looked up by the order's ACTUAL status — there is no code
# path that hard-codes "Confirmed" (or any other status) independently of the
# real order state. This is what guarantees a notification can never claim a
# status the order isn't actually in.
_STATUS_TITLE = {
    'pending':    'Order Placed',
    'confirmed':  'Order Confirmed',
    'processing': 'Order Processing',
    'shipped':    'Order Shipped',
    'delivered':  'Order Delivered',
    'cancelled':  'Order Cancelled',
    'refunded':   'Order Refunded',
}
_STATUS_BODY = {
    'pending':    'has been placed and is awaiting confirmation.',
    'confirmed':  'has been confirmed and is being prepared.',
    'processing': 'is being packed at our warehouse.',
    'shipped':    'has shipped and is on its way to you.',
    'delivered':  'has been delivered. Enjoy your purchase!',
    'cancelled':  'has been cancelled.',
    'refunded':   'has been refunded.',
}
_STATUS_NOTIF_TYPE = {
    'pending':    'order_placed',
    'confirmed':  'order_confirmed',
    'processing': 'order_processing',
    'shipped':    'order_shipped',
    'delivered':  'order_delivered',
    'cancelled':  'order_cancelled',
    'refunded':   'order_refunded',
}


def _resolve_status(payload: dict) -> str:
    """
    The order's real status for this event. A status-change event carries
    new_status; the placement event carries status='pending'. Either way the
    notification is built from the order's true state, never assumed.
    """
    return payload.get('new_status') or payload.get('status') or 'pending'


def _resolve_when(payload: dict):
    """Parse the optional simulated timestamp; None means 'now'."""
    raw = payload.get('when')
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw)
    except (ValueError, TypeError):
        return None


class EmailNotificationObserver(BaseObserver):
    """
    Sends email notifications for order events.
    Implements BaseObserver — must define handle().
    """

    def handle(self, payload: dict) -> None:
        if 'order_number' not in payload:
            return

        status = _resolve_status(payload)
        is_placement = not payload.get('new_status')

        # In-app notifications fire for every transition, but email is reserved
        # for customer-meaningful milestones and is suppressed for stale catch-up
        # transitions (notify_email=False) to avoid sending a burst at once.
        if not is_placement:
            if not payload.get('notify_email', True):
                return
            if status not in ('confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'):
                return

        order_number = payload.get('order_number', '')
        user_email = payload.get('user_email', '')
        user_name = payload.get('user_name', 'Customer')
        total_amount = payload.get('total_amount', 0) or 0

        if is_placement:
            subject = f"Order Placed — {order_number}"
            body = (
                f"Hi {user_name},\n\n"
                f"Thank you for your order! We've received it and it is now pending "
                f"confirmation.\n\n"
                f"Order Number: {order_number}\n"
                f"Total Amount: PKR {total_amount:,.2f}\n\n"
                f"We'll notify you as it is confirmed, shipped and delivered.\n\n"
                f"VOGUE Team"
            )
        else:
            label = _STATUS_TITLE.get(status, status.title())
            detail = _STATUS_BODY.get(status, f'has been updated to {status}.')
            subject = f"{label} — {order_number}"
            body = (
                f"Hi {user_name},\n\n"
                f"Your order {order_number} {detail}\n\n"
                f"VOGUE Team"
            )

        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user_email],
                fail_silently=False,
            )
            logger.info(f"Email ({status}) sent to {user_email} for order {order_number}")
        except Exception as exc:
            logger.error(f"Failed to send email to {user_email}: {exc}")


class InAppNotificationObserver(BaseObserver):
    """
    Creates in-app Notification records in the database.
    These appear in the customer's notification bell icon.
    """

    def handle(self, payload: dict) -> None:
        from .models import Notification

        user_id = payload.get('user_id')
        if not user_id:
            return

        status = _resolve_status(payload)
        order_number = payload.get('order_number', '')

        notif_type = _STATUS_NOTIF_TYPE.get(status, 'order_placed')
        title = f"{_STATUS_TITLE.get(status, 'Order Updated')} — {order_number}"
        body = f"Your order {order_number} {_STATUS_BODY.get(status, f'is now {status}.')}"

        try:
            notif = Notification.objects.create(
                user_id=user_id,
                type=notif_type,
                title=title,
                body=body,
            )
            # Back-date to the simulated transition time so the bell's ordering
            # and "x minutes ago" labels line up with the order timeline.
            when = _resolve_when(payload)
            if when is not None:
                Notification.objects.filter(pk=notif.pk).update(created_at=when)
        except Exception as exc:
            logger.error(f"Failed to create notification for user {user_id}: {exc}")
