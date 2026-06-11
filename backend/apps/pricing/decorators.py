"""
Pattern   : Decorator  (Structural — GoF)
------------------------------------------
What it does : Each discount type (seasonal sale, coupon, flash sale) is a
               Decorator that wraps the previous price calculator and adds its
               own reduction. Decorators stack in any order without modifying
               each other.

Why we used it: A cart price can have multiple simultaneous modifications.
               Combining them with if/else is fragile — adding a new discount
               type means editing existing pricing logic and retesting everything.

Why preferred : Each discount lives in its own class. Adding a FlashSaleDecorator
               = one new class, zero edits to existing code. Think of it like
               gift wrapping: each wrapper adds a layer without unwrapping the
               gift inside. Stacking is unlimited and order-independent.

Used by     : CartService and OrderService via CartPriceCalculator, which applies
               coupon math without either service knowing the discount details.
"""
from abc import ABC, abstractmethod
from .models import Coupon
from core.exceptions import InvalidCouponError


class AbstractPriceCalculator(ABC):
    """
    Interface that every price calculator must implement.
    Both base calculators and decorators implement this.
    """
    @abstractmethod
    def calculate(self, product) -> float:
        pass


class PriceCalculator(AbstractPriceCalculator):
    """Base calculator — returns the product's effective price (sale or base)."""

    def calculate(self, product) -> float:
        price = product.sale_price if product.sale_price else product.base_price
        return float(price)


class SeasonalDiscountDecorator(AbstractPriceCalculator):
    """
    Wraps any calculator and applies a percentage discount.
    discount_pct: 0.20 = 20% off
    """

    def __init__(self, wrapped: AbstractPriceCalculator, discount_pct: float):
        self._wrapped = wrapped
        self._discount = discount_pct

    def calculate(self, product) -> float:
        base = self._wrapped.calculate(product)
        return round(base * (1 - self._discount), 2)


class CouponDecorator(AbstractPriceCalculator):
    """
    Wraps any calculator and applies a coupon discount.
    Raises InvalidCouponError if coupon is invalid.
    """

    def __init__(self, wrapped: AbstractPriceCalculator, coupon_code: str, order_total: float):
        self._wrapped = wrapped
        self._order_total = order_total

        try:
            self._coupon = Coupon.objects.get(code=coupon_code.upper(), is_active=True)
        except Coupon.DoesNotExist:
            raise InvalidCouponError('Coupon code not found.')

        valid, reason = self._coupon.is_valid(order_total)
        if not valid:
            raise InvalidCouponError(reason)

    def calculate(self, product) -> float:
        base = self._wrapped.calculate(product)
        discount = self._coupon.calculate_discount(self._order_total)
        return max(0.0, round(base - discount, 2))

    @property
    def coupon(self):
        return self._coupon


class CartPriceCalculator:
    """
    High-level calculator for a full cart.
    Computes subtotal, applies coupon, returns final totals.
    Used by CartService and OrderService.
    """

    def calculate_cart(self, cart_items: list, coupon_code: str = None) -> dict:
        """
        Args:
            cart_items: list of dicts with 'unit_price' and 'quantity'
            coupon_code: optional coupon code string

        Returns:
            {
                'subtotal': float,
                'discount_amount': float,
                'total': float,
                'coupon': Coupon | None
            }
        """
        subtotal = sum(float(item['unit_price']) * item['quantity'] for item in cart_items)
        discount = 0.0
        coupon = None

        if coupon_code:
            try:
                coupon_obj = Coupon.objects.get(code=coupon_code.upper(), is_active=True)
                valid, reason = coupon_obj.is_valid(subtotal)
                if valid:
                    discount = coupon_obj.calculate_discount(subtotal)
                    coupon = coupon_obj
            except Coupon.DoesNotExist:
                pass

        return {
            'subtotal': round(subtotal, 2),
            'discount_amount': round(discount, 2),
            'total': round(subtotal - discount, 2),
            'coupon': coupon,
        }
