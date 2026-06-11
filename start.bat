@echo off
setlocal enabledelayedexpansion
title VOGUE Store - Setup ^& Start
color 0A

echo.
echo  =============================================================
echo   VOGUE Store - Auto Setup ^& Launch
echo  =============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

pause
