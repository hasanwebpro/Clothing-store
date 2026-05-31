"""
DESIGN PATTERN: Custom Exception Hierarchy + Consistent Error Envelope
MVC ROLE: Cross-cutting infrastructure — standardises every error response
          produced by any Controller (View) in the project.

TWO RESPONSIBILITIES IN THIS FILE:
-----------------------------------
1. CUSTOM EXCEPTION HANDLER (custom_exception_handler)
   DRF calls this function whenever any exception bubbles up from a view.
   We intercept it and wrap every response in a predictable envelope:
     { "error": true, "code": "not_found", "message": "...", "details": {} }

   WHY THIS MATTERS FOR MVC:
   The Controller (View) just raises an exception. This handler is the single
   place that decides how errors look in the API response. The React frontend
   can now write ONE error-handling utility instead of guessing the shape of
   each endpoint's errors.

2. DOMAIN EXCEPTION CLASSES (BusinessLogicError and subclasses)
   PATTERN: Exception hierarchy — business errors are typed so callers
   can catch them specifically rather than catching generic Exception.

   BusinessLogicError       ← base: any rule violation
     InsufficientStockError ← variant X has only N units left
     InvalidCouponError     ← coupon expired / not found / limit reached
     PaymentFailedError     ← gateway declined / network error

   HOW THEY TRAVEL THROUGH MVC:
     Service (OrderService) → raises InsufficientStockError
     Controller (PlaceOrderView) → catches it, returns 400 with the message
     Frontend → reads .message, shows toast to the user

   BENEFIT OF TYPED EXCEPTIONS:
   A view that catches InsufficientStockError knows EXACTLY what happened
   and can return a tailored response. Catching bare Exception would lose
   that context and produce generic 500 errors.

CONFIGURED IN:
  config/settings/base.py → REST_FRAMEWORK['EXCEPTION_HANDLER']
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Called by DRF whenever an exception bubbles up from a view.
    We wrap the response in a consistent envelope.
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            'error': True,
            'code': _get_error_code(response.status_code),
            'message': _extract_message(response.data),
            'details': response.data,
        }
        response.data = error_data
    else:
        # Unhandled exception (500)
        logger.exception(f"Unhandled exception in {context.get('view')}: {exc}")
        response = Response(
            {
                'error': True,
                'code': 'internal_server_error',
                'message': 'An unexpected error occurred. Please try again.',
                'details': {},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response


def _get_error_code(status_code: int) -> str:
    codes = {
        400: 'bad_request',
        401: 'unauthorized',
        403: 'forbidden',
        404: 'not_found',
        405: 'method_not_allowed',
        409: 'conflict',
        422: 'validation_error',
        429: 'too_many_requests',
        500: 'internal_server_error',
    }
    return codes.get(status_code, 'error')


def _extract_message(data) -> str:
    if isinstance(data, str):
        return data
    if isinstance(data, dict):
        for key in ('detail', 'message', 'non_field_errors'):
            if key in data:
                val = data[key]
                if isinstance(val, list):
                    return str(val[0])
                return str(val)
        # Return first field error
        first_val = next(iter(data.values()), '')
        if isinstance(first_val, list):
            return str(first_val[0])
        return str(first_val)
    if isinstance(data, list) and data:
        return str(data[0])
    return 'An error occurred.'


# ─────────────────────────────────────────────────────────────────────────────
# Custom exception classes for use in services
# ─────────────────────────────────────────────────────────────────────────────
class BusinessLogicError(Exception):
    """Raised when a business rule is violated (e.g., out of stock)."""
    def __init__(self, message: str, code: str = 'business_logic_error'):
        self.message = message
        self.code = code
        super().__init__(message)


class InsufficientStockError(BusinessLogicError):
    def __init__(self, variant_sku: str, requested: int, available: int):
        super().__init__(
            f"Insufficient stock for {variant_sku}: requested {requested}, available {available}",
            code='insufficient_stock',
        )
        self.variant_sku = variant_sku
        self.requested = requested
        self.available = available


class InvalidCouponError(BusinessLogicError):
    def __init__(self, reason: str):
        super().__init__(f"Invalid coupon: {reason}", code='invalid_coupon')


class PaymentFailedError(BusinessLogicError):
    def __init__(self, gateway: str, message: str):
        super().__init__(f"Payment failed via {gateway}: {message}", code='payment_failed')
        self.gateway = gateway
