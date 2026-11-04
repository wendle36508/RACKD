@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title RACKD

set "NODE=node"
set "NPM=npm"
where npm >nul 2>nul
if not errorlevel 1 goto havenode
set "NODE=%~dp0toolbox\windows\node\node.exe"
set "NPM=%~dp0toolbox\windows\node\npm.cmd"
if exist "%NPM%" goto havenode
echo Node.js isn't on this laptop yet. Downloading a private copy (about 30 MB, one time only)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0toolbox\windows\get-node.ps1"
if exist "%NPM%" goto havenode
echo Couldn't set up Node.js. Install the LTS version from https://nodejs.org and try again.
pause
exit /b 1

:havenode
set "PATH=%~dp0toolbox\windows\node;%PATH%"

:menu
echo.
echo  ===== RACKD =====
echo  1  Set up (first time only: makes your .env file and installs the style AI add-on, about 200 MB)
echo  2  Start the app (opens http://localhost:3000; close this window to stop it)
echo  3  Add 3 example listings (to try the app before Apify is plugged in)
echo  4  Run the style AI on new listings
echo  5  Tidy up old sold listings
echo  6  Self-test (fake Apify, costs nothing)
echo  7  Health check (a light for every floor)
echo  8  Daily summary for today
echo  0  Quit
echo.
set "c="
set /p c=Pick a number: 
if "%c%"=="1" call "%NPM%" install --no-audit --no-fund --loglevel=error
if "%c%"=="1" if not exist ".env" (copy ".env.example" ".env" >nul & echo Made your .env file in this folder. Open it with Notepad to add your keys.)
if "%c%"=="2" start "" "http://localhost:3000" & "%NODE%" 5-app\server.js
if "%c%"=="3" "%NODE%" 3-data\load-sample.js
if "%c%"=="4" "%NODE%" 4-algorithm\fashionclip\fingerprint.js
if "%c%"=="5" "%NODE%" 2-freshness\cleanup.js
if "%c%"=="6" "%NODE%" toolbox\check.js
if "%c%"=="7" "%NODE%" toolbox\health.js
if "%c%"=="8" "%NODE%" toolbox\daily-summary.js
if "%c%"=="0" exit /b 0
goto menu
