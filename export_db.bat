@echo off
title Export Database
color 0B
echo.
echo  Exporting database to clothing_store.sql ...
echo.
set /p DB_PASS=Enter your MySQL root password:
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -u root -p%DB_PASS% clothing_store > "%~dp0clothing_store.sql"
echo.
echo  Done! clothing_store.sql is ready to copy.
echo.
pause
