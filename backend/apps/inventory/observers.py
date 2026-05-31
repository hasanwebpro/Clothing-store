"""
InventoryObserver — reacts to order events and adjusts stock levels.

DESIGN PATTERN: Observer
This observer is registered in UsersConfig.ready() to listen for 'order.placed'.
When an order is placed, it decrements stock and logs the movement.
"""
import logging
from django.db import transaction
from core.events import BaseObserver, EventBus, Events
from core.exceptions import InsufficientStockError
from .models import Inventory, InventoryMovement

logger = logging.getLogger(__name__)


class InventoryObserver(BaseObserver):
    """
    Listens for 'order.placed' and decrements inventory for each order item.
    """

    def handle(self, payload: dict) -> None:
        order_id = payload.get('order_id')
        user_id = payload.get('user_id')   # Captured from the order-placed event
        order_items = payload.get('items', [])

        for item in order_items:
            self._deduct_stock(
                variant_id=item['variant_id'],
                quantity=item['quantity'],
                order_id=order_id,
                user_id=user_id,
            )

    @transaction.atomic
    def _deduct_stock(self, variant_id: int, quantity: int, order_id: int, user_id: int = None) -> None:
        try:
            inventory = Inventory.objects.select_for_update().get(variant_id=variant_id)
            inventory.quantity_on_hand = max(0, inventory.quantity_on_hand - quantity)
            # quantity_reserved is already released by trg_cart_delete_release
            # when clear_cart() deletes the cart items — do NOT touch it here.
            inventory.save(update_fields=['quantity_on_hand'])

            # Record movement with the actual user from the event payload.
            # Fall back to any admin if the event omitted the user (e.g., system order).
            actor_id = user_id
            if not actor_id:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                admin = User.objects.filter(role='admin', is_active=True).first()
                actor_id = admin.id if admin else None

            if actor_id:
                InventoryMovement.objects.create(
                    variant_id=variant_id,
                    movement='sale',
                    quantity=-quantity,
                    reference=f'ORDER-{order_id}',
                    created_by_id=actor_id,
                )

            # Fire low-stock event if threshold crossed
            if inventory.is_low_stock:
                EventBus.publish(Events.LOW_STOCK, {
                    'variant_id': variant_id,
                    'available': inventory.available,
                    'threshold': inventory.reorder_threshold,
                })

        except Inventory.DoesNotExist:
            logger.error(f"No inventory record for variant_id={variant_id}")
