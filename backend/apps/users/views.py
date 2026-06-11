"""
MVC ROLE: CONTROLLER — the thin HTTP boundary layer.
DESIGN PATTERNS APPLIED:
  • Service Layer   — all business logic delegated to AuthService
  • Repository      — all DB queries delegated to UserRepository / AddressRepository
  • Strategy        — CookieTokenRefreshView overrides the JWT refresh strategy
                      to read the token from an httpOnly cookie instead of a header

CONTROLLER RESPONSIBILITY:
---------------------------
Each view class has ONE job: receive an HTTP request, call the right
service/repository, and return the right HTTP response. If a view method
exceeds ~20 lines it's a sign business logic has leaked into the controller.

HOW THE LAYERED ARCHITECTURE FLOWS:
  HTTP Request
      ↓
  View (Controller) — parses and validates request via Serializer
      ↓
  AuthService / UserRepository — executes business rules and DB queries
      ↓
  Django ORM (Model)
      ↑
  View builds HTTP Response from service return value

PATTERN — HTTPONLY COOKIE FOR REFRESH TOKENS:
  Standard JWT: both access + refresh tokens in the response body.
    Risk: JavaScript can read the refresh token → XSS can steal it.
  Our approach: access token in the response body (needed by React),
  refresh token in a httpOnly cookie (invisible to JavaScript).
  CookieTokenRefreshView extends DRF's TokenRefreshView to read the
  refresh token from the cookie instead of the request body.

PATTERN — PASSWORD RESET TOKEN SECURITY:
  PasswordResetConfirmView decodes the JWT access token embedded in the
  reset URL to identify the user. It does NOT require the user to be
  logged in — the token itself proves identity. The 15-minute expiry
  is the security window for the reset link.

RBAC ENFORCEMENT:
  All endpoints that modify sensitive data declare permission_classes.
  IsAdmin, IsSeller, IsOwnerOrAdmin are imported from core/permissions.py
  and applied declaratively — the controller does not repeat role checks inline.
"""
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings
from core.permissions import IsAdmin, IsOwnerOrAdmin
from .serializers import (
    RegisterSerializer, LoginSerializer, UserProfileSerializer,
    UpdateProfileSerializer, ChangePasswordSerializer, AddressSerializer,
    AdminUserSerializer,
)
from .services import AuthService
from .repositories import UserRepository, AddressRepository

user_repo = UserRepository()
address_repo = AddressRepository()


class RegisterView(APIView):
    """POST /api/v1/auth/register/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = AuthService.login(user)
        return Response({
            'message': 'Account created successfully.',
            **tokens,
        }, status=status.HTTP_201_CREATED)


REFRESH_COOKIE = 'refresh_token'
COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days — matches SIMPLE_JWT REFRESH_TOKEN_LIFETIME


def _set_refresh_cookie(response, refresh_token: str) -> None:
    """Attach the refresh token as an httpOnly, SameSite=Lax cookie."""
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,             # JS cannot read this — XSS-safe
        samesite='Lax',            # Sent on same-site + top-level navigations; blocks CSRF
        secure=not settings.DEBUG, # HTTPS-only in production
        path='/',
    )


def _clear_refresh_cookie(response) -> None:
    response.delete_cookie(REFRESH_COOKIE, path='/')


class LoginView(APIView):
    """POST /api/v1/auth/login/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        tokens = AuthService.login(user)
        response = Response(
            {'access': tokens['access'], 'user': tokens['user']},
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, tokens['refresh'])
        return response


