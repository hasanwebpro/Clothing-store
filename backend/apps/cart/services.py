"""
CartService — business logic for cart operations.

MVC ROLE
--------
SERVICE LAYER — sits between the Controller (CartView) and the data layer
(Cart / CartItem / Inventory models). The view is "thin"; this is where the
domain rules live.

PROBLEM IT SOLVES
-----------------
Without this layer, the View would have to know about: stock validation,
price snapshotting, coupon math, cart-merging on login, etc. That makes
views fat, untestable, and duplicates logic when a new caller (e.g., a
mobile app) appears.

PATTERNS APPLIED
----------------
• Service Layer       — a single class is the "front door" for cart ops
• Decorator (via      — CartPriceCalculator (the pricing decorator stack)
   CartPriceCalculator)  handles coupon and discount math
• Observer (indirect) — CartService doesn't notify directly; OrderService
                        will fire 'order.placed' when the cart is checked out

BENEFITS
--------
• Reusable from REST views, GraphQL, management commands, tests
• Easy to swap stock-checking provider (e.g., warehouse API)
• Single place to add features (gift wrapping, scheduled delivery, etc.)
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

    def apply_coupon(self, user, coupon_code: str) -> dict:
        cart = self.get_or_create_cart(user)
        cart_items = list(cart.items.values('unit_price', 'quantity'))
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
        cart_items = list(cart.items.values('unit_price', 'quantity'))
        return price_calculator.calculate_cart(cart_items, cart.coupon_code)

    def clear_cart(self, user) -> None:
        cart = self.get_or_create_cart(user)
        # DB trigger trg_cart_delete_release fires per-row and releases
        # quantity_reserved automatically as each item is deleted.
        cart.items.all().delete()
        cart.coupon_code = None
        cart.save()
