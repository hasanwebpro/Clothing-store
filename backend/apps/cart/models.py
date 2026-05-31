"""
MVC ROLE: MODEL — represents the shopping cart and its line items.
DESIGN PATTERNS APPLIED:
  • Active Record (Django ORM)  — Cart.item_count and Cart.subtotal are
    computed Python properties on the model, keeping aggregation logic
    close to the data rather than scattered across views.
  • Price Snapshot              — see PRICE SNAPSHOT section below.

PRICE SNAPSHOT DESIGN DECISION:
---------------------------------
CartItem.unit_price stores the price AT THE TIME the item was added to the
cart, not a FK to the current variant price.

WHY?  If a seller lowers the price of a T-shirt after a customer has already
added it to their cart, the customer should see the price they expected when
they added it — not a surprise change at checkout. The snapshot also protects
against accidental price increases wiping out in-flight checkout sessions.

This is a deliberate de-normalisation: we trade a small amount of storage
for price consistency and auditability.

STOCK RESERVATION (DB TRIGGER INTEGRATION):
  When a CartItem is created (INSERT), a database trigger increments
  Inventory.quantity_reserved for that variant. When it is deleted (DELETE),
  the trigger decrements it. This means "available stock" always reflects
  items in carts across ALL users — preventing overselling.

  The trigger is managed in the database migration, not in Python. This means
  the reservation happens atomically at the DB level regardless of which
  code path inserts/deletes cart items.

ONE-TO-ONE CART PER USER:
  Cart is a OneToOneField on User. A user can only have one active cart.
  CartService.get_or_create_cart() is the safe entry point — it creates
  the cart record lazily on first add-to-cart.
"""
from django.db import models
from django.conf import settings


class Cart(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        null=True, blank=True, related_name='cart'
    )
    session_key = models.CharField(max_length=100, blank=True, null=True)
    coupon_code = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'carts'

    def __str__(self):
        owner = self.user.email if self.user else f'guest:{self.session_key}'
        return f"Cart ({owner})"

    @property
    def item_count(self) -> int:
        return sum(item.quantity for item in self.items.all())

    @property
    def subtotal(self) -> float:
        return sum(float(item.unit_price) * item.quantity for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    variant = models.ForeignKey(
        'products.ProductVariant', on_delete=models.CASCADE, related_name='cart_items'
    )
    quantity = models.PositiveSmallIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)  # price snapshot
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cart_items'
        unique_together = [('cart', 'variant')]

    def __str__(self):
        return f"{self.variant.sku} × {self.quantity}"

    @property
    def total_price(self) -> float:
        return float(self.unit_price) * self.quantity
