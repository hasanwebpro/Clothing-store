"""
DESIGN PATTERN: Decorator

PROBLEM: A product's price can have multiple stacked modifications:
  - Base price
  - Seasonal sale (20% off)
  - Coupon code (-200 PKR)
  - Flash sale (additional 10% off)

Using if/else to combine these is unmaintainable and violates Open/Closed.
Adding a "flash sale" means editing existing pricing code.

SOLUTION: Each discount is a Decorator — it wraps the previous calculator
and adds its own reduction. They can be stacked in any order.

CLASSES INVOLVED:
  PriceCalculator          → base: returns product's price
  SeasonalDiscountDecorator → wraps any calculator, applies % off
  CouponDecorator           → wraps any calculator, applies coupon
  FlashSaleDecorator        → wraps any calculator, applies flash sale

HOW TO USE:
  # Simple: just the base price
  calc = PriceCalculator()
  price = calc.calculate(product)  # → 1299.00

  # Seasonal sale applied on top
  calc = SeasonalDiscountDecorator(PriceCalculator(), discount_pct=0.20)
  price = calc.calculate(product)  # → 1039.20

  # Coupon applied on top of seasonal sale
  calc = CouponDecorator(
      SeasonalDiscountDecorator(PriceCalculator(), 0.20),
      coupon_code='SAVE100'
  )
  price = calc.calculate(product)  # → 939.20

SCALABILITY: Adding FlashSaleDecorator = one new class, zero changes elsewhere.

SDA Note: This is the "Decorator" (wrapper) pattern from GoF.
Think of it like gift wrapping: each wrapper adds a bow, and you can
stack as many wrappers as you want without changing the gift inside.
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
