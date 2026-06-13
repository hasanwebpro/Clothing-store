"""
Pattern   : Service Layer  (Architectural — Fowler, PEAA)
          + Observer, Decorator, Atomic Transaction  (all applied here)
----------------------------------------------------------
What it does : OrderService is the single entry point for "place an order".
               It is the most pattern-dense file in the project — four patterns
               work together inside place_order():

                 1. Service Layer — coordinates the full checkout flow so
                    OrderView stays a thin HTTP adapter, not a god method.

                 2. Decorator (CartPriceCalculator) — pricing and coupon math
                    is delegated out. OrderService receives the final total;
                    it never knows HOW the discount was calculated.

                 3. Observer (EventBus.publish) — inventory deduction, email
                    confirmation, and in-app notifications all happen outside
                    this class. ONE publish call triggers N independent observers.

                 4. Atomic Transaction (@transaction.atomic) — every DB write
                    in place_order() is atomic. If any step fails, all previous
                    writes are rolled back — no half-saved orders.

Why preferred : Adding a new post-order side effect (loyalty points, analytics,
               fulfilment API) = write one new observer class. Zero changes here.
               Swapping the discount logic = edit CartPriceCalculator only.
               This file is the stable hub; extensions go in separate spokes.
"""
import logging
import random
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from apps.cart.services import CartService
from apps.pricing.decorators import CartPriceCalculator
from apps.inventory.models import Inventory
from apps.users.models import Address
from core.events import EventBus, Events
from core.exceptions import InsufficientStockError
from .models import Order, OrderItem, OrderStatusHistory, OrderReturn

# ── Order lifecycle simulation ────────────────────────────────────────────────
# The pipeline an order walks through, in order. Used to compare two statuses so
# the simulation only ever moves an order FORWARD, never backward.
_PIPELINE = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']

# Cumulative delay from order placement to each stage.
#
# These are COMPRESSED to minutes so the full lifecycle is observable during a
# demo / viva rather than spread over real days. The *proportions* are realistic:
# a quick confirmation, a packing gap, dispatch, then transit to delivery. In
# production these constants would simply be larger (hours/days) — nothing else
# about the simulation would change.
_LIFECYCLE_SCHEDULE = [
    ('confirmed',  timedelta(minutes=1)),
    ('processing', timedelta(minutes=2)),
    ('shipped',    timedelta(minutes=4)),
    ('delivered',  timedelta(minutes=6)),
]

# When an order is read for the first time after a long gap, several stages may
# already be overdue. We still record their history + in-app notifications (so
# the timeline is complete), but we only SEND EMAIL for transitions that became
# due within this recent window — preventing a burst of stale emails at once.
_EMAIL_FRESHNESS = timedelta(minutes=15)

