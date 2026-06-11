"""
Pattern   : Repository  (Data Access — Fowler, PEAA)
------------------------------------------------------
What it does : UserRepository and AddressRepository are the only places that
               query User and Address models. Views never call
               User.objects.xxx() directly — they always go through here.

Why we used it: Spreading ORM calls across views creates tight coupling between
               the HTTP layer and the database schema. A field rename or an
               auth-backend swap would require hunting through every view.

Why preferred : The Repository is the Data Access Layer in MVC. Swapping the
               auth backend tomorrow means changing only this file. Views stay
               clean and focused on HTTP, not database mechanics.
"""
from django.contrib.auth import get_user_model
from .models import Address

User = get_user_model()


class UserRepository:
    """Repository for User entities.

    PATTERN: Repository — abstracts all User queries behind a clean interface.
    Views call get_all() / deactivate() etc. and never touch ORM internals.
    Benefit: if we swap the auth backend tomorrow, only this file changes.
    """

    def get_by_id(self, user_id: int):
        return User.objects.get(pk=user_id, is_active=True)

    def get_by_email(self, email: str):
        return User.objects.get(email__iexact=email, is_active=True)

    def get_all(self):
        """Admin-facing: return EVERY user (including soft-deactivated ones)
        so admin pages can re-activate them. Use `get_active()` to filter."""
        return User.objects.all().order_by('-date_joined')

    def get_active(self):
        return User.objects.filter(is_active=True).order_by('-date_joined')

    def get_by_role(self, role: str):
        return User.objects.filter(role=role, is_active=True)

    def email_exists(self, email: str) -> bool:
        return User.objects.filter(email__iexact=email).exists()

    def deactivate(self, user_id: int) -> None:
        User.objects.filter(pk=user_id).update(is_active=False)

    def activate(self, user_id: int) -> None:
        User.objects.filter(pk=user_id).update(is_active=True)

    def update_role(self, user_id: int, role: str) -> None:
        User.objects.filter(pk=user_id).update(role=role)


class AddressRepository:
    def get_user_addresses(self, user_id: int):
        return Address.objects.filter(user_id=user_id, is_deleted=False)

    def get_default(self, user_id: int):
        return Address.objects.filter(user_id=user_id, is_default=True, is_deleted=False).first()

    def get_by_id(self, address_id: int, user_id: int):
        return Address.objects.get(pk=address_id, user_id=user_id, is_deleted=False)

    def create(self, user_id: int, data: dict) -> Address:
        return Address.objects.create(user_id=user_id, **data)

    def soft_delete(self, address_id: int, user_id: int) -> None:
        Address.objects.filter(pk=address_id, user_id=user_id).update(
            is_deleted=True, is_default=False
        )
