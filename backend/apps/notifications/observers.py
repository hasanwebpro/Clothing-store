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
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from core.events import BaseObserver

logger = logging.getLogger(__name__)
User = get_user_model()


class EmailNotificationObserver(BaseObserver):
    """
    Sends email notifications for order events.
    Implements BaseObserver — must define handle().
    """

    def handle(self, payload: dict) -> None:
        event_type = payload.get('event_type', 'order.placed')

        if 'order_number' in payload:
            self._handle_order_event(payload)

    def _handle_order_event(self, payload: dict) -> None:
        order_number = payload.get('order_number', '')
        user_email = payload.get('user_email', '')
        user_name = payload.get('user_name', 'Customer')
        total_amount = payload.get('total_amount', 0)
        new_status = payload.get('new_status', '')

        if new_status:
            subject = f"Order {order_number} — Status Updated to {new_status.title()}"
            body = (
                f"Hi {user_name},\n\n"
                f"Your order {order_number} status has been updated to: {new_status.upper()}\n\n"
                f"Thank you for shopping with us!\nClothing Store Team"
            )
        else:
            subject = f"Order Confirmed — {order_number}"
            body = (
                f"Hi {user_name},\n\n"
                f"Thank you for your order!\n\n"
                f"Order Number: {order_number}\n"
                f"Total Amount: PKR {total_amount:,.2f}\n\n"
                f"We'll notify you when your order ships.\n\n"
                f"Clothing Store Team"
            )

        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user_email],
                fail_silently=False,
            )
            logger.info(f"Email sent to {user_email} for order {order_number}")
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
        order_number = payload.get('order_number', '')
        new_status = payload.get('new_status', '')

        if not user_id:
            return

        if new_status:
            notif_type = f'order_{new_status}'
            title = f"Order {order_number} — {new_status.title()}"
            body = f"Your order status has been updated to {new_status}."
        else:
            notif_type = 'order_placed'
            title = f"Order Confirmed — {order_number}"
            body = f"Your order {order_number} has been placed successfully."

        try:
            Notification.objects.create(
                user_id=user_id,
                type=notif_type,
                title=title,
                body=body,
            )
        except Exception as exc:
            logger.error(f"Failed to create notification for user {user_id}: {exc}")
