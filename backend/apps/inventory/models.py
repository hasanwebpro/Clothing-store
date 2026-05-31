"""
MVC ROLE: MODEL — tracks real-time stock levels and logs every stock change.
DESIGN PATTERNS APPLIED:
  • Audit Log — InventoryMovement records every stock change immutably
  • Active Record — Inventory.available is a computed property on the model

TWO-TABLE INVENTORY DESIGN:
-----------------------------
Inventory:          current state (how many units do we have right now?)
InventoryMovement:  history (why did that number change, when, who did it?)

This separation mirrors the double-entry bookkeeping principle used in
accounting: the ledger (Inventory) shows the balance; the journal
(InventoryMovement) shows every transaction that contributed to it.

STOCK RESERVATION SYSTEM:
  quantity_on_hand  = physical units in the warehouse
  quantity_reserved = units "held" by active carts and pending orders
  available         = quantity_on_hand - quantity_reserved  (@property)

WHY RESERVE?
  Without reservation, two customers can both add the last unit to their
  cart. The first to check out succeeds; the second gets an oversell error
  at confirmation — a terrible UX. Reservation prevents this by
  "locking" stock the moment it's added to a cart.

  DB TRIGGER INTEGRATION:
  When a CartItem is INSERTed → trg_cart_add_reserve increments quantity_reserved
  When a CartItem is DELETEd → trg_cart_delete_release decrements quantity_reserved
  This is atomic at the database level — no race condition possible.

AUDIT LOG (InventoryMovement):
  Every stock change is recorded with: who, what direction, how many, why.
  MOVEMENT_CHOICES:
    restock    → +N  (supplier delivery)
    sale       → -N  (order placed, decremented by InventoryObserver)
    return     → +N  (customer return)
    adjustment → ±N  (manual correction by seller)

  This answers the question: "why does our system say we have 12 units
  but the shelf has 10?" — the movement log shows every discrepancy.
"""
from django.db import models
from django.conf import settings


class Inventory(models.Model):
    """
    Current stock levels for one product variant.
    available = quantity_on_hand - quantity_reserved
    """
    variant = models.OneToOneField(
        'products.ProductVariant', on_delete=models.CASCADE, related_name='inventory'
    )
    quantity_on_hand = models.IntegerField(default=0)
    quantity_reserved = models.IntegerField(default=0)  # items in carts or pending orders
    reorder_threshold = models.IntegerField(default=5)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory'
        verbose_name_plural = 'inventory'

    def __str__(self):
        return f"{self.variant.sku}: {self.available} available"

    @property
    def available(self) -> int:
        return max(0, self.quantity_on_hand - self.quantity_reserved)

    @property
    def is_low_stock(self) -> bool:
        return self.available <= self.reorder_threshold and self.available > 0

    @property
    def is_out_of_stock(self) -> bool:
        return self.available <= 0


class InventoryMovement(models.Model):
    """
    Audit log of every stock change. Answers: "who changed what, when, and why?"
    Positive quantity = stock in (restock, return).
    Negative quantity = stock out (sale, adjustment).
    """
    MOVEMENT_CHOICES = [
        ('restock', 'Restock'),
        ('sale', 'Sale'),
        ('return', 'Return'),
        ('adjustment', 'Manual Adjustment'),
    ]

    variant = models.ForeignKey(
        'products.ProductVariant', on_delete=models.CASCADE, related_name='movements'
    )
    movement = models.CharField(max_length=20, choices=MOVEMENT_CHOICES)
    quantity = models.IntegerField()
    reference = models.CharField(max_length=100, blank=True)  # order number, PO number, etc.
    note = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'inventory_movements'
        ordering = ['-created_at']

    def __str__(self):
        direction = '+' if self.quantity > 0 else ''
        return f"{self.variant.sku}: {direction}{self.quantity} ({self.movement})"
