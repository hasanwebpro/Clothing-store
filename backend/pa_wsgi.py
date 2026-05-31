# ── PythonAnywhere WSGI configuration ────────────────────────────────────────
# Paste this entire file into the WSGI configuration file in PythonAnywhere's
# Web tab → WSGI configuration file link.
#
# Replace /home/YOUR_PA_USERNAME/vogue with your actual path.
# ─────────────────────────────────────────────────────────────────────────────
import sys
import os

# Add the project's backend directory to Python path
path = '/home/YOUR_PA_USERNAME/vogue/backend'
if path not in sys.path:
    sys.path.insert(0, path)

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv(os.path.join(path, '.env'))

# Use production settings
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.production'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
