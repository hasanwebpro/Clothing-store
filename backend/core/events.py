"""
DESIGN PATTERN: Observer (also called Publish-Subscribe / Event-Driven)

PROBLEM: When an order is placed, many things must happen:
  - Send confirmation email to customer
  - Send SMS notification
  - Decrement inventory
  - Create an in-app notification for admin
  - Update analytics counters

If we put all this logic inside OrderService, it becomes a 300-line
"god method" that violates the Single Responsibility Principle and is
nearly impossible to test or extend.

SOLUTION: OrderService publishes ONE event ('order.placed'). Every other
system that cares about that event registers as an Observer and reacts
independently. Adding a new reaction (e.g., loyalty points) = add ONE
new observer class, zero changes to existing code.

CLASSES INVOLVED:
  - EventBus      → the Subject (holds subscriber registry)
  - BaseObserver  → abstract interface all observers implement
  - Concrete observers are in apps/notifications/observers.py

HOW TO REGISTER OBSERVERS:
  In each app's AppConfig.ready() method:
    EventBus.subscribe('order.placed', EmailNotificationObserver())
    EventBus.subscribe('order.placed', InventoryObserver())

SCALABILITY: For high-traffic production, replace EventBus with
  Celery + Redis so observers run asynchronously as background tasks.
"""
import logging
from abc import ABC, abstractmethod
from typing import Callable

logger = logging.getLogger(__name__)


class BaseObserver(ABC):
    """Every observer must implement handle(). This is the Observer interface."""

    @abstractmethod
    def handle(self, payload: dict) -> None:
        """
        Called when the subscribed event fires.
        payload: dict containing event-specific data (e.g., order_id, user_id)
        """
        pass


class EventBus:
    """
    The Subject in the Observer pattern.
    Maintains the subscriber registry and dispatches events.

    Usage:
        # Subscribe (register an observer)
        EventBus.subscribe('order.placed', MyObserver())

        # Publish (fire the event — all observers are notified)
        EventBus.publish('order.placed', {'order_id': 42, 'user_id': 7})
    """
    _listeners: dict[str, list[BaseObserver]] = {}

    @classmethod
    def subscribe(cls, event: str, listener: BaseObserver) -> None:
        """Register an observer for a specific event name."""
        cls._listeners.setdefault(event, [])
        cls._listeners[event].append(listener)
        logger.debug(f"EventBus: '{listener.__class__.__name__}' subscribed to '{event}'")

    @classmethod
    def unsubscribe(cls, event: str, listener: BaseObserver) -> None:
        """Remove an observer (useful in tests to reset state)."""
        if event in cls._listeners:
            cls._listeners[event] = [
                l for l in cls._listeners[event] if l is not listener
            ]

    @classmethod
    def publish(cls, event: str, payload: dict) -> None:
        """
        Fire an event. All registered observers are called synchronously.
        Errors in one observer do NOT stop others from running.
        """
        listeners = cls._listeners.get(event, [])
        logger.info(f"EventBus: publishing '{event}' to {len(listeners)} observer(s)")

        for listener in listeners:
            try:
                listener.handle(payload)
            except Exception as exc:
                # Log the error but continue — one observer failing must not
                # break the entire order placement flow.
                logger.error(
                    f"EventBus: observer '{listener.__class__.__name__}' "
                    f"failed on event '{event}': {exc}",
                    exc_info=True,
                )

    @classmethod
    def clear(cls, event: str = None) -> None:
        """Clear listeners — used in tests to prevent state leakage."""
        if event:
            cls._listeners.pop(event, None)
        else:
            cls._listeners.clear()


# ─────────────────────────────────────────────────────────────────────────────
# Event name constants — use these instead of raw strings to avoid typos
# ─────────────────────────────────────────────────────────────────────────────
class Events:
    ORDER_PLACED = 'order.placed'
    ORDER_STATUS_CHANGED = 'order.status_changed'
    ORDER_CANCELLED = 'order.cancelled'
    PAYMENT_CONFIRMED = 'payment.confirmed'
    PAYMENT_FAILED = 'payment.failed'
    LOW_STOCK = 'inventory.low_stock'
    REVIEW_SUBMITTED = 'review.submitted'
