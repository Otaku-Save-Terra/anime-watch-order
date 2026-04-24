@echo off
echo ====================================
echo  AniWatch Order - Page Generator
echo ====================================
echo.
cd /d "%~dp0.."
node tools/generate-page.js %*
echo.
pause
