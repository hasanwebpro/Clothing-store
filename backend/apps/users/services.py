"""
MVC ROLE: SERVICE LAYER — business logic between Controller and Repository.
DESIGN PATTERN: Service Layer (also called Application Service)

WHAT THE SERVICE LAYER IS:
---------------------------
In a pure MVC pattern the Controller (View) calls the Model directly.
This works for simple CRUD but breaks down when one action triggers
multiple steps across multiple models.

EXAMPLE WITHOUT SERVICE LAYER:
  LoginView would have to: authenticate the user, generate access token,
  generate refresh token, set httpOnly cookie, return user data. That's
  5 responsibilities in one view — a "fat controller" anti-pattern.

EXAMPLE WITH SERVICE LAYER:
  LoginView calls AuthService.login(user) → gets back tokens + user dict.
  The view's only job is to receive the dict and return an HTTP response.
  Zero JWT knowledge in the view. Zero view knowledge in the service.

DESIGN PATTERN — SERVICE LAYER:
  AuthService is the single entry point for authentication operations.
  It orchestrates multiple steps (token generation, email sending) and
  hides that complexity from the Controller. If we switch from JWT to
  session tokens tomorrow, ONLY this file changes.

PASSWORD RESET SECURITY:
  send_password_reset_email() uses email enumeration protection:
  "If an account with that email exists, a reset link has been sent."
  We never confirm whether an email exists in our system — attackers
  cannot use the endpoint to discover registered emails.

  The reset token is a short-lived JWT access token (15 min by default)
  embedded as a URL query param. The confirm endpoint decodes it to
  identify the user, then sets the new password.

CONFIGURED BY:
  views.py imports AuthService and delegates all auth logic to it.
  The Repository (UserRepository) handles all raw DB queries.
"""
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from .repositories import UserRepository

User = get_user_model()
user_repo = UserRepository()


class AuthService:
    """Handles login, logout, token management."""

    @staticmethod
    def login(user) -> dict:
        refresh = RefreshToken.for_user(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': user.get_full_name(),
                'role': user.role,
            },
        }

    @staticmethod
    def logout(refresh_token: str) -> None:
        """Blacklist the refresh token so it can't be reused."""
        token = RefreshToken(refresh_token)
        token.blacklist()

    @staticmethod
    def send_password_reset_email(email: str) -> None:
        try:
            user = user_repo.get_by_email(email)
            token = RefreshToken.for_user(user)
            reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token.access_token}"
            send_mail(
                subject='Password Reset — Clothing Store',
                message=f'Click the link to reset your password: {reset_link}',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
        except User.DoesNotExist:
            # Don't reveal whether email exists — security best practice
            pass
