"""
Base settings shared across all environments.
SDA Note: Splitting settings into base/development/production is a best practice
that prevents accidentally using dev settings in production (e.g., DEBUG=True).
"""
import pymysql
pymysql.install_as_MySQLdb()
import os
from pathlib import Path
from datetime import timedelta
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('SECRET_KEY')

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
]

LOCAL_APPS = [
    'apps.users',
    'apps.products',
    'apps.inventory',
    'apps.cart',
    'apps.orders',
    'apps.payments',
    'apps.pricing',
    'apps.notifications',
    'apps.reviews',
    'apps.analytics',
    'apps.newsletter',
    'apps.support',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middleware.RequestLoggingMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': config('DB_NAME', default='clothing_store'),
        'USER': config('DB_USER', default='root'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='127.0.0.1'),
        'PORT': config('DB_PORT', default='3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

AUTH_USER_MODEL = 'users.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Karachi'
USE_I18N = True
USE_TZ = True

STATIC_URL = config('STATIC_URL', default='/static/')
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = config('MEDIA_URL', default='/media/')
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─────────────────────────────────────────────────────────────
# Cache — file-based, zero extra dependencies
# Stores snapshots in BASE_DIR/.cache/ so they survive server
# restarts. Upgrade to Redis in production by changing BACKEND
# and adding LOCATION — no other code changes needed.
# ─────────────────────────────────────────────────────────────
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
        'LOCATION': BASE_DIR / '.cache',
        'TIMEOUT': 600,          # default TTL: 10 minutes
        'OPTIONS': {
            'MAX_ENTRIES': 1000,
        },
    }
}

# ─────────────────────────────────────────────────────────────
# Django REST Framework
# SDA Note: DRF is the "Controller + Serializer" layer in our MVC.
# ─────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardResultsPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
}

# ─────────────────────────────────────────────────────────────
# JWT Configuration
# SDA Note: Access tokens expire quickly (15 min) for security.
# Refresh tokens last longer (7 days) and are stored server-side
# so we can revoke them on logout (token blacklist).
# ─────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=config('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', default=15, cast=int)
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=config('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=7, cast=int)
    ),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ─────────────────────────────────────────────────────────────
# CORS — allows the React frontend to call Django APIs
# ─────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000'
).split(',')
CORS_ALLOW_CREDENTIALS = True

# Email
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='no-reply@clothingstore.com')

# Payment gateways
EASYPAISA_STORE_ID        = config('EASYPAISA_STORE_ID', default='')
EASYPAISA_HASH_KEY        = config('EASYPAISA_HASH_KEY', default='')
EASYPAISA_MERCHANT_PHONE  = config('EASYPAISA_MERCHANT_PHONE', default='+923092584328')

# Google OAuth
GOOGLE_CLIENT_ID = config('GOOGLE_CLIENT_ID', default='')

# Frontend URL — used in email links (password reset, etc.)
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')
