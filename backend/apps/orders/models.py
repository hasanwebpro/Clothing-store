"""
MVC ROLE: MODEL — represents Order, its line items, status audit trail, and returns.
DESIGN PATTERNS APPLIED:
  • Snapshot / Memento — OrderItem captures product_name and sku at purchase time
  • Audit Log          — OrderStatusHistory records every status transition immutably
  • State Machine      — OrderReturn moves through requested → approved/rejected →
                         completed, with the legal transitions enforced in the
                         OrderService (see resolve_return)

SNAPSHOT PATTERN (OrderItem):
-------------------------------
OrderItem stores product_name and sku as VARCHAR columns — copies of the
data that existed at purchase time — rather than live FKs to the Product.

WHY: If a seller renames "Premium Shalwar Kameez" to "Casual Kurta" two
months after you ordered it, your invoice should still say
"Premium Shalwar Kameez" — what you actually bought.
Without snapshotting, order history silently rewrites itself when products
are edited or deleted.

AUDIT LOG PATTERN (OrderStatusHistory):
-----------------------------------------
Every status transition is recorded as an immutable row in order_status_history:
  { old_status, new_status, note, changed_by, changed_at }

WHY: This provides:
  1. Customer tracking timeline — "Placed → Confirmed → Shipped → Delivered"
  2. Dispute resolution — who changed the status and when
  3. Analytics — how long orders spend in each state

The model uses auto_now_add=True (write-once timestamp). Records are
NEVER updated, only inserted — a true audit trail.

ORDER NUMBER DESIGN:
  generate_order_number() produces "ORD-YYYYMMDD-NNNNN" (e.g. ORD-20250530-00042).
  Uses MAX(order_number) rather than COUNT(*) so gaps in the sequence (from
  failed transactions) never cause collisions.

FINANCIAL INTEGRITY:
  total_amount = subtotal - discount_amount + shipping_cost.
  These are stored as Decimal columns (exact arithmetic, no floating-point drift)
  because money calculations must be exact.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('cod', 'Cash on Delivery'),
        ('easypaisa', 'Easypaisa'),
        ('card', 'Credit / Debit Card'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='orders')
    order_number = models.CharField(max_length=30, unique=True, db_index=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending', db_index=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    coupon_code = models.CharField(max_length=50, blank=True, null=True)
    shipping_address = models.ForeignKey(
        'users.Address', on_delete=models.PROTECT, related_name='orders'
    )
    payment_method = models.CharField(max_length=15, choices=PAYMENT_METHOD_CHOICES)
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    # ── Delivery simulation fields ────────────────────────────────────────────
    estimated_delivery = models.DateField(null=True, blank=True)
    rider_name = models.CharField(max_length=100, blank=True)
    tracking_note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return self.order_number

    @staticmethod
    def generate_order_number() -> str:
        from datetime import datetime
        from django.db.models import Max
        date_str = datetime.now().strftime('%Y%m%d')
        prefix = f"ORD-{date_str}-"
        # Use MAX on the suffix so gaps in numbering never cause collisions
        result = Order.objects.filter(
            order_number__startswith=prefix
        ).aggregate(max_num=Max('order_number'))
        last = result['max_num']
        if last:
            try:
                last_seq = int(last.split('-')[-1])
            except (ValueError, IndexError):
                last_seq = 0
        else:
            last_seq = 0
        return f"{prefix}{last_seq + 1:05d}"


class OrderItem(models.Model):
    """Line item snapshot — preserves product details at time of purchase."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    variant = models.ForeignKey(
        'products.ProductVariant', on_delete=models.PROTECT, related_name='order_items'
    )
    product_name = models.CharField(max_length=255)   # snapshot
    sku = models.CharField(max_length=100)             # snapshot
    quantity = models.PositiveSmallIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'order_items'

    def __str__(self):
        return f"{self.sku} × {self.quantity} in {self.order.order_number}"


class OrderStatusHistory(models.Model):
    """Immutable log of every status transition — used for order tracking timeline."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=15, blank=True)
    new_status = models.CharField(max_length=15)
    note = models.TextField(blank=True)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'order_status_history'
        ordering = ['changed_at']


class OrderReturn(models.Model):
    """
    MVC ROLE: MODEL — post-delivery request to Return, Refund, or Exchange items.
    DESIGN PATTERN: State Machine (with an Audit-Log flavour via created/resolved_at)

    A customer raises a request against a *delivered* order; an admin/seller
    resolves it. The legal status transitions are:

        requested ──► approved ──► completed
            └───────► rejected

    These transitions are owned by OrderService.resolve_return() (the Service
    Layer) rather than the model, so the controller stays thin and the rule
    "completing a refund flips the Order to 'refunded'" lives in one place.

    WHY A SEPARATE MODEL (not a status on Order)?
      An order can have at most one *open* request but a full history of past
      ones, each with its own kind/reason/resolution. Modelling it as its own
      row keeps that history immutable and queryable — the same reasoning that
      gave OrderStatusHistory its own table.
    """
    KIND_CHOICES = [
        ('return',   'Return'),
        ('refund',   'Refund'),
        ('exchange', 'Exchange'),
    ]
    STATUS_CHOICES = [
        ('requested', 'Requested'),
        ('approved',  'Approved'),
        ('rejected',  'Rejected'),
        ('completed', 'Completed'),
    ]
    REASON_CHOICES = [
        ('wrong_size',     'Wrong size / does not fit'),
        ('damaged',        'Arrived damaged or defective'),
        ('wrong_item',     'Received the wrong item'),
        ('not_as_described', 'Not as described'),
        ('changed_mind',   'Changed my mind'),
        ('other',          'Other'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='returns')
    kind = models.CharField(max_length=10, choices=KIND_CHOICES)
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='requested', db_index=True)
    customer_note = models.TextField(blank=True)
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'order_returns'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_kind_display()} for {self.order.order_number} ({self.status})"
