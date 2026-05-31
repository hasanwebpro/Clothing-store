import sys
import os

path = '/home/HassanaBk/vogue/backend'
if path not in sys.path:
    sys.path.insert(0, path)

from dotenv import load_dotenv
load_dotenv(os.path.join(path, '.env'))

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.production'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
