"""
OrderService — orchestrates the order placement flow.

MVC ROLE: SERVICE LAYER
-----------------------
Lives between the Controller (OrderView) and the Models (Order, OrderItem).
It coordinates side effects so the controller stays one screen of code.

THIS IS THE MOST PATTERN-DENSE FILE IN THE PROJECT — IT USES 4 PATTERNS:

  1. SERVICE LAYER
     OrderService is the single entry point for "place an order".
     Without it, the view would balloon into a 200-line god method.

  2. DECORATOR (via CartPriceCalculator)
     Coupon and discount math is delegated to apps/pricing/decorators.py.
     Order doesn't know HOW the discount is computed — it just receives
     the final number. Adding "flash sale" math touches zero lines here.

  3. OBSERVER (via EventBus.publish)
     Email confirmation, SMS, inventory deduction, low-stock alerts,
     analytics counters — none of those live here. We publish ONE event
     ('order.placed') and N observers in other apps react independently.
     Adding "send to fulfilment API" = add one observer, zero changes here.

  4. TRANSACTION SCRIPT (built into Django via @transaction.atomic)
     Every write in place_order() is atomic. If step 4 fails, steps 1-3
     are rolled back — no half-saved orders, no orphaned cart items.

BENEFITS
--------
• Maintainability — domain logic is centralised
• Scalability    — swap EventBus for Celery + Redis to run observers async
• Testability    — mock OrderService directly without HTTP/DB
• Extensibility  — new observer/decorator = new file, no edits here
"""
import logging
import random
from datetime import timedelta, date
from django.db import transaction
from apps.cart.services import CartService
from apps.pricing.decorators import CartPriceCalculator
from apps.inventory.models import Inventory
from core.events import EventBus, Events
from core.exceptions import InsufficientStockError
from .models import Order, OrderItem, OrderStatusHistory

# ── Delivery simulation data ──────────────────────────────────────────────────
_DELIVERY_DAYS = [1, 2, 3, 3, 4, 5, 5, 7]   # weighted — most 3-5 days

_RIDERS = [
    'Ali Hassan', 'Muhammad Bilal', 'Usman Khan', 'Tariq Mehmood',
    'Zubair Ahmed', 'Kamran Malik', 'Faisal Raza', 'Asad Nawaz',
    'Hamza Siddiqui', 'Junaid Iqbal', 'Shahzad Butt', 'Rizwan Anwar',
]

_AUTO_NOTES = {
    'confirmed':  'Your order has been confirmed and is being prepared.',
    'processing': 'Your items are being packed and quality-checked at our warehouse.',
    'shipped':    'Your package has left our warehouse and is on its way to you.',
    'delivered':  'Your package has been delivered. Thank you for shopping with us!',
    'cancelled':  'Your order has been cancelled.',
    'refunded':   'Your refund has been processed.',
}

logger = logging.getLogger(__name__)
cart_service = CartService()
price_calc = CartPriceCalculator()


class OrderService:

    @transaction.atomic
    def place_order(self, user, shipping_address_id: int, payment_method: str,
                    notes: str = '') -> Order:
        """
        Complete checkout flow — atomic: either everything succeeds or nothing saves.
        """
        cart = cart_service.get_or_create_cart(user)
        cart_items = list(cart.items.select_related('variant__product', 'variant__inventory').all())

        if not cart_items:
            raise ValueError("Cannot place an order with an empty cart.")

        # Step 1: Validate stock for all items (fail fast)
        for item in cart_items:
            try:
                inv = item.variant.inventory
            except Inventory.DoesNotExist:
                raise InsufficientStockError(item.variant.sku, item.quantity, 0)

            if inv.available < item.quantity:
                raise InsufficientStockError(item.variant.sku, item.quantity, inv.available)

        # Step 2: Calculate totals (applies coupon via Decorator Pattern)
        items_data = [
            {'unit_price': item.unit_price, 'quantity': item.quantity}
            for item in cart_items
        ]
        totals = price_calc.calculate_cart(items_data, cart.coupon_code)

        # Step 3: Create Order (with simulated delivery window)
        estimated_delivery = date.today() + timedelta(days=random.choice(_DELIVERY_DAYS))
        order = Order.objects.create(
            user=user,
            order_number=Order.generate_order_number(),
            subtotal=totals['subtotal'],
            discount_amount=totals['discount_amount'],
            shipping_cost=0,  # Free shipping for now — can add shipping calculator here
            total_amount=totals['total'],
            coupon_code=cart.coupon_code,
            shipping_address_id=shipping_address_id,
            payment_method=payment_method,
            payment_status='pending',
            notes=notes,
            estimated_delivery=estimated_delivery,
        )

        # Step 4: Create OrderItems (snapshot product name + SKU)
        for item in cart_items:
            OrderItem.objects.create(
                order=order,
                variant=item.variant,
                product_name=item.variant.product.name,
                sku=item.variant.sku,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=float(item.unit_price) * item.quantity,
            )

        # Step 5: Record initial status history
        OrderStatusHistory.objects.create(
            order=order,
            old_status='',
            new_status='pending',
            note='Order placed.',
            changed_by=user,
        )

        # Step 6: Increment coupon usage count
        if totals['coupon']:
            totals['coupon'].used_count += 1
            totals['coupon'].save()

        # Step 7: Clear the cart
        cart_service.clear_cart(user)

        # Step 8: Fire the 'order.placed' event (Observer Pattern)
        # All registered observers (EmailObserver, InventoryObserver, etc.)
        # will be called after this line. Zero coupling to those services here.
        EventBus.publish(Events.ORDER_PLACED, {
            'order_id': order.id,
            'order_number': order.order_number,
            'user_id': user.id,
            'user_email': user.email,
            'user_name': user.get_full_name(),
            'total_amount': float(order.total_amount),
            'payment_method': payment_method,
            'items': [
                {'variant_id': i.variant_id, 'quantity': i.quantity, 'sku': i.sku}
                for i in order.items.all()
            ],
        })

        logger.info(f"Order {order.order_number} placed by user {user.id}")
        return order

    @transaction.atomic
    def update_status(self, order_id: int, new_status: str, changed_by,
                      note: str = '', rider_name: str = '', tracking_note: str = '') -> Order:
        order = Order.objects.select_for_update().get(pk=order_id)
        old_status = order.status
        order.status = new_status

        # Auto-assign a rider when shipped (unless one already set or provided)
        if new_status == 'shipped':
            order.rider_name = rider_name or order.rider_name or random.choice(_RIDERS)

        # Set tracking note — use provided value, else auto-generate
        order.tracking_note = tracking_note or _AUTO_NOTES.get(new_status, '')

        order.save()

        OrderStatusHistory.objects.create(
            order=order,
            old_status=old_status,
            new_status=new_status,
            note=note or _AUTO_NOTES.get(new_status, ''),
            changed_by=changed_by,
        )

        EventBus.publish(Events.ORDER_STATUS_CHANGED, {
            'order_id': order.id,
            'order_number': order.order_number,
            'user_id': order.user_id,
            'user_email': order.user.email,
            'old_status': old_status,
            'new_status': new_status,
        })

        return order
