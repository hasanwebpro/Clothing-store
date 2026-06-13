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

$MYSQL_PATHS = @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 9.3\bin\mysql.exe"
)
$MYSQL_EXE = $MYSQL_PATHS | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $MYSQL_EXE) { $MYSQL_EXE = "mysql" }

$HAS_WINGET = $null -ne (Get-Command winget -ErrorAction SilentlyContinue)

function Install-WithWinget($id, $name) {
    if (-not $HAS_WINGET) {
        Write-FAIL "winget not available. Install $name manually then re-run."
        Read-Host "Press Enter to exit"; exit 1
    }
    Write-INFO "Installing $name via winget..."
    winget install --id $id --silent --accept-package-agreements --accept-source-agreements 2>&1 | Out-Null
    Refresh-Path
}


# -- 1. PYTHON ---------------------------------------------------------------
Write-Header "Checking Python"
$PY_CMD = $null
foreach ($cmd in @("python","python3","py")) {
    $v = & $cmd --version 2>&1
    if ("$v" -match "3\.\d+") { $PY_CMD = $cmd; break }
}
if (-not $PY_CMD) {
    Write-WARN "Python not found - installing..."
    Install-WithWinget "Python.Python.3.13" "Python 3.13"
    foreach ($cmd in @("python","python3","py")) {
        $v = & $cmd --version 2>&1
        if ("$v" -match "3\.\d+") { $PY_CMD = $cmd; break }
    }
    if (-not $PY_CMD) {
        Write-FAIL "Python install failed. Install manually from python.org then re-run."
        Read-Host "Press Enter to exit"; exit 1
    }
    Write-OK "Python installed"
} else {
    Write-OK "$(& $PY_CMD --version 2>&1)"
}


# -- 2. NODE.JS --------------------------------------------------------------
Write-Header "Checking Node.js"
$nodeVer = node --version 2>&1
if (-not ("$nodeVer" -match "v\d+")) {
    Write-WARN "Node.js not found - installing..."
    Install-WithWinget "OpenJS.NodeJS.LTS" "Node.js LTS"
    $nodeVer = node --version 2>&1
    if (-not ("$nodeVer" -match "v\d+")) {
        Write-FAIL "Node.js install failed. Install manually from nodejs.org then re-run."
        Read-Host "Press Enter to exit"; exit 1
    }
    Write-OK "Node.js installed"
} else {
    Write-OK "Node $nodeVer"
}


# -- 3. MYSQL ----------------------------------------------------------------
Write-Header "Checking MySQL"
$mysqlVer = & $MYSQL_EXE --version 2>&1
if (-not ("$mysqlVer" -match "mysql")) {
    Write-WARN "MySQL not found - installing..."
    Install-WithWinget "Oracle.MySQL" "MySQL Server 8.0"
    Refresh-Path
    $MYSQL_EXE = $MYSQL_PATHS | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $MYSQL_EXE) { $MYSQL_EXE = "mysql" }
    $mysqlVer = & $MYSQL_EXE --version 2>&1
    if (-not ("$mysqlVer" -match "mysql")) {
        Write-FAIL "MySQL install failed. Install MySQL Server 8.0 manually then re-run."
        Read-Host "Press Enter to exit"; exit 1
    }
    Write-OK "MySQL installed"
} else {
    Write-OK "MySQL found"
}

# Start MySQL service if stopped
$svc = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($svc -and $svc.Status -ne "Running") {
    Write-INFO "Starting MySQL service..."
    Start-Service $svc.Name -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
}


