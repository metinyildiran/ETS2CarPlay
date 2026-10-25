@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update-ingame.ps1" -PackagePath "%~dp0dist\browser-0.5.0"
pause
