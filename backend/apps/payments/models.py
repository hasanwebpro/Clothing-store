"""
MVC ROLE: MODEL — records every payment gateway interaction as an audit log.
DESIGN PATTERN: Audit Log / Immutable Record

WHY STORE EVERY TRANSACTION?
------------------------------
PaymentTransaction is an append-only ledger of every payment attempt:
  - COD orders get a COD-{order_number} transaction (immediate)
  - Easypaisa orders get a pending transaction that updates via callback
  - Card orders get a CARD-{order_number} transaction (immediate in sandbox)

WHY NOT JUST UPDATE THE ORDER'S PAYMENT_STATUS?
  Because we need evidence. If a customer calls to say "I paid but my order
  still shows pending", we can look at the transaction row:
    - gateway_response (raw JSON from the gateway)
    - processed_at     (exactly when it was confirmed)
    - status           (pending → success / failed)

  Without this table, that history is gone when the Order record is updated.

RELATION TO THE STRATEGY AND ADAPTER PATTERNS:
  payments/strategies.py  (Strategy) decides WHICH payment pathway to use.
  payments/adapters.py    (Adapter) wraps the gateway SDK into our interface.
  payments/views.py       (Controller) calls the strategy, then writes a
                          PaymentTransaction row with the result.

  The Model is passive — it stores what the Controller records.
  It does NOT contain any payment processing logic.

gateway_response: JSONField — stores the raw dict from the gateway so
we can replay or debug any transaction without calling the gateway again.
"""
from django.db import models


class PaymentTransaction(models.Model):
    GATEWAY_CHOICES = [
        ('cod', 'Cash on Delivery'),
        ('easypaisa', 'Easypaisa'),
        ('card', 'Credit / Debit Card'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    order = models.ForeignKey('orders.Order', on_delete=models.PROTECT, related_name='transactions')
    gateway = models.CharField(max_length=15, choices=GATEWAY_CHOICES)
    transaction_id = models.CharField(max_length=200, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='PKR')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    gateway_response = models.JSONField(default=dict, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payment_transactions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.gateway.upper()} | {self.order.order_number} | {self.status}"