class CookieTokenRefreshView(APIView):
    """
    POST /api/v1/auth/refresh/

    Reads the refresh token from the httpOnly cookie, delegates to
    simplejwt's TokenRefreshSerializer (handles rotation + blacklisting),
    sets the rotated refresh cookie, and returns the new access token.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from rest_framework_simplejwt.serializers import TokenRefreshSerializer

        refresh_token = request.COOKIES.get(REFRESH_COOKIE)
        if not refresh_token:
            return Response(
                {'message': 'No session found. Please log in.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = TokenRefreshSerializer(data={'refresh': refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            response = Response(
                {'message': 'Session expired. Please log in again.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            _clear_refresh_cookie(response)
            return response

        new_access  = serializer.validated_data['access']
        # simplejwt returns a new refresh token when ROTATE_REFRESH_TOKENS=True
        new_refresh = serializer.validated_data.get('refresh', refresh_token)

        # Decode the new access token to get the user_id, then fetch the user
        # profile. This lets the frontend restore full session state even when
        # localStorage was cleared (e.g. browser closed with privacy settings).
        from rest_framework_simplejwt.tokens import AccessToken as _AT
        from .serializers import UserProfileSerializer
        from django.contrib.auth import get_user_model
        try:
            decoded = _AT(str(new_access))
            user = get_user_model().objects.get(pk=decoded['user_id'])
            user_data = UserProfileSerializer(user, context={'request': request}).data
        except Exception:
            user_data = None

        response = Response(
            {'access': str(new_access), 'user': user_data},
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, str(new_refresh))
        return response


class LogoutView(APIView):
    """POST /api/v1/auth/logout/"""
    permission_classes = [AllowAny]  # Must work even with expired access token

    def post(self, request):
        refresh_token = request.COOKIES.get(REFRESH_COOKIE)
        if refresh_token:
            try:
                AuthService.logout(refresh_token)
            except Exception:
                pass  # Already expired — fine, just clear the cookie
        response = Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        _clear_refresh_cookie(response)
        return response


class ProfileView(APIView):
    """GET/PATCH /api/v1/auth/profile/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = UpdateProfileSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserProfileSerializer(request.user, context={'request': request}).data)


class ChangePasswordView(APIView):
    """POST /api/v1/auth/change-password/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'message': 'Password changed successfully.'})


class PasswordResetRequestView(APIView):
    """POST /api/v1/auth/password-reset/"""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        AuthService.send_password_reset_email(email)
        return Response({
            'message': 'If an account with that email exists, a reset link has been sent.'
        })


class PasswordResetConfirmView(APIView):
    """POST /api/v1/auth/password-reset-confirm/"""
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get('token', '').strip()
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not token_str:
            return Response({'error': 'Reset token is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not new_password:
            return Response({'error': 'new_password is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        if new_password != confirm_password:
            return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from django.contrib.auth import get_user_model
            token = AccessToken(token_str)
            user_id = token['user_id']
            user = get_user_model().objects.get(id=user_id)
        except (TokenError, InvalidToken):
            return Response({'error': 'Reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'error': 'Reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'message': 'Password reset successfully. You can now log in.'})


# ─────────────────────────────────────────────────────────────────────────────
# Address views
# ─────────────────────────────────────────────────────────────────────────────

class AddressListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/auth/addresses/"""
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return address_repo.get_user_addresses(self.request.user.id)


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/auth/addresses/{id}/"""
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        return address_repo.get_user_addresses(self.request.user.id)

    def perform_destroy(self, instance):
        # Soft-delete so existing orders retain their shipping_address FK.
        # Hard-delete would raise ProtectedError for any address used in an order.
        address_repo.soft_delete(instance.pk, self.request.user.id)


# ─────────────────────────────────────────────────────────────────────────────
# Admin user management
# ─────────────────────────────────────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    """GET /api/v1/auth/users/  [Admin only]"""
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return user_repo.get_all()


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/users/{id}/  [Admin only]"""
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return user_repo.get_all()

    def perform_destroy(self, instance):
        user_repo.deactivate(instance.id)


class GoogleAuthView(APIView):
    """POST /api/v1/auth/google/  — verify Google ID token, return JWT"""
    permission_classes = [AllowAny]

    def post(self, request):
        credential = request.data.get('credential')
        if not credential:
            return Response({'message': 'Google credential is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            info = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except ValueError as e:
            return Response({'message': f'Invalid Google token: {e}'}, status=status.HTTP_400_BAD_REQUEST)

        email      = info.get('email', '')
        first_name = info.get('given_name', '')
        last_name  = info.get('family_name', '')

        if not email:
            return Response({'message': 'Google account has no email.'}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name': first_name,
                'last_name':  last_name,
                'role':       'customer',
                'is_active':  True,
            },
        )
        # Keep name in sync if user already existed
        if not created:
            updated = False
            if first_name and not user.first_name:
                user.first_name = first_name; updated = True
            if last_name and not user.last_name:
                user.last_name  = last_name;  updated = True
            if updated:
                user.save(update_fields=['first_name', 'last_name'])

        tokens = AuthService.login(user)
        response = Response(
            {'access': tokens['access'], 'user': tokens['user']},
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, tokens['refresh'])
        return response
