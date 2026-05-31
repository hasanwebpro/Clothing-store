"""
MVC ROLE: CONTROLLER — HTTP boundary for newsletter subscribe / unsubscribe.
DESIGN PATTERNS APPLIED:
  • Service-like Controller — these views are thin but contain the email
    sending logic inline (no separate service class) because the logic
    is simple enough that a service class would add indirection without value.
    Rule of thumb: extract to a Service when the same logic is needed
    in more than one place, or when there are more than ~3 steps.

  • Observer (future extension point) — the welcome email is currently sent
    inline. If we add SMS or Slack notifications for new subscribers, we
    should extract this to an EventBus event:
      EventBus.publish(Events.NEWSLETTER_SUBSCRIBED, {'email': email})
    For now the inline approach is simpler and sufficient.

IDEMPOTENCY DESIGN:
  SubscribeView handles three states gracefully:
    1. New subscriber   → create record, send welcome email, return 201
    2. Already active   → return 200 "already subscribed" (no duplicate email)
    3. Previously unsubscribed → reactivate record, send welcome email, return 200

  This idempotency means the frontend can call subscribe() safely even
  if the user accidentally double-clicks the subscribe button.

UNSUBSCRIBE VALIDATION:
  UnsubscribeSerializer validates that the email exists AND is active before
  the view calls unsubscribe(). The view never needs to check is_active
  itself — the serializer is the validation gate (SRP: one responsibility per layer).

PUBLIC ENDPOINTS (AllowAny):
  Both endpoints are public — email sign-up should not require a logged-in
  account. The email field is the only identifier needed.
"""
import logging
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from .models import Subscriber
from .serializers import SubscribeSerializer, UnsubscribeSerializer

logger = logging.getLogger(__name__)


class SubscribeView(APIView):
    """POST /api/v1/newsletter/subscribe/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        first_name = serializer.validated_data['first_name']

        subscriber, created = Subscriber.objects.get_or_create(
            email=email,
            defaults={'first_name': first_name, 'is_active': True},
        )

        if not created:
            if subscriber.is_active:
                return Response(
                    {'message': 'You are already subscribed to our newsletter.'},
                    status=status.HTTP_200_OK,
                )
            # Previously unsubscribed — reactivate
            subscriber.first_name = first_name or subscriber.first_name
            subscriber.resubscribe()

        try:
            self._send_welcome_email(email, first_name or 'there')
        except Exception as exc:
            logger.error(f"Email send failed for {email}: {exc}")
            return Response(
                {'message': 'Subscribed, but we could not send the welcome email. Check your spam folder or contact support.'},
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )

        return Response(
            {'message': 'Successfully subscribed! Check your inbox for a welcome email.'},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    WELCOME_COUPON = 'WELCOME15'

    def _send_welcome_email(self, email: str, name: str) -> None:
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        subject = 'Your 15% Off Coupon — Welcome to VOGUE!'
        text_body = (
            f"Hi {name},\n\n"
            f"Welcome to the VOGUE family!\n\n"
            f"Your exclusive coupon: {self.WELCOME_COUPON}\n"
            f"15% off your order — no minimum spend.\n\n"
            f"Apply it at checkout: {frontend_url}/products\n\n"
            f"Stay stylish,\n"
            f"The VOGUE Team\n\n"
            f"Unsubscribe: {frontend_url}/unsubscribe"
        )
        html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to VOGUE</title>
</head>
<body style="margin:0;padding:0;background:#f5f0ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(14,2,40,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#EC6EAD 0%,#c45fa0 30%,#7b5ea7 60%,#3494E6 100%);padding:40px 32px;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.75);">Premium Fashion Pakistan</p>
            <h1 style="margin:0;font-size:36px;font-weight:900;color:#ffffff;letter-spacing:-1px;">VOGUE</h1>
            <p style="margin:16px 0 0;font-size:16px;color:rgba(255,255,255,0.9);">Welcome to the family, {name}!</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 32px;text-align:center;">
            <p style="margin:0 0 8px;font-size:14px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Your exclusive welcome gift</p>
            <h2 style="margin:0 0 24px;font-size:22px;color:#111827;font-weight:700;">15% Off Your First Order</h2>

            <!-- Coupon box -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <div style="display:inline-block;background:linear-gradient(135deg,#f5f0ff,#ffe0f0);border:2px dashed #c45fa0;border-radius:16px;padding:28px 40px;margin-bottom:28px;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#7b5ea7;">Coupon Code</p>
                  <p style="margin:0;font-size:32px;font-weight:900;letter-spacing:6px;color:#c45fa0;font-family:monospace;">{self.WELCOME_COUPON}</p>
                  <p style="margin:10px 0 0;font-size:13px;color:#6b7280;">No minimum order &nbsp;·&nbsp; No expiry</p>
                </div>
              </td></tr>
            </table>

            <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6;">
              Enter the code at checkout to save <strong style="color:#c45fa0;">15%</strong> on anything in our store.
              From lawn suits to accessories — your discount applies to everything.
            </p>

            <!-- CTA Button -->
            <a href="{frontend_url}/products"
               style="display:inline-block;background:linear-gradient(135deg,#c45fa0,#7b5ea7);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.5px;">
              Shop Now &rarr;
            </a>
          </td>
        </tr>

        <!-- Perks -->
        <tr>
          <td style="background:#faf5ff;border-top:1px solid #f3e8ff;padding:28px 32px;">
            <p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7b5ea7;text-align:center;">As a subscriber you also get</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="33%" style="text-align:center;padding:0 8px;">
                  <p style="margin:0 0 4px;font-size:20px;">&#127381;</p>
                  <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">Early Access</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">New arrivals first</p>
                </td>
                <td width="33%" style="text-align:center;padding:0 8px;">
                  <p style="margin:0 0 4px;font-size:20px;">&#9889;</p>
                  <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">Flash Sales</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Members-only deals</p>
                </td>
                <td width="33%" style="text-align:center;padding:0 8px;">
                  <p style="margin:0 0 4px;font-size:20px;">&#127775;</p>
                  <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">Style Guides</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Weekly inspiration</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px;text-align:center;border-top:1px solid #f3f4f6;">
            <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
              Questions? Reply to this email or WhatsApp us at <strong>+92 300 1234567</strong>
            </p>
            <p style="margin:0;font-size:12px;color:#d1d5db;">
              <a href="{frontend_url}/unsubscribe" style="color:#d1d5db;">Unsubscribe</a>
              &nbsp;&middot;&nbsp; VOGUE Pakistan &nbsp;&middot;&nbsp; Free delivery over PKR 2,000
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email],
            )
            msg.attach_alternative(html_body, 'text/html')
            msg.send(fail_silently=False)
            logger.info(f"Newsletter welcome email sent to {email}")
        except Exception as exc:
            logger.error(f"Failed to send newsletter welcome email to {email}: {exc}")
            raise  # re-raise so the view can return an error response


class UnsubscribeView(APIView):
    """POST /api/v1/newsletter/unsubscribe/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UnsubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        subscriber = Subscriber.objects.filter(email=email, is_active=True).first()
        if not subscriber:
            return Response({'message': 'Email not found.'}, status=status.HTTP_404_NOT_FOUND)
        subscriber.unsubscribe()

        return Response(
            {'message': 'You have been unsubscribed from our newsletter.'},
            status=status.HTTP_200_OK,
        )
