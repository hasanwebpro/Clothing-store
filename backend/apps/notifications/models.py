"""
MVC ROLE: MODEL — stores in-app notification records for the notification bell.
DESIGN PATTERN: Observer (data store side) — this model is the SINK that
                InAppNotificationObserver writes to when events fire.

HOW NOTIFICATIONS ARE CREATED:
--------------------------------
Notifications are NEVER created directly by Controllers (Views).
They are created by InAppNotificationObserver (notifications/observers.py)
which subscribes to events on the EventBus (core/events.py):

  EventBus.subscribe('order.placed',         InAppNotificationObserver())
  EventBus.subscribe('order.status_changed', InAppNotificationObserver())

When OrderService publishes Events.ORDER_PLACED, the observer:
  1. Receives the payload dict
  2. Creates a Notification row with the relevant title + body
  3. The user's notification bell shows an unread count

This means: Controllers never import this model. Service layer (OrderService)
never imports this model. The observer is the ONLY writer — perfect
decoupling between the order domain and the notification domain.

is_read INDEX:
  db_index=True on is_read because the most common query is:
    Notification.objects.filter(user=request.user, is_read=False)
  This unread-count query runs on EVERY page load — the index is essential.
"""
from django.db import models
from django.conf import settings


class Notification(models.Model):
    TYPE_CHOICES = [
        ('order_placed', 'Order Placed'),
        ('order_confirmed', 'Order Confirmed'),
        ('order_processing', 'Order Processing'),
        ('order_shipped', 'Order Shipped'),
        ('order_delivered', 'Order Delivered'),
        ('order_cancelled', 'Order Cancelled'),
        ('order_refunded', 'Order Refunded'),
        ('payment_confirmed', 'Payment Confirmed'),
        ('low_stock', 'Low Stock Alert'),
        ('review_approved', 'Review Approved'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications'
    )
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
        ]

    def __str__(self):
        return f"[{self.type}] {self.title} → {self.user.email}"
