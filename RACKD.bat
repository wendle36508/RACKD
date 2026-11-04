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
echo  1  Set up (first time only: installs the style AI add-on, about 200 MB)
echo  2  Try the app with 3 example listings
echo  3  Get new listings now (needs APIFY_TOKEN in .env)
echo  4  Check for sold items now (needs APIFY_TOKEN in .env)
echo  5  Run the style AI on new listings
echo  6  Rebuild and open the app
echo  7  Do 3, 5 and 6 in a row
echo  8  Turn on the automatic schedule (every hour + daily 4am check)
echo  9  Self-test
echo  0  Quit
echo.
set "c="
set /p c=Pick a number: 
if "%c%"=="1" call "%NPM%" install --no-audit --no-fund --loglevel=error
if "%c%"=="2" "%NODE%" 3-data\load-sample.js && "%NODE%" 5-app\build-app.js && start "" "5-app\dist\rackd.html"
if "%c%"=="3" "%NODE%" 2-freshness\fetch-new.js
if "%c%"=="4" "%NODE%" 2-freshness\recheck-sold.js
if "%c%"=="5" "%NODE%" 4-algorithm\fashionclip\fingerprint.js
if "%c%"=="6" "%NODE%" 5-app\build-app.js && start "" "5-app\dist\rackd.html"
if "%c%"=="7" "%NODE%" 2-freshness\fetch-new.js && "%NODE%" 4-algorithm\fashionclip\fingerprint.js && "%NODE%" 5-app\build-app.js && start "" "5-app\dist\rackd.html"
if "%c%"=="8" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0toolbox\windows\schedule-freshness.ps1"
if "%c%"=="9" "%NODE%" toolbox\check.js
if "%c%"=="0" exit /b 0
goto menu
