#!/bin/bash
set -e

pip install -r requirements.txt
python manage.py migrate --settings=config.settings.production --noinput
python seed_once.py
python manage.py collectstatic --settings=config.settings.production --noinput
exec gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2
