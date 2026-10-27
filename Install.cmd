@echo off
setlocal
title ETS2 CarPlay Kurulum
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-carplay.ps1"
set "install_result=%errorlevel%"
pause
exit /b %install_result%
