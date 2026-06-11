@echo off
title VOGUE - React Frontend
color 0D
cd /d "%~dp0..\frontend"
echo.
echo  React Frontend starting at http://localhost:3000
echo  Close this window to stop the server.
echo.
npm run dev
pause
