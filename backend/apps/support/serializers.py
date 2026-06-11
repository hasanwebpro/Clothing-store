"""
MVC ROLE: SERIALIZER — shapes SupportTicket data for the API.
DESIGN PATTERN: Separate Read vs Write serializers (DTO)

WHY THREE SERIALIZERS?
-----------------------
SupportTicketSerializer  — read DTO for the admin inbox (GET). Exposes the
  human-readable *_display fields plus status/admin_reply so staff can triage.
CreateTicketSerializer   — write-only validator for public submissions (POST).
  It deliberately does NOT accept `status` or `admin_reply`, so a visitor can
  never open a ticket as "resolved" or inject a staff reply. This is the
  validation gate (SRP: one responsibility per layer).
ResolveTicketSerializer  — write-only validator for the staff PATCH that moves
  a ticket through its status workflow and attaches a reply.

This Read/Write split is the same pattern used across the project
(see orders/serializers.py) — it keeps input surface minimal and secure.
"""
from rest_framework import serializers
from .models import SupportTicket


class SupportTicketSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            'id', 'kind', 'kind_display', 'name', 'email', 'subject', 'message',
            'rating', 'status', 'status_display', 'admin_reply', 'created_at',
        ]
        read_only_fields = ['status', 'admin_reply', 'created_at']


class CreateTicketSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=['contact', 'feedback'], default='contact')
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    subject = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    message = serializers.CharField()
    rating = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)


class ResolveTicketSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['open', 'in_progress', 'resolved'])
    admin_reply = serializers.CharField(required=False, allow_blank=True, default='')
