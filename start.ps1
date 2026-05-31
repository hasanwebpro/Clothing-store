# start.ps1 — Run backend + frontend locally (no Docker needed)
# Usage: .\start.ps1

$root = $PSScriptRoot

# Backend
Write-Host ""
Write-Host "==> Starting Django backend on http://localhost:8000" -ForegroundColor Cyan

$backendDir = Join-Path $root "backend"

$venvActivate = Join-Path $backendDir "venv\Scripts\Activate.ps1"
if (Test-Path $venvActivate) {
    & $venvActivate
    Write-Host "    Virtual environment activated." -ForegroundColor Green
} else {
    Write-Host "    [!] No venv found at backend\venv - using system Python." -ForegroundColor Yellow
    Write-Host "    To create one: cd backend; python -m venv venv; venv\Scripts\activate; pip install -r requirements.txt" -ForegroundColor Yellow
}

$migrateCmd = "cd '$backendDir'; `$env:DJANGO_SETTINGS_MODULE='config.settings.development'; python manage.py migrate; python manage.py runserver 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $migrateCmd -WindowStyle Normal

# Frontend
Write-Host ""
Write-Host "==> Starting React frontend on http://localhost:3000" -ForegroundColor Cyan

$frontendDir = Join-Path $root "frontend"

$nodeModules = Join-Path $frontendDir "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "    Installing npm packages..." -ForegroundColor Yellow
    npm install --prefix $frontendDir
}

$frontendCmd = "cd '$frontendDir'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Normal

Write-Host ""
Write-Host "Both servers are starting in separate windows." -ForegroundColor Green
Write-Host "  Backend : http://localhost:8000/api/v1/" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Make sure backend\.env has your correct DB_PASSWORD." -ForegroundColor Yellow