# Which transitions are worth an email. Mirrors real stores (you get emailed on
# confirm / ship / deliver / cancel / refund, not on every internal step).
_EMAIL_STAGES = {'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'}

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
        cart_items = list(
            cart.items.filter(saved_for_later=False)
            .select_related('variant__product', 'variant__inventory').all()
        )

        if not cart_items:
            raise ValueError("Cannot place an order with an empty cart.")

        # Validate the shipping address belongs to this user and is active
        if not Address.objects.filter(
            pk=shipping_address_id, user=user, is_deleted=False
        ).exists():
            raise ValueError("Invalid or unavailable shipping address.")

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

        # Step 3: Create Order.
        # ETA is derived from the lifecycle schedule's final (delivered) stage so
        # the promised delivery date can never contradict the simulation — the
        # order is delivered exactly when the ETA says it will be.
        estimated_delivery = (timezone.now() + _LIFECYCLE_SCHEDULE[-1][1]).date()
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
            is_simulated=True,  # real checkout order → eligible for lifecycle simulation
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
            # The order is PENDING at placement, not confirmed. The notification
            # observers read this so they never claim "Confirmed" before it is.
            'status': 'pending',
            'items': [
                {'variant_id': i.variant_id, 'quantity': i.quantity, 'sku': i.sku}
                for i in order.items.all()
            ],
        })

        logger.info(f"Order {order.order_number} placed by user {user.id}")
        return order

    @transaction.atomic
    def update_status(self, order_id: int, new_status: str, changed_by,
                      note: str = '', rider_name: str = '', tracking_note: str = '',
                      when=None, notify_email: bool = True) -> Order:
        """
        Single, atomic status transition. Whether driven by an admin (manual) or
        the lifecycle simulation (automatic), EVERY transition flows through here
        so the status change, the audit-log row, and the customer notification are
        always produced together — a notification can never disagree with status.

        when:         the moment this transition is considered to have happened.
                      Used to back-date the history row + notification so the
                      timeline reflects the simulated schedule, not "all at once"
                      when an old order is caught up. Defaults to now().
        notify_email: gate for the email channel only (in-app is always written).
                      Lets the simulation suppress a burst of stale emails.
        """
        order = Order.objects.select_for_update().get(pk=order_id)
        old_status = order.status
        when = when or timezone.now()
        order.status = new_status

        # Auto-assign a rider when shipped (unless one already set or provided)
        if new_status == 'shipped':
            order.rider_name = rider_name or order.rider_name or random.choice(_RIDERS)

        # Set tracking note — use provided value, else auto-generate
        order.tracking_note = tracking_note or _AUTO_NOTES.get(new_status, '')

        # Keep the ETA consistent: an order is never "delivered" with a delivery
        # date still in the future. Clamp the ETA to the delivery moment.
        if new_status == 'delivered':
            deliver_date = when.date()
            if order.estimated_delivery is None or order.estimated_delivery > deliver_date:
                order.estimated_delivery = deliver_date

        order.save()

        history = OrderStatusHistory.objects.create(
            order=order,
            old_status=old_status,
            new_status=new_status,
            note=note or _AUTO_NOTES.get(new_status, ''),
            changed_by=changed_by,
        )
        # changed_at is auto_now_add (write-once, ignores the value at create), so
        # back-date it with an explicit UPDATE when a simulated time is supplied.
        if when is not None:
            OrderStatusHistory.objects.filter(pk=history.pk).update(changed_at=when)

        EventBus.publish(Events.ORDER_STATUS_CHANGED, {
            'order_id': order.id,
            'order_number': order.order_number,
            'user_id': order.user_id,
            'user_email': order.user.email,
            'user_name': order.user.get_full_name(),
            'old_status': old_status,
            'new_status': new_status,
            'when': when.isoformat(),
            'notify_email': notify_email,
        })

        return order

    # ── Lifecycle simulation ─────────────────────────────────────────────────
    # SERVICE LAYER (continued): the simulation is the single source of truth for
    # where an order is in its lifecycle. It is driven LAZILY — there is no
    # background worker. Whenever an order is read (detail page polling, list,
    # notification bell), sync_lifecycle catches it up to the status its schedule
    # says it should be in, emitting one history row + one notification per step.
    #
    # Because every advance goes through update_status (above), the notification,
    # timestamp, tracking note and audit row for each stage are produced together
    # and can never drift apart — which is exactly the consistency guarantee the
    # whole feature is about.

    def sync_lifecycle(self, order: Order) -> Order:
        """
        Advance a single order through any lifecycle stages that are now due.

        Forward-only and idempotent: re-reading an order never duplicates a
        transition or moves it backward. Terminal states (cancelled / refunded)
        and non-simulated seed orders are frozen — left exactly as they are.
        """
        if not order.is_simulated or order.status in ('cancelled', 'refunded'):
            return order

        now = timezone.now()
        current_index = _PIPELINE.index(order.status) if order.status in _PIPELINE else -1

        for stage, delay in _LIFECYCLE_SCHEDULE:
            stage_index = _PIPELINE.index(stage)
            if stage_index <= current_index:
                continue  # already at or past this stage
            due_at = order.created_at + delay
            if due_at > now:
                break  # schedule is ordered — nothing later is due yet
            order = self.update_status(
                order.id, stage, changed_by=order.user,
                when=due_at,
                notify_email=(stage in _EMAIL_STAGES and (now - due_at) <= _EMAIL_FRESHNESS),
            )
            current_index = stage_index

        return order

    def sync_user_orders(self, user) -> None:
        """
        Catch up all of a user's in-flight orders. Used when the notification
        bell is opened so newly-due transitions have generated their
        notifications before the list is returned.
        """
        in_flight = Order.objects.filter(
            user=user, is_simulated=True,
            status__in=['pending', 'confirmed', 'processing', 'shipped'],
        )
        for order in in_flight:
            self.sync_lifecycle(order)

    # ── Returns / Refunds / Exchanges ────────────────────────────────────────
    # SERVICE LAYER (continued): the post-purchase lifecycle lives here too, so
    # the controller never embeds domain rules. create_return enforces the
    # "delivered + no open request" precondition; resolve_return owns the
    # OrderReturn STATE MACHINE and the side effect of flipping the parent
    # Order to 'refunded' when a return/refund completes.
    @transaction.atomic
    def create_return(self, order, kind: str, reason: str, customer_note: str = '') -> OrderReturn:
        """Customer requests a return/refund/exchange on a delivered order."""
        if order.status != 'delivered':
            raise ValueError("Returns can only be requested for delivered orders.")

        # Prevent stacking multiple open requests on the same order
        if order.returns.filter(status__in=['requested', 'approved']).exists():
            raise ValueError("There is already an open request for this order.")

        return OrderReturn.objects.create(
            order=order, kind=kind, reason=reason, customer_note=customer_note,
        )

    @transaction.atomic
    def resolve_return(self, return_id: int, new_status: str, admin_note: str = '') -> OrderReturn:
        """Admin/seller approves, rejects, or completes a return request."""
        from django.utils import timezone
        ret = OrderReturn.objects.select_for_update().select_related('order').get(pk=return_id)
        ret.status = new_status
        if admin_note:
            ret.admin_note = admin_note
        if new_status in ('approved', 'rejected', 'completed'):
            ret.resolved_at = timezone.now()
        ret.save()

        # A completed refund/return flips the order to 'refunded' for clarity
        if new_status == 'completed' and ret.kind in ('return', 'refund'):
            if ret.order.status != 'refunded':
                self.update_status(
                    ret.order.id, 'refunded', changed_by=ret.order.user,
                    note=f'{ret.get_kind_display()} completed.',
                )
        return ret
