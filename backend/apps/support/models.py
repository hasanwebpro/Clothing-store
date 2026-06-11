"""
MVC ROLE: MODEL — customer support tickets and product/service feedback.

ONE MODEL, TWO USE CASES:
  A SupportTicket carries a `kind` discriminator:
    • 'contact'  → "Contact Customer Support" use case (subject + message)
    • 'feedback' → "Submit Feedback" use case (adds an optional 1–5 rating)

  Keeping both in one table (rather than two near-identical models) is a
  deliberate simplification — they share every field except `rating`, and
  the admin reviews them from a single inbox.

GUEST-FRIENDLY:
  `user` is nullable so visitors who are not logged in can still contact
  support / leave feedback. We always capture name + email so staff can reply.
"""
from django.db import models
from django.conf import settings


class SupportTicket(models.Model):
    KIND_CHOICES = [
        ('contact',  'Contact Support'),
        ('feedback', 'Feedback'),
    ]
    STATUS_CHOICES = [
        ('open',        'Open'),
        ('in_progress', 'In Progress'),
        ('resolved',    'Resolved'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='support_tickets',
    )
    kind = models.CharField(max_length=10, choices=KIND_CHOICES, default='contact')
    name = models.CharField(max_length=120)
    email = models.EmailField()
    subject = models.CharField(max_length=200, blank=True)
    message = models.TextField()
    rating = models.PositiveSmallIntegerField(null=True, blank=True)  # feedback only (1–5)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='open', db_index=True)
    admin_reply = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'support_tickets'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_kind_display()}] {self.subject or self.message[:40]} ({self.status})"
