"""
MVC ROLE: SERIALIZER — the data contract layer between HTTP and the database.
DESIGN PATTERN: Data Transfer Object (DTO) via DRF Serializers

WHAT SERIALIZERS DO IN MVC:
----------------------------
In standard MVC the View layer both renders templates and prepares data.
In a REST API the "View" is split into two parts:
  Controller (DRF View)  → decides WHAT to do and which status code to return
  Serializer             → decides HOW the data looks going in and coming out

WHY SERIALIZERS INSTEAD OF RAW DICTS?
--------------------------------------
  1. VALIDATION  — `is_valid(raise_exception=True)` runs field-level and
                   cross-field validation before any business logic runs.
                   Example: RegisterSerializer checks password == password_confirm
                   BEFORE touching the database.

  2. SANITISATION — write_only=True fields (passwords) never appear in
                   response JSON even if the developer forgets to exclude them.

  3. SINGLE RESPONSIBILITY — changing the JSON shape means editing ONLY
                   this file, not hunting through view logic.

DESIGN PATTERN — DATA TRANSFER OBJECT (DTO):
  Each serializer class is a DTO: a lightweight object that moves data
  between the HTTP boundary (JSON) and the domain model (Django ORM).
  LoginSerializer doesn't save anything — it validates credentials and
  returns tokens. UpdateProfileSerializer validates only the fields the
  user is allowed to change, preventing mass-assignment vulnerabilities.

SECURITY BOUNDARY:
  All user input passes through a serializer before reaching business logic.
  This is the ONLY correct place to validate external data.
"""
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Address


class RegisterSerializer(serializers.ModelSerializer):
    """Validate + create a new customer account."""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'phone', 'password', 'password_confirm']

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone', ''),
            role='customer',
        )


class LoginSerializer(serializers.Serializer):
    """Validate credentials and return JWT tokens."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs['email'], password=attrs['password'])
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled.')
        attrs['user'] = user
        return attrs

    def get_tokens(self, user) -> dict:
        refresh = RefreshToken.for_user(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }


class UserProfileSerializer(serializers.ModelSerializer):
    """Public profile — never expose password."""
    full_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name',
                  'phone', 'role', 'avatar_url', 'date_joined']
        read_only_fields = ['id', 'email', 'role', 'date_joined']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'avatar']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match.'})
        return attrs

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Incorrect current password.')
        return value


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'label', 'street', 'city', 'province', 'postal_code', 'country', 'is_default']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class AdminUserSerializer(serializers.ModelSerializer):
    """For admin views — includes role field."""
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'phone',
                  'role', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined']
