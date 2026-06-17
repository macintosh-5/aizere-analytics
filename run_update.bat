@echo off
title Aizere Dashboard Update Tool
cd /d "%~dp0"
echo Starting data update and GitHub publication...
powershell -NoProfile -ExecutionPolicy Bypass -File .\deploy_to_github.ps1
echo.
echo Update complete!
pause
