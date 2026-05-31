"""Run seed_db only if the database is empty. Safe to call on every deploy."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from apps.products.models import Product

if Product.objects.exists():
    print('Database already seeded — skipping.')
else:
    print('Database empty — seeding...')
    from django.core.management import call_command
    call_command('seed_db', no_images=True)
    print('Seeding complete.')
