@echo off
title VOGUE - Dev Launcher

echo.
echo  Starting Clothing Store...
echo.

:: ── Kill anything on the two ports we actually use ──────────────────────────
echo  Killing old processes on ports 3000 and 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " 2^>nul') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " 2^>nul') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " 2^>nul') do taskkill /f /pid %%a >nul 2>&1
timeout /t 1 /nobreak >nul

:: ── Sanity check ────────────────────────────────────────────────────────────
if not exist "%~dp0backend\venv\Scripts\python.exe" (
    echo.
    echo  [ERROR] venv not found. Run inside backend folder:
    echo    python -m venv venv
    echo    venv\Scripts\pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

:: ── Temp launchers (path has spaces so we can't inline) ─────────────────────
set BS=%TEMP%\vogue_backend.bat
set FS=%TEMP%\vogue_frontend.bat

(
    echo @echo off
    echo title Django - port 8000
    echo cd /d "%~dp0backend"
    echo call venv\Scripts\activate
    echo set DJANGO_SETTINGS_MODULE=config.settings.development
    echo python manage.py runserver
    echo pause
) > "%BS%"

(
    echo @echo off
    echo title Vite - port 3000
    echo cd /d "%~dp0frontend"
    echo npm run dev
    echo pause
) > "%FS%"

:: ── Launch ───────────────────────────────────────────────────────────────────
echo  [1/2] Backend  ^> http://localhost:8000
start "Django" cmd /k "%BS%"

timeout /t 3 /nobreak >nul

echo  [2/2] Frontend ^> http://localhost:3000
start "Vite" cmd /k "%FS%"

timeout /t 5 /nobreak >nul
start http://localhost:3000
timeout /t 1 /nobreak >nul
start http://localhost:3000/admin/dashboard

echo.
echo  Backend:   http://localhost:8000/api/v1/
echo  Frontend:  http://localhost:3000
echo  Admin:     http://localhost:3000/admin/dashboard
echo.
pause
