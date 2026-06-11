# VOGUE Store - Full Auto Setup & Launch
# Run via start.bat

$ErrorActionPreference = 'SilentlyContinue'

function Write-Header($msg) {
    Write-Host ""
    Write-Host "  >> $msg" -ForegroundColor Cyan
    Write-Host "  $('-' * ($msg.Length + 5))" -ForegroundColor DarkCyan
}
function Write-OK($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-WARN($msg) { Write-Host "  [!!] $msg" -ForegroundColor Yellow }
function Write-FAIL($msg) { Write-Host "  [XX] $msg" -ForegroundColor Red }
function Write-INFO($msg) { Write-Host "  ... $msg" -ForegroundColor Gray }

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")
}

$ROOT     = $PSScriptRoot
$BACKEND  = Join-Path $ROOT "backend"
$FRONTEND = Join-Path $ROOT "frontend"
$VENV     = Join-Path $BACKEND "venv"
$PY_EXE   = Join-Path $VENV "Scripts\python.exe"
$PIP_EXE  = Join-Path $VENV "Scripts\pip.exe"
$ENV_FILE = Join-Path $BACKEND ".env"
$SQL_FILE = Join-Path $ROOT "clothing_store.sql"

# MySQL can be at different locations depending on version
$MYSQL_PATHS = @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe"
)
$MYSQL_EXE = $MYSQL_PATHS | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $MYSQL_EXE) { $MYSQL_EXE = "mysql" }  # fall back to PATH

# ── Check winget (available on Windows 10 1709+ and Windows 11) ───────────────
$HAS_WINGET = $null -ne (Get-Command winget -ErrorAction SilentlyContinue)

function Install-WithWinget($id, $displayName) {
    if (-not $HAS_WINGET) {
        Write-FAIL "winget not available. Install $displayName manually and re-run this script."
        exit 1
    }
    Write-INFO "Installing $displayName via winget (internet required)..."
    winget install --id $id --silent --accept-package-agreements --accept-source-agreements 2>&1 | Out-Null
    Refresh-Path
}


# ─────────────────────────────────────────────────────────────────────────────
# 1. PYTHON
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Checking Python"

$PY_CMD = $null
foreach ($cmd in @("python", "python3", "py")) {
    $ver = & $cmd --version 2>&1
    if ($ver -match "3\.\d+") { $PY_CMD = $cmd; break }
}

if (-not $PY_CMD) {
    Write-WARN "Python not found — installing..."
    Install-WithWinget "Python.Python.3.13" "Python 3.13"
    foreach ($cmd in @("python", "python3", "py")) {
        $ver = & $cmd --version 2>&1
        if ($ver -match "3\.\d+") { $PY_CMD = $cmd; break }
    }
    if (-not $PY_CMD) {
        Write-FAIL "Python install failed. Please install manually from https://python.org and re-run."
        Read-Host "Press Enter to exit"; exit 1
    }
    Write-OK "Python installed"
} else {
    Write-OK "$(& $PY_CMD --version 2>&1)"
}


# ─────────────────────────────────────────────────────────────────────────────
# 2. NODE.JS
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Checking Node.js"

$nodeVer = node --version 2>&1
if ($LASTEXITCODE -ne 0 -or -not ($nodeVer -match "v\d+")) {
    Write-WARN "Node.js not found — installing..."
    Install-WithWinget "OpenJS.NodeJS.LTS" "Node.js LTS"
    $nodeVer = node --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-FAIL "Node.js install failed. Please install manually from https://nodejs.org and re-run."
        Read-Host "Press Enter to exit"; exit 1
    }
    Write-OK "Node.js installed"
} else {
    Write-OK "Node $nodeVer"
}


# ─────────────────────────────────────────────────────────────────────────────
# 3. MYSQL
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Checking MySQL"

$mysqlVer = & $MYSQL_EXE --version 2>&1
$mysqlOk  = $mysqlVer -match "mysql"

if (-not $mysqlOk) {
    Write-WARN "MySQL not found — installing..."
    Install-WithWinget "Oracle.MySQL" "MySQL Server 8.0"

    # Re-detect after install
    Refresh-Path
    $MYSQL_EXE = $MYSQL_PATHS | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $MYSQL_EXE) { $MYSQL_EXE = "mysql" }

    # Start MySQL service if not running
    $svc = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($svc -and $svc.Status -ne "Running") {
        Write-INFO "Starting MySQL service..."
        Start-Service $svc.Name -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }

    $mysqlVer = & $MYSQL_EXE --version 2>&1
    if (-not ($mysqlVer -match "mysql")) {
        Write-FAIL "MySQL install failed. Please install MySQL Server 8.0 manually and re-run."
        Read-Host "Press Enter to exit"; exit 1
    }
    Write-OK "MySQL installed"
    Write-WARN "NOTE: If this is a fresh MySQL install, you may need to set the root password"
    Write-WARN "      before the database step works. Open MySQL Workbench to do that."
} else {
    Write-OK "MySQL found"
}

