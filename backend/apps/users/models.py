"""
MVC ROLE: MODEL — represents User and Address entities in the database.
DESIGN PATTERNS APPLIED: Custom Manager Pattern, RBAC data model

WHY A CUSTOM USER MODEL?
------------------------
Django ships with a User model that uses 'username' as the primary login
field. E-commerce platforms almost universally use email for login.
Swapping to email after the first migration is notoriously painful (FK
rewrites, data migrations, third-party lib conflicts).

SOLUTION: We define our own User before running ANY migration by pointing
AUTH_USER_MODEL = 'users.User' in settings. Django then uses our model
everywhere it would have used the default one.

KEY CUSTOMISATIONS:
  1. USERNAME_FIELD = 'email'  → login with email, not username
  2. role field                → drives RBAC (admin / seller / customer)
  3. REQUIRED_FIELDS           → first_name + last_name required at creation

DESIGN PATTERN — CUSTOM MANAGER:
  UserManager overrides create_user() and create_superuser() to normalise
  the email (lowercase domain) and auto-assign the admin role for superusers.
  This is the Manager pattern: it encapsulates "how to create a User"
  so callers never duplicate that logic.

MVC DATA INTEGRITY — ADDRESS MODEL:
  Address.save() overrides the default to enforce at most one is_default=True
  per user. This is a business rule that belongs at the Model layer, not in
  the Controller (View), so it is enforced regardless of which code path
  saves an address (API, admin panel, management command).

RBAC INTEGRATION:
  The 'role' field is the single source of truth for access control.
  core/permissions.py reads request.user.role to gate every endpoint.
  Convenience properties (is_admin, is_seller, is_customer) let service
  layer code read the role without string comparison.

DATABASE TABLE: 'users' (set explicitly to avoid Django's default 'users_user')
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """
    Custom manager that uses EMAIL instead of username for authentication.
    """
    def create_user(self, email: str, password: str, **extra_fields):
        if not email:
            raise ValueError('Email is required.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # Hashes with bcrypt automatically
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields):
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model.
    MVC Role: MODEL — represents a user entity in the database.

    RBAC Roles:
      admin   → full platform access
      seller  → manage products and inventory
      customer → shop, order, review
    """
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('seller', 'Seller'),
        ('customer', 'Customer'),
    ]

    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='customer', db_index=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'email'   # Login with email, not username
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        db_table = 'users'
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.get_full_name()} <{self.email}>"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_seller(self):
        return self.role == 'seller'

    @property
    def is_customer(self):
        return self.role == 'customer'


class Address(models.Model):
    """
    Customer shipping address.
    A user can have multiple addresses; one marked as default.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    label = models.CharField(max_length=50, blank=True, default='Home')
    street = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, default='Pakistan')
    is_default = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'addresses'
        verbose_name_plural = 'addresses'

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.label}: {self.street}, {self.city}"

    def save(self, *args, **kwargs):
        # If this address is set as default, unset all other defaults for this user
        if self.is_default:
            Address.objects.filter(user=self.user, is_default=True).update(is_default=False)
        super().save(*args, **kwargs)


class WishlistItem(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist')
    product = models.ForeignKey(
        'products.Product', on_delete=models.CASCADE, related_name='wishlisted_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'wishlist_items'
        unique_together = [('user', 'product')]
        ordering = ['-created_at']
