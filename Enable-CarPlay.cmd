@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\set-carplay-enabled.ps1" -Mode On
pause
