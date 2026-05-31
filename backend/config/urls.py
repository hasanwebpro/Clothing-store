"""
MVC ROLE: URL Router — the single front-door that dispatches every incoming
          HTTP request to the correct app's Controller (View).
DESIGN PATTERN: Front Controller

WHAT IS THE FRONT CONTROLLER PATTERN?
---------------------------------------
All HTTP requests enter through one file (this file). The router examines
the URL path and delegates to the correct sub-router (each app's urls.py).
No request ever reaches a Controller without passing through here first.

This means:
  • ONE place to see every API endpoint in the project
  • ONE place to add global URL middleware or rate-limiting
  • URL changes affect ONLY this file and the relevant app's urls.py

URL VERSIONING (/api/v1/):
  The /api/v1/ prefix allows us to launch /api/v2/ later with breaking
  changes while the original v1 clients keep working. Mobile apps cached
  with an older version don't break on the day we refactor the API.

APP ROUTING STRUCTURE:
  /api/v1/auth/        → apps/users/urls.py         (authentication, profiles)
  /api/v1/products/    → apps/products/urls.py       (catalogue, search)
  /api/v1/inventory/   → apps/inventory/urls.py      (stock management)
  /api/v1/cart/        → apps/cart/urls.py           (shopping cart)
  /api/v1/orders/      → apps/orders/urls.py         (order lifecycle)
  /api/v1/payments/    → apps/payments/urls.py       (gateway integration)
  /api/v1/pricing/     → apps/pricing/urls.py        (coupons)
  /api/v1/notifications/ → apps/notifications/urls.py
  /api/v1/reviews/     → apps/reviews/urls.py        (product reviews)
  /api/v1/analytics/   → apps/analytics/urls.py      (dashboard data)
  /api/v1/newsletter/  → apps/newsletter/urls.py     (email subscriptions)
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import FileResponse, HttpResponse
import mimetypes
from pathlib import Path


def spa_fallback(request, *args, **kwargs):
    """Serve React's index.html for any route not matched by the API.
    Also serves actual files from the dist folder (favicon.svg, robots.txt, etc.)
    """
    dist = Path(settings.BASE_DIR).parent / 'frontend' / 'dist'

    # Serve actual static files that exist in dist root (favicon, robots.txt…)
    if request.path not in ('', '/'):
        candidate = dist / request.path.lstrip('/')
        if candidate.exists() and candidate.is_file():
            ct, _ = mimetypes.guess_type(str(candidate))
            return FileResponse(open(candidate, 'rb'), content_type=ct or 'application/octet-stream')

    index = dist / 'index.html'
    if not index.exists():
        return HttpResponse(
            '<h1>Frontend not built</h1><p>Run: <code>npm run build</code> in the frontend directory.</p>',
            status=503, content_type='text/html',
        )
    return FileResponse(open(index, 'rb'), content_type='text/html; charset=utf-8')

urlpatterns = [
    path('admin/', admin.site.urls),

    # API v1 — all app routes are namespaced under /api/v1/
    path('api/v1/auth/',          include('apps.users.urls')),
    path('api/v1/products/',      include('apps.products.urls')),
    path('api/v1/inventory/',     include('apps.inventory.urls')),
    path('api/v1/cart/',          include('apps.cart.urls')),
    path('api/v1/orders/',        include('apps.orders.urls')),
    path('api/v1/payments/',      include('apps.payments.urls')),
    path('api/v1/pricing/',       include('apps.pricing.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/reviews/',       include('apps.reviews.urls')),
    path('api/v1/analytics/',     include('apps.analytics.urls')),
    path('api/v1/newsletter/',    include('apps.newsletter.urls')),
    path('api/v1/wishlist/',      include('apps.users.wishlist_urls')),
]

# Serve media files in development (PA nginx handles this in production)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# ── SPA catch-all: must be LAST — serves React frontend for all non-API routes
urlpatterns += [
    re_path(r'^(?!api/|admin/|static/|media/|assets/).*$', spa_fallback),
]