# -- 4. .ENV FILE ------------------------------------------------------------
Write-Header "Checking .env config"
if (-not (Test-Path $ENV_FILE)) {
    Write-WARN ".env missing - first-time setup"
    Write-Host ""
    Write-Host "  Answer a few questions to configure the app." -ForegroundColor White
    Write-Host "  Press Enter to accept the default shown in [brackets]." -ForegroundColor Gray
    Write-Host ""

    $dbPass    = Read-Host "  MySQL root password"
    $inp       = Read-Host "  Database name [clothing_store]"
    $dbName    = if ($inp) { $inp } else { "clothing_store" }

    Write-Host ""
    Write-Host "  -- Gmail for newsletter emails (optional) --" -ForegroundColor DarkGray
    $gmailUser = Read-Host "  Gmail address (blank to skip)"
    $gmailPass = ""
    if ($gmailUser) { $gmailPass = Read-Host "  Gmail App Password (16 chars)" }

    Write-Host ""
    Write-Host "  -- Google Sign-In (optional) --" -ForegroundColor DarkGray
    $googleId  = Read-Host "  Google OAuth Client ID (blank to skip)"

    $inp2    = Read-Host "  Easypaisa merchant phone [03092584328]"
    $epPhone = if ($inp2) { $inp2 } else { "03092584328" }

    # Random secret key
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    $secretKey = -join ((1..60) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })

    $emailBackend = if ($gmailUser) { "django.core.mail.backends.smtp.EmailBackend" } else { "django.core.mail.backends.console.EmailBackend" }
    $fromEmail    = if ($gmailUser) { "VOGUE Pakistan <" + $gmailUser + ">" } else { "no-reply@clothingstore.com" }

    $lines = @(
        "# Auto-generated by start.bat on $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
        "DJANGO_SETTINGS_MODULE=config.settings.development",
        "",
        "SECRET_KEY=$secretKey",
        "DEBUG=True",
        "ALLOWED_HOSTS=localhost,127.0.0.1",
        "",
        "DB_NAME=$dbName",
        "DB_USER=root",
        "DB_PASSWORD=$dbPass",
        "DB_HOST=127.0.0.1",
        "DB_PORT=3306",
        "",
        "JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15",
        "JWT_REFRESH_TOKEN_LIFETIME_DAYS=3650",
        "",
        "EMAIL_BACKEND=$emailBackend",
        "EMAIL_HOST=smtp.gmail.com",
        "EMAIL_PORT=587",
        "EMAIL_USE_TLS=True",
        "EMAIL_HOST_USER=$gmailUser",
        "EMAIL_HOST_PASSWORD=$gmailPass",
        "DEFAULT_FROM_EMAIL=$fromEmail",
        "",
        "EASYPAISA_STORE_ID=",
        "EASYPAISA_HASH_KEY=",
        "EASYPAISA_MERCHANT_PHONE=$epPhone",
        "",
        "CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000",
        "MEDIA_URL=/media/",
        "STATIC_URL=/static/",
        "FRONTEND_URL=http://localhost:3000",
        "GOOGLE_CLIENT_ID=$googleId"
    )
    $lines -join "`r`n" | Set-Content -Path $ENV_FILE -Encoding UTF8
    Write-OK ".env created"
} else {
    Write-OK ".env already exists - skipping"
}

# Read DB creds from .env
$dbPass = ""; $dbName = "clothing_store"; $dbUser = "root"
foreach ($line in Get-Content $ENV_FILE) {
    if ($line -match "^DB_PASSWORD=(.*)$") { $dbPass = $Matches[1] }
    if ($line -match "^DB_NAME=(.*)$")     { $dbName = $Matches[1] }
    if ($line -match "^DB_USER=(.*)$")     { $dbUser = $Matches[1] }
}


# -- 5. PYTHON VENV ----------------------------------------------------------
Write-Header "Python virtual environment"
if (Test-Path $VENV) {
    $venvTest = & $PY_EXE --version 2>&1
    if (-not ("$venvTest" -match "Python 3")) {
        Write-WARN "Existing venv is broken (wrong Python or different PC) - recreating..."
        Remove-Item -Recurse -Force $VENV
        Remove-Item -Force (Join-Path $VENV ".deps_hash") -ErrorAction SilentlyContinue
    }
}
if (-not (Test-Path $VENV)) {
    Write-INFO "Creating venv (first time ~30s)..."
    & $PY_CMD -m venv $VENV
    Write-OK "venv created"
} else {
    Write-OK "Already exists - skipping"
}


# -- 6. PYTHON PACKAGES ------------------------------------------------------
Write-Header "Python packages"
$reqFile = Join-Path $BACKEND "requirements.txt"
$marker  = Join-Path $VENV ".deps_hash"
$reqHash = (Get-FileHash $reqFile -Algorithm MD5).Hash
$stored  = if (Test-Path $marker) { (Get-Content $marker -Raw).Trim() } else { "" }
if ($reqHash -ne $stored) {
    Write-INFO "Installing packages from requirements.txt..."
    & $PIP_EXE install -r $reqFile -q
    Set-Content $marker $reqHash -Encoding UTF8
    Write-OK "Installed"
} else {
    Write-OK "Already up to date - skipping"
}


