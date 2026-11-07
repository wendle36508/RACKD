@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0.."
title RACKD brand intel

set "PY=py"
where py >nul 2>nul
if errorlevel 1 set "PY=python"
where %PY% >nul 2>nul
if errorlevel 1 (
  echo Python isn't on this laptop yet. Install it from https://www.python.org/downloads/ ^(tick "Add python.exe to PATH"^), then run this again.
  pause
  exit /b 1
)

:menu
echo.
echo  ===== RACKD brand intel =====
echo  1  Set up (first time only: installs the Word and Excel add-ons, small)
echo  2  Set up the photo AI too (optional, about 1 GB)
echo  3  Track Vuori now (searches every hero product once: costs about $1.30 of Apify credit)
echo  4  Track Vuori now with the photo check
echo  5  Make the Vuori report (Word sheet + Excel, free)
echo  6  Run the Vuori case study on made-up data (free, no internet)
echo  7  Self-test (free, no internet)
echo  0  Quit
echo.
set "c="
set /p c=Pick a number: 
if "%c%"=="1" %PY% -m pip install -r brand-intel\requirements.txt
if "%c%"=="2" %PY% -m pip install -r brand-intel\requirements-ai.txt
if "%c%"=="3" %PY% brand-intel\run.py track vuori
if "%c%"=="4" %PY% brand-intel\run.py track vuori --photos
if "%c%"=="5" %PY% brand-intel\run.py report vuori
if "%c%"=="6" %PY% brand-intel\run.py case-study
if "%c%"=="7" %PY% brand-intel\run.py selftest
if "%c%"=="0" exit /b 0
goto menu
