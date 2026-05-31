import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.pricing.models import Coupon
from django.utils import timezone
from datetime import timedelta

code = 'WELCOME15'
existing = Coupon.objects.filter(code=code).first()
if existing:
    print(f"Already exists: {existing} (active={existing.is_active})")
else:
    c = Coupon.objects.create(
        code=code,
        type='percentage',
        value=15,
        min_order_value=0,
        valid_from=timezone.now(),
        valid_until=timezone.now() + timedelta(days=1825),
        is_active=True,
    )
    print(f"WELCOME15 coupon created! ID={c.id}, valid until {c.valid_until.date()}")
