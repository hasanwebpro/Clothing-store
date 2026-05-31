"""
DESIGN PATTERN: Strategy
MVC ROLE: Domain service — encapsulates interchangeable payment algorithms
          behind a common interface so the Controller never knows which
          gateway it is talking to.

WHAT IS THE STRATEGY PATTERN?
-------------------------------
Define a family of algorithms (payment methods), encapsulate each one,
and make them interchangeable. The Controller selects the algorithm at
runtime based on the order's payment_method field.

WITHOUT STRATEGY:
  if payment_method == 'cod':
      ...COD logic...
  elif payment_method == 'easypaisa':
      ...Easypaisa logic...
  elif payment_method == 'card':
      ...card logic...
  # Adding JazzCash = editing this if/else chain every time

WITH STRATEGY:
  strategy = PaymentStrategyFactory.get_strategy(order.payment_method)
  result = strategy.process(order, ...)
  # Adding JazzCash = add JazzCashStrategy class + one entry in STRATEGIES dict
  # Zero changes to the Controller or any existing strategy.

RELATIONSHIP TO ADAPTER PATTERN:
  Strategy = the common interface the Controller uses
  Adapter  = the gateway-specific wrapper (adapters.py)
  EasypaisaAdapterStrategy wraps EasypaisaAdapter: the Strategy decides
  WHAT to do, the Adapter decides HOW to talk to the specific gateway.

  CODStrategy has no adapter — COD requires no external API call.

PAYMENTSTRATEGY INTERFACE:
  Every strategy must implement process() returning:
    { success, transaction_id, message, redirect_url, form_data }
  The Controller trusts this contract and never inspects the concrete type.

OPEN/CLOSED PRINCIPLE:
  PaymentStrategyFactory.STRATEGIES dict is the extension point.
  Open for extension (add new payment method), closed for modification
  (no existing code changes when a new gateway is added).
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