# Make sure MySQL service is running
$svc = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($svc -and $svc.Status -ne "Running") {
    Write-INFO "Starting MySQL service..."
    Start-Service $svc.Name -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}


# ─────────────────────────────────────────────────────────────────────────────
# 4. CREATE / VERIFY .env
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Checking environment config (.env)"

if (-not (Test-Path $ENV_FILE)) {
    Write-WARN ".env not found — running first-time configuration"
    Write-Host ""
    Write-Host "  I need a few details to configure the app." -ForegroundColor White
    Write-Host "  Press Enter on any optional field to skip it." -ForegroundColor Gray
    Write-Host ""

    $dbPass    = Read-Host "  MySQL root password"
    $dbName    = Read-Host "  Database name         [clothing_store]"
    if (-not $dbName) { $dbName = "clothing_store" }

    Write-Host ""
    Write-Host "  -- Optional: Gmail for newsletter/coupon emails --" -ForegroundColor DarkGray
    $gmailUser = Read-Host "  Gmail address         (blank to skip)"
    $gmailPass = ""
    if ($gmailUser) {
        $gmailPass = Read-Host "  Gmail App Password    (myaccount.google.com/apppasswords)"
    }

    Write-Host ""
    Write-Host "  -- Optional: Google Sign-In --" -ForegroundColor DarkGray
    $googleId  = Read-Host "  Google OAuth Client ID (blank to skip)"

    $epPhone   = Read-Host "  Easypaisa merchant phone [03092584328]"
    if (-not $epPhone) { $epPhone = "03092584328" }

    # Generate random secret key
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%^&*(-_=+)"
    $secretKey = -join ((1..60) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })

    $fromEmail    = if ($gmailUser) { "VOGUE Pakistan <$gmailUser>" } else { "no-reply@clothingstore.com" }
    $emailBackend = if ($gmailUser) { "django.core.mail.backends.smtp.EmailBackend" } else { "django.core.mail.backends.console.EmailBackend" }

    @"
# Auto-generated by start.bat on $(Get-Date -Format 'yyyy-MM-dd HH:mm')
DJANGO_SETTINGS_MODULE=config.settings.development

SECRET_KEY=$secretKey
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=$dbName
DB_USER=root
DB_PASSWORD=$dbPass
DB_HOST=127.0.0.1
DB_PORT=3306

JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

EMAIL_BACKEND=$emailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=$gmailUser
EMAIL_HOST_PASSWORD=$gmailPass
DEFAULT_FROM_EMAIL=$fromEmail

EASYPAISA_STORE_ID=
EASYPAISA_HASH_KEY=
EASYPAISA_MERCHANT_PHONE=$epPhone

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
MEDIA_URL=/media/
STATIC_URL=/static/
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=$googleId
"@ | Set-Content -Path $ENV_FILE -Encoding UTF8

    Write-OK ".env created"
} else {
    Write-OK ".env already exists — skipping"
}

# Parse DB credentials from .env
$dbPass = ""; $dbName = "clothing_store"; $dbUser = "root"
foreach ($line in Get-Content $ENV_FILE) {
    if ($line -match "^DB_PASSWORD=(.*)$") { $dbPass = $Matches[1] }
    if ($line -match "^DB_NAME=(.*)$")     { $dbName = $Matches[1] }
    if ($line -match "^DB_USER=(.*)$")     { $dbUser = $Matches[1] }
}


# ─────────────────────────────────────────────────────────────────────────────
# 5. PYTHON VIRTUAL ENVIRONMENT
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Python virtual environment"

if (-not (Test-Path $VENV)) {
    Write-INFO "Creating venv (first time, ~30 seconds)..."
    & $PY_CMD -m venv $VENV
    Write-OK "venv created"
} else {
    Write-OK "venv already exists — skipping"
}


# ─────────────────────────────────────────────────────────────────────────────
# 6. PYTHON PACKAGES  (only if requirements.txt changed)
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Python packages"

$reqFile  = Join-Path $BACKEND "requirements.txt"
$marker   = Join-Path $VENV ".deps_hash"
$reqHash  = (Get-FileHash $reqFile -Algorithm MD5).Hash
$stored   = if (Test-Path $marker) { (Get-Content $marker -Raw).Trim() } else { "" }

if ($reqHash -ne $stored) {
    Write-INFO "Installing/updating packages from requirements.txt..."
    & $PIP_EXE install -r $reqFile -q
    Set-Content $marker $reqHash -Encoding UTF8
    Write-OK "Python packages installed"
} else {
    Write-OK "Already installed — skipping"
}


