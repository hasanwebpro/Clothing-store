"""
Production settings for PythonAnywhere deployment.
"""
import os
from .base import *  # noqa
from decouple import config

DEBUG = False

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')

# ── PythonAnywhere proxy ──────────────────────────────────────────────────────
# PA runs Django behind nginx — trust the forwarded protocol header
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT     = False   # nginx handles HTTP→HTTPS; enabling this causes loops
SESSION_COOKIE_SECURE   = True
CSRF_COOKIE_SECURE      = True
CSRF_TRUSTED_ORIGINS    = config('CSRF_TRUSTED_ORIGINS', default='').split(',')

# ── Security headers ──────────────────────────────────────────────────────────
SECURE_HSTS_SECONDS            = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_BROWSER_XSS_FILTER      = True
SECURE_CONTENT_TYPE_NOSNIFF    = True

# ── Static files (WhiteNoise serves Django admin + DRF CSS) ──────────────────
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ── Templates: let Django find React's built index.html ───────────────────────
FRONTEND_DIST = BASE_DIR / 'frontend_dist'
TEMPLATES[0]['DIRS'] = [str(FRONTEND_DIST)]

# ── Logging: write to backend directory (writable on PA) ─────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'simple': {
            'format': '[{levelname}] {asctime} {module}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'django.log'),
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['file'],
        'level': 'WARNING',
    },
}
