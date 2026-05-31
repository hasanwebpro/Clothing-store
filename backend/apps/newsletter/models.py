"""
MVC ROLE: MODEL — represents newsletter subscribers and their opt-in state.
DESIGN PATTERN: State Machine (active / unsubscribed)

GDPR-FRIENDLY DESIGN:
----------------------
We do NOT delete subscriber records when a user unsubscribes. Instead we
set is_active=False and record unsubscribed_at. This design is intentional:

  1. AUDIT TRAIL — if a user complains "you kept sending me emails after I
     unsubscribed", we have the exact timestamp they opted out.
  2. RE-SUBSCRIBE — if the same user subscribes again later, we restore
     their record (is_active=True, unsubscribed_at=None) rather than creating
     a duplicate email row (which the unique constraint would reject).
  3. ANALYTICS — we can report "N users have unsubscribed" without losing the data.

MODEL METHODS (State Transitions):
  unsubscribe() → is_active=False, unsubscribed_at=now
  resubscribe()  → is_active=True,  unsubscribed_at=None
  Using named methods makes the state transitions explicit and readable
  at the call site: subscriber.unsubscribe() vs subscriber.is_active=False; subscriber.save()

EMAIL UNIQUENESS:
  email is unique=True. One email = one subscriber record, ever.
  The view handles the "already subscribed" and "re-subscribe" cases
  by checking the is_active flag after get_or_create.
"""
from django.db import models
from django.utils import timezone


class Subscriber(models.Model):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'newsletter_subscribers'
        ordering = ['-subscribed_at']

    def __str__(self):
        return f"{self.email} ({'active' if self.is_active else 'unsubscribed'})"

    def unsubscribe(self):
        self.is_active = False
        self.unsubscribed_at = timezone.now()
        self.save(update_fields=['is_active', 'unsubscribed_at'])

    def resubscribe(self):
        self.is_active = True
        self.unsubscribed_at = None
        self.save(update_fields=['is_active', 'unsubscribed_at'])
