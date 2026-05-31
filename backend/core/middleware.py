"""
DESIGN PATTERN: Chain of Responsibility (Django Middleware Pipeline)
MVC ROLE: Cross-cutting infrastructure — executes outside MVC layers,
          wrapping every request-response cycle regardless of which
          Controller handles it.

WHAT IS MIDDLEWARE IN DJANGO?
------------------------------
Each middleware class is a link in a processing chain. Django passes every
HTTP request through the chain top-to-bottom BEFORE reaching the view, then
passes the response through the same chain bottom-to-top on the way out.

  HTTP request
      ↓
  CorsMiddleware          ← adds CORS headers so React can call the API
  SecurityMiddleware      ← HTTPS redirects, HSTS, XSS protection
  WhiteNoiseMiddleware    ← serves static files efficiently
  ...
  RequestLoggingMiddleware ← THIS FILE: log method + path + status + ms
      ↓
  View (Controller) — processes the request, returns a response
      ↑
  (response bubbles back up through the same chain)

WHY MIDDLEWARE FOR LOGGING?
---------------------------
PROBLEM: If we added logging inside each view, we'd duplicate the same
four lines in every endpoint. That violates DRY and means forgetting to
add it to a new endpoint.

SOLUTION: Middleware runs unconditionally for EVERY request. One class,
zero duplication, zero chance of missing an endpoint.

CONFIGURED IN:
  config/settings/base.py → MIDDLEWARE list
  RequestLoggingMiddleware is placed last so it measures total request time
  including all other middleware overhead.

EXTENSIBILITY:
  To add rate-limiting, add a RateLimitMiddleware class and register it.
  To add per-request tracing (e.g. X-Request-ID header), add it here.
  Zero changes to any Controller (View) required.
"""
import time
import logging

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware:
    """
    Logs every incoming request with method, path, status code, and duration.
    Useful for debugging and performance monitoring.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()

        response = self.get_response(request)

        duration_ms = round((time.time() - start_time) * 1000, 2)
        logger.info(
            f"{request.method} {request.path} → {response.status_code} ({duration_ms}ms)"
        )

        return response