# ─────────────────────────────────────────────────────────────────────────────
# 7. NODE PACKAGES  (only if package.json changed)
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Node.js packages"

$nodeModules = Join-Path $FRONTEND "node_modules"
$pkgJson     = Join-Path $FRONTEND "package.json"
$nodeMarker  = Join-Path $FRONTEND ".npm_hash"
$pkgHash     = (Get-FileHash $pkgJson -Algorithm MD5).Hash
$storedPkg   = if (Test-Path $nodeMarker) { (Get-Content $nodeMarker -Raw).Trim() } else { "" }

if (-not (Test-Path $nodeModules) -or $pkgHash -ne $storedPkg) {
    Write-INFO "Running npm install (first time ~2 minutes)..."
    Push-Location $FRONTEND
    npm install --silent 2>&1 | Out-Null
    Pop-Location
    Set-Content $nodeMarker $pkgHash -Encoding UTF8
    Write-OK "Node packages installed"
} else {
    Write-OK "Already installed — skipping"
}


# ─────────────────────────────────────────────────────────────────────────────
# 8. DATABASE  (import SQL if empty, otherwise skip)
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Database"

$mysqlCreds = @("-u", $dbUser, "-h", "127.0.0.1", "--silent")
if ($dbPass) { $mysqlCreds += "-p$dbPass" }

$tableCount = 0
try {
    $result = & $MYSQL_EXE @mysqlCreds -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$dbName';" 2>&1
    $tableCount = [int]($result | Where-Object { $_ -match "^\d+$" } | Select-Object -First 1)
} catch {}

if ($tableCount -lt 5) {
    Write-INFO "Database empty or missing — setting up..."
    & $MYSQL_EXE @mysqlCreds -e "CREATE DATABASE IF NOT EXISTS ``$dbName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1 | Out-Null

    if (Test-Path $SQL_FILE) {
        Write-INFO "Importing clothing_store.sql..."
        $pwArg = if ($dbPass) { "-p$dbPass" } else { "" }
        cmd /c "`"$MYSQL_EXE`" -u $dbUser $pwArg -h 127.0.0.1 $dbName < `"$SQL_FILE`"" 2>&1 | Out-Null
        Write-OK "Database imported"
    } else {
        Write-WARN "clothing_store.sql not found — creating fresh database"
        Push-Location $BACKEND
        & $PY_EXE manage.py migrate --run-syncdb 2>&1 | Out-Null
        Pop-Location
        Write-OK "Fresh database created"
    }
} else {
    Write-OK "Database already has $tableCount tables — skipping import"
}


# ─────────────────────────────────────────────────────────────────────────────
# 9. MIGRATIONS  (safe every time — skips already-applied ones)
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Database migrations"
Push-Location $BACKEND
& $PY_EXE manage.py migrate --run-syncdb 2>&1 |
    Where-Object { $_ -match "Applying|No migrations|OK" } |
    ForEach-Object { Write-INFO $_ }
Pop-Location
Write-OK "All migrations applied"


# ─────────────────────────────────────────────────────────────────────────────
# 10. CACHE DIRECTORY
# ─────────────────────────────────────────────────────────────────────────────
$cacheDir = Join-Path $BACKEND ".cache"
if (-not (Test-Path $cacheDir)) {
    New-Item -ItemType Directory -Path $cacheDir | Out-Null
}


# ─────────────────────────────────────────────────────────────────────────────
# LAUNCH
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  =============================================================" -ForegroundColor Green
Write-Host "   All done! Starting servers..." -ForegroundColor Green
Write-Host "  =============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "   Backend   ->  http://localhost:8000" -ForegroundColor White
Write-Host "   Frontend  ->  http://localhost:3000  (opens automatically)" -ForegroundColor White
Write-Host ""
Write-Host "   Close the server windows to stop." -ForegroundColor Gray
Write-Host ""
Start-Sleep -Seconds 1

$djangoCmd = "Set-Location '$BACKEND'; Write-Host ' Django Backend' -ForegroundColor Cyan; .\venv\Scripts\python.exe manage.py runserver; Read-Host 'Server stopped. Press Enter to close'"
Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"$djangoCmd`"" -WindowStyle Normal

Start-Sleep -Seconds 2

$reactCmd = "Set-Location '$FRONTEND'; Write-Host ' React Frontend' -ForegroundColor Magenta; npm run dev; Read-Host 'Server stopped. Press Enter to close'"
Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"$reactCmd`"" -WindowStyle Normal

Start-Sleep -Seconds 4
Start-Process "http://localhost:3000"

Write-Host "  Servers started. Browser opening..." -ForegroundColor Green
Write-Host ""
