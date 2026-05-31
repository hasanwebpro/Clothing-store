"""
MVC ROLE: SERIALIZER — validates newsletter subscription input.
DESIGN PATTERN: Input Validation Gate (write-only serializers)

Both serializers are write-only input validators — they do NOT inherit
from ModelSerializer because we never serialize Subscriber instances to JSON.
The API response is always a plain {'message': '...'} dict, not subscriber data.

SubscribeSerializer:
  Normalises email to lowercase (validate_email) so "USER@Gmail.com" and
  "user@gmail.com" are treated as the same subscriber, consistent with the
  unique=True constraint on Subscriber.email.

UnsubscribeSerializer:
  Validates the email is a known active subscriber BEFORE the view calls
  unsubscribe(). This puts the business rule in the serializer layer where
  it belongs — the view trusts the serializer's validated_data and calls
  subscriber.unsubscribe() without any additional checks.
"""
from rest_framework import serializers
from .models import Subscriber


class SubscribeSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')

    def validate_email(self, value):
        return value.lower().strip()


class UnsubscribeSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower().strip()

    def validate(self, attrs):
        email = attrs['email']
        if not Subscriber.objects.filter(email=email, is_active=True).exists():
            raise serializers.ValidationError({'email': 'This email is not subscribed.'})
        return attrs
