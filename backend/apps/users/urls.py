from django.urls import path
from . import views

urlpatterns = [
    path('register/',        views.RegisterView.as_view(),             name='auth-register'),
    path('login/',           views.LoginView.as_view(),                name='auth-login'),
    path('logout/',          views.LogoutView.as_view(),               name='auth-logout'),
    path('refresh/',         views.CookieTokenRefreshView.as_view(),   name='auth-refresh'),
    path('profile/',         views.ProfileView.as_view(),              name='auth-profile'),
    path('change-password/', views.ChangePasswordView.as_view(),       name='auth-change-password'),
    path('password-reset/',          views.PasswordResetRequestView.as_view(),  name='auth-password-reset'),
    path('password-reset-confirm/',  views.PasswordResetConfirmView.as_view(),  name='auth-password-reset-confirm'),

    # Addresses
    path('addresses/',          views.AddressListCreateView.as_view(), name='address-list'),
    path('addresses/<int:pk>/', views.AddressDetailView.as_view(),     name='address-detail'),

    # Google OAuth
    path('google/',          views.GoogleAuthView.as_view(),           name='auth-google'),

    # Admin
    path('users/',           views.AdminUserListView.as_view(),        name='admin-user-list'),
    path('users/<int:pk>/',  views.AdminUserDetailView.as_view(),      name='admin-user-detail'),
]
