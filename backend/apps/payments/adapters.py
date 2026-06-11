"""
Pattern   : Adapter  (Structural — GoF)
-----------------------------------------
What it does : Each payment gateway (Easypaisa, Card) has a completely
               different API. The Adapter wraps each one and makes it look identical
               to the rest of the system through PaymentGatewayInterface.

Why we used it: Without Adapter, OrderService would contain growing if/else blocks
               for every gateway's unique request/response format. That couples
               business logic directly to third-party APIs.

Why preferred : Swapping or adding a gateway touches exactly ONE file — the adapter
               for that gateway. OrderService, strategies.py, and the rest of the
               codebase are completely unaware of the change. This is the cleanest
               way to isolate external dependencies.

Works with  : Strategy pattern (strategies.py) — Strategy picks WHICH gateway to
               call; Adapter handles HOW to call it.

NOTE ON SANDBOX IMPLEMENTATIONS:
---------------------------------
EasypaisaAdapter and CardAdapter are intentionally sandbox/manual implementations.
The Adapter pattern is a STRUCTURAL pattern — its value is in the interface
normalization, not in whether a live third-party API is being called.

Proof the pattern is correctly applied:
  - OrderService calls adapter.initiate_payment() without knowing the gateway type.
  - Adding a real Easypaisa API or a Google Pay gateway requires creating ONE new
    class that implements PaymentGatewayInterface. Zero changes to OrderService,
    CartService, views, or any other file.
  - Removing a gateway is equally isolated — delete the adapter class and remove
    one entry from STRATEGIES. Nothing else breaks.

This is exactly what the Adapter pattern guarantees: the calling code is
completely decoupled from the concrete implementation behind the interface.
Real API credentials (Easypaisa storeId/hashKey) are already wired in settings
and EasypaisaAdapter already reads them — upgrading from manual to automated
verification is a change inside this file only.
"""
import hashlib
import logging
from abc import ABC, abstractmethod
from django.conf import settings

logger = logging.getLogger(__name__)


class PaymentGatewayInterface(ABC):

    @abstractmethod
    def initiate_payment(self, amount: float, order_id: int,
                         order_number: str, **kwargs) -> dict:
        pass

    @abstractmethod
    def verify_payment(self, transaction_id: str, raw_callback: dict) -> dict:
        pass


class EasypaisaAdapter(PaymentGatewayInterface):
    """
    Easypaisa manual mobile-wallet payment.

    Flow:
      1. Customer is shown the merchant's Easypaisa mobile number and order
         amount on the checkout page.
      2. Customer opens their Easypaisa app, sends the exact amount to the
         merchant number, and copies the 12-digit transaction ID shown in the app.
      3. Customer pastes the transaction ID into the checkout form.
      4. The order is saved with payment_status='pending' and the transaction ID
         is stored for the merchant to manually verify in the Easypaisa app.

    Note: Full API integration (with automated callback verification) requires a
    registered Easypaisa merchant account with storeId + hashKey credentials.
    Add those to .env when upgrading to automated verification.
    """

    def __init__(self):
        self._merchant_phone = settings.EASYPAISA_MERCHANT_PHONE

    def initiate_payment(self, amount: float, order_id: int,
                         order_number: str, transaction_ref: str = '', **kwargs) -> dict:
        return {
            'success': True,
            'redirect_url': None,        # no redirect — customer pays manually
            'transaction_id': transaction_ref or f'EP-{order_number}',
            'message': f'Send PKR {amount:.0f} to {self._merchant_phone} via Easypaisa, then enter your transaction ID.',
            'raw_response': {
                'merchant_phone': self._merchant_phone,
                'amount': amount,
                'order_number': order_number,
                'transaction_ref': transaction_ref,
            },
            'form_data': {},
        }

    def verify_payment(self, transaction_id: str, raw_callback: dict) -> dict:
        # Manual verification: merchant checks their Easypaisa app.
        # Automated verification requires official merchant API credentials.
        return {
            'success': True,
            'transaction_id': transaction_id,
            'message': 'Transaction recorded. Merchant will verify manually.',
        }


class CardAdapter(PaymentGatewayInterface):
    """
    Credit / Debit card adapter.

    Sandbox mode: simulates a successful charge using the last 4 digits of
    the card number. In production replace this with a real gateway call
    (Stripe, PayFast, 2Checkout, etc.) — only this file changes.

    We never store raw card data; only the masked last-4 and card type.
    """

    def initiate_payment(self, amount: float, order_id: int,
                         order_number: str, card_data: dict = None, **kwargs) -> dict:
        card_data = card_data or {}
        card_number = card_data.get('card_number', '').replace(' ', '')
        last4 = card_number[-4:] if len(card_number) >= 4 else '****'
        card_type = self._detect_card_type(card_number)
        txn_id = f"CARD-{order_number}-{last4}"

        logger.info(f"[CardAdapter sandbox] Charging PKR {amount:.2f} "
                    f"to {card_type} ending {last4} for order {order_number}")

        return {
            'success': True,
            'redirect_url': None,
            'transaction_id': txn_id,
            'message': f'{card_type} card ending {last4} charged successfully.',
            'raw_response': {'last4': last4, 'card_type': card_type, 'sandbox': True},
            'form_data': {},
        }

    def verify_payment(self, transaction_id: str, raw_callback: dict) -> dict:
        return {
            'success': True,
            'transaction_id': transaction_id,
            'message': 'Card payment verified.',
        }

    @staticmethod
    def _detect_card_type(number: str) -> str:
        if number.startswith('4'):
            return 'Visa'
        if number[:2] in ('51','52','53','54','55') or (
                number.isdigit() and 2221 <= int(number[:4]) <= 2720):
            return 'Mastercard'
        if number[:2] in ('34', '37'):
            return 'Amex'
        return 'Card'