# -- 7. NODE PACKAGES --------------------------------------------------------
Write-Header "Node.js packages"
$nodeModules = Join-Path $FRONTEND "node_modules"
$pkgJson     = Join-Path $FRONTEND "package.json"
$nodeMarker  = Join-Path $FRONTEND ".npm_hash"
$pkgHash     = (Get-FileHash $pkgJson -Algorithm MD5).Hash
$storedPkg   = if (Test-Path $nodeMarker) { (Get-Content $nodeMarker -Raw).Trim() } else { "" }
if (-not (Test-Path $nodeModules) -or $pkgHash -ne $storedPkg) {
    Write-INFO "Running npm install (first time ~2 min)..."
    Push-Location $FRONTEND
    npm install --silent 2>&1 | Out-Null
    Pop-Location
    Set-Content $nodeMarker $pkgHash -Encoding UTF8
    Write-OK "Installed"
} else {
    Write-OK "Already up to date - skipping"
}


# -- 8. DATABASE -------------------------------------------------------------
Write-Header "Database"
$pwFlag = if ($dbPass) { "-p$dbPass" } else { "" }

$tableCount = 0
$countQuery = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='" + $dbName + "';"
$countResult = & $MYSQL_EXE -u $dbUser $pwFlag -h 127.0.0.1 --silent -e $countQuery
$countLine = $countResult | Where-Object { "$_" -match "^\d+$" } | Select-Object -First 1
if ($countLine) { $tableCount = [int]"$countLine" }

if ($tableCount -lt 5) {
    Write-INFO "Database empty or missing - setting up..."
    $createQuery = "CREATE DATABASE IF NOT EXISTS " + $dbName + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    & $MYSQL_EXE -u $dbUser $pwFlag -h 127.0.0.1 -e $createQuery | Out-Null

    if (Test-Path $SQL_FILE) {
        Write-INFO "Importing clothing_store.sql..."
        $pinfo = New-Object System.Diagnostics.ProcessStartInfo
        $pinfo.FileName = $MYSQL_EXE
        $pinfo.Arguments = "-u $dbUser $pwFlag -h 127.0.0.1 $dbName"
        $pinfo.RedirectStandardInput = $true
        $pinfo.UseShellExecute = $false
        $pinfo.CreateNoWindow = $true
        $proc = [System.Diagnostics.Process]::Start($pinfo)
        $sqlContent = Get-Content $SQL_FILE -Raw
        $proc.StandardInput.Write($sqlContent)
        $proc.StandardInput.Close()
        $proc.WaitForExit()
        Write-OK "Database imported from clothing_store.sql"
    } else {
        Write-WARN "clothing_store.sql not found - running fresh migrations"
        Push-Location $BACKEND
        & $PY_EXE manage.py migrate --run-syncdb | Out-Null
        Pop-Location
        Write-OK "Fresh database created"
    }
} else {
    Write-OK "Database already has $tableCount tables - skipping import"
}


# -- 9. MIGRATIONS -----------------------------------------------------------
Write-Header "Applying migrations"
Push-Location $BACKEND
& $PY_EXE manage.py migrate --run-syncdb 2>&1 |
    Where-Object { $_ -match "Applying|No migrations" } |
    ForEach-Object { Write-INFO $_ }
Pop-Location
Write-OK "Migrations up to date"


# -- 10. CACHE DIR -----------------------------------------------------------
$cacheDir = Join-Path $BACKEND ".cache"
if (-not (Test-Path $cacheDir)) { New-Item -ItemType Directory -Path $cacheDir | Out-Null }


# -- LAUNCH ------------------------------------------------------------------
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

$backendBat  = Join-Path $ROOT "scripts\_start_backend.bat"
$frontendBat = Join-Path $ROOT "scripts\_start_frontend.bat"

Start-Process "cmd.exe" -ArgumentList "/c `"$backendBat`"" -WindowStyle Normal
Start-Sleep -Seconds 2
Start-Process "cmd.exe" -ArgumentList "/c `"$frontendBat`"" -WindowStyle Normal
Start-Sleep -Seconds 4
Start-Process "http://localhost:3000"

Write-Host "  Done. Browser opening at http://localhost:3000" -ForegroundColor Green
Write-Host ""
