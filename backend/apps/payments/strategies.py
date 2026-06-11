"""
Pattern   : Strategy  (Behavioural — GoF)
------------------------------------------
What it does : Defines a family of payment algorithms (COD, Easypaisa, Card),
               encapsulates each as a class, and makes them interchangeable at
               runtime. The controller picks the strategy based on the order's
               payment_method field — it never knows the concrete type.

Why we used it: Without Strategy, the controller would have a growing if/else
               chain for every payment method. Every time a new gateway is added
               that chain must be edited — risky, violates Open/Closed Principle.

Why preferred : Adding a new gateway = one new class + one entry in STRATEGIES dict.
               Zero changes to existing strategies or the controller. This is
               exactly what Open/Closed Principle demands: open for extension,
               closed for modification.

Works with  : Adapter pattern (adapters.py) — Strategy decides WHAT to do;
               Adapter decides HOW to talk to the specific third-party gateway.
               CODStrategy has no adapter because COD needs no external API call.
"""
from abc import ABC, abstractmethod
from .adapters import EasypaisaAdapter, CardAdapter


class PaymentStrategy(ABC):

    @abstractmethod
    def process(self, order, customer_phone: str = '', card_data: dict = None,
                transaction_ref: str = '') -> dict:
        pass


class CODStrategy(PaymentStrategy):
    def process(self, order, customer_phone: str = '', card_data: dict = None,
                transaction_ref: str = '') -> dict:
        return {
            'success': True,
            'transaction_id': f'COD-{order.order_number}',
            'message': 'Order confirmed. Pay cash when your order arrives.',
            'redirect_url': None,
            'form_data': {},
        }


class EasypaisaAdapterStrategy(PaymentStrategy):
    def __init__(self):
        self._adapter = EasypaisaAdapter()

    def process(self, order, customer_phone: str = '', card_data: dict = None,
                transaction_ref: str = '') -> dict:
        return self._adapter.initiate_payment(
            amount=float(order.total_amount),
            order_id=order.id,
            order_number=order.order_number,
            transaction_ref=transaction_ref,
        )


class CardStrategy(PaymentStrategy):
    def __init__(self):
        self._adapter = CardAdapter()

    def process(self, order, customer_phone: str = '', card_data: dict = None,
                transaction_ref: str = '') -> dict:
        return self._adapter.initiate_payment(
            amount=float(order.total_amount),
            order_id=order.id,
            order_number=order.order_number,
            card_data=card_data or {},
        )


class PaymentStrategyFactory:
    STRATEGIES = {
        'cod':       CODStrategy,
        'easypaisa': EasypaisaAdapterStrategy,
        'card':      CardStrategy,
    }

    @classmethod
    def get_strategy(cls, payment_method: str) -> PaymentStrategy:
        strategy_class = cls.STRATEGIES.get(payment_method)
        if not strategy_class:
            raise ValueError(
                f"Unknown payment method '{payment_method}'. "
                f"Available: {', '.join(cls.STRATEGIES.keys())}"
            )
        return strategy_class()
