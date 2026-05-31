"""
MVC ROLE: SERIALIZER — shapes Notification data for the frontend bell dropdown.
DESIGN PATTERN: Minimal exposure serializer

WHY ALMOST ALL FIELDS ARE READ-ONLY:
  Notifications are created by the system (InAppNotificationObserver),
  not by users. The only field a user may change via the API is is_read.
  Making type, title, body, created_at read_only prevents a user from
  POSTing to MarkNotificationReadView and accidentally altering
  the notification content.

  The serializer's job here is pure transformation: Model → JSON dict.
  No validation is needed on reads; no complex field logic is needed.
"""
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'body', 'is_read', 'created_at']
        read_only_fields = ['id', 'type', 'title', 'body', 'created_at']
