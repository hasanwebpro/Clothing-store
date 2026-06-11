@echo off
title VOGUE - Django Backend
color 0B
cd /d "%~dp0..\backend"
echo.
echo  Django Backend starting at http://localhost:8000
echo  Close this window to stop the server.
echo.
call venv\Scripts\activate
python manage.py runserver
pause
