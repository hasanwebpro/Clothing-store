"""
Pattern   : Service Layer  (Architectural — Fowler, PEAA)
----------------------------------------------------------
What it does : CartService is the single entry point for all cart operations
               — add, remove, merge on login, apply coupon, calculate totals.
               It combines two other patterns internally:
                 Decorator — delegates pricing/coupon math to CartPriceCalculator
                 Price Snapshot — saves unit_price at add-time, not a live FK,
                                  so promotions never retroactively change old carts

Why we used it: Without this layer, CartView would need to know about stock
               validation, price snapshotting, coupon math, and cart merging.
               That makes the view fat, untestable, and duplicates logic every
               time a new caller (mobile app, management command) is added.

Why preferred : One file, one class, one responsibility. Any caller — REST view,
               GraphQL, background task, test suite — goes through CartService
               and gets the same business rules. Swapping the stock-check source
               or adding gift-wrapping touches exactly one place.
"""
from django.db import transaction
from apps.inventory.models import Inventory
from apps.pricing.decorators import CartPriceCalculator
from core.exceptions import InsufficientStockError, InvalidCouponError
from .models import Cart, CartItem


price_calculator = CartPriceCalculator()


class CartService:

    def get_or_create_cart(self, user) -> Cart:
        cart, _ = Cart.objects.get_or_create(user=user)
        return cart

    @transaction.atomic
    def add_item(self, user, variant_id: int, quantity: int) -> CartItem:
        """Add a variant to the cart. Validates stock before adding.

        If variant_id doesn't match any inventory record we treat it as a
        product ID and resolve the first active variant automatically — this
        supports the ProductCard quick-add fallback path.
        """
        # Check stock — fall back to product-ID → first active variant
        try:
            inventory = Inventory.objects.select_related('variant__product').get(variant_id=variant_id)
        except Inventory.DoesNotExist:
            from apps.products.models import ProductVariant
            variant = (
                ProductVariant.objects
                .filter(product_id=variant_id, is_active=True)
                .select_related('product')
                .first()
            )
            if not variant:
                raise InsufficientStockError(f'variant:{variant_id}', quantity, 0)
            try:
                inventory = Inventory.objects.select_related('variant__product').get(variant=variant)
            except Inventory.DoesNotExist:
                raise InsufficientStockError(variant.sku, quantity, 0)
            variant_id = variant.id

        available = inventory.available
        if available < quantity:
            raise InsufficientStockError(
                inventory.variant.sku, quantity, available
            )

        cart = self.get_or_create_cart(user)

        # Get current price snapshot
        unit_price = inventory.variant.price

        item, created = CartItem.objects.get_or_create(
            cart=cart,
            variant_id=variant_id,
            defaults={'quantity': quantity, 'unit_price': unit_price},
        )

        if not created:
            # Item already in cart — update quantity.
            # DB trigger trg_cart_update_reserve handles quantity_reserved.
            new_qty = item.quantity + quantity
            inventory.refresh_from_db()
            if new_qty > inventory.available:
                raise InsufficientStockError(inventory.variant.sku, new_qty, inventory.available)
            item.quantity = new_qty
            item.save()
        # DB trigger trg_cart_add_reserve handles quantity_reserved on INSERT.

        return item

    @transaction.atomic
    def update_item_quantity(self, user, item_id: int, quantity: int) -> CartItem:
        cart = self.get_or_create_cart(user)
        item = CartItem.objects.select_for_update().get(id=item_id, cart=cart)

        if quantity <= 0:
            item.delete()
            return None

        available = item.variant.inventory.available
        if quantity > available:
            raise InsufficientStockError(item.variant.sku, quantity, available)

        item.quantity = quantity
        item.save()
        return item

    def remove_item(self, user, item_id: int) -> None:
        cart = self.get_or_create_cart(user)
        # DB trigger trg_cart_delete_release handles quantity_reserved on DELETE.
        CartItem.objects.filter(id=item_id, cart=cart).delete()

    # ── Save for later ───────────────────────────────────────────────────────
    @transaction.atomic
    def save_for_later(self, user, item_id: int) -> CartItem:
        """Move an active cart line into the 'saved for later' list."""
        cart = self.get_or_create_cart(user)
        item = CartItem.objects.select_for_update().get(id=item_id, cart=cart)
        item.saved_for_later = True
        item.save(update_fields=['saved_for_later'])
        return item

    @transaction.atomic
    def move_to_cart(self, user, item_id: int) -> CartItem:
        """Move a saved item back into the active cart (re-checks stock)."""
        cart = self.get_or_create_cart(user)
        item = CartItem.objects.select_for_update().get(id=item_id, cart=cart)
        available = item.variant.inventory.available
        if available < item.quantity:
            raise InsufficientStockError(item.variant.sku, item.quantity, available)
        item.saved_for_later = False
        item.save(update_fields=['saved_for_later'])
        return item

    def apply_coupon(self, user, coupon_code: str) -> dict:
        cart = self.get_or_create_cart(user)
        cart_items = list(cart.items.filter(saved_for_later=False).values('unit_price', 'quantity'))
        result = price_calculator.calculate_cart(cart_items, coupon_code)

        if result['coupon']:
            cart.coupon_code = coupon_code
            cart.save()

        return result

    def remove_coupon(self, user) -> None:
        cart = self.get_or_create_cart(user)
        cart.coupon_code = None
        cart.save()

    def get_cart_totals(self, user) -> dict:
        cart = self.get_or_create_cart(user)
        cart_items = list(cart.items.filter(saved_for_later=False).values('unit_price', 'quantity'))
        return price_calculator.calculate_cart(cart_items, cart.coupon_code)

    def clear_cart(self, user) -> None:
        cart = self.get_or_create_cart(user)
        # Only clear ACTIVE items — saved-for-later items persist across checkouts.
        # DB trigger trg_cart_delete_release fires per-row and releases
        # quantity_reserved automatically as each item is deleted.
        cart.items.filter(saved_for_later=False).delete()
        cart.coupon_code = None
        cart.save()
