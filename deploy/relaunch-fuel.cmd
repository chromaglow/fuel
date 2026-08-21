@echo off
rem Launch / relaunch fuel in a clean context.
rem
rem Modes:
rem   relaunch-fuel.cmd          force: kill any existing fuel, start fresh
rem   relaunch-fuel.cmd /auto    heal: start ONLY if fuel is not running
rem
rem Invoked by two scheduled tasks (see deploy/install-fuel-launcher.ps1):
rem   "fuel"           on-demand, force mode  -> the Fuel desktop shortcut
rem   "fuel autoheal"  at logon + every 15 min, /auto mode
rem Task Scheduler runs these outside any Claude/Electron job object, so a
rem Claude Desktop update can never take fuel down with it (the 08-19/08-21
rem disappearances). Never launch fuel from a Claude tool shell.

set FUEL_DIR=C:\dev\GitHub\fuel
set ELECTRON=%FUEL_DIR%\node_modules\electron\dist\electron.exe

if /i "%~1"=="/auto" (
  powershell -NoProfile -Command "exit @(Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.Path -like 'C:\dev\GitHub\fuel\*' }).Count"
  if not errorlevel 1 goto :start
  exit /b 0
)

rem Force mode: kill only fuel's electron processes (matched on path).
powershell -NoProfile -Command "Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.Path -like 'C:\dev\GitHub\fuel\*' } | Stop-Process -Force"
rem Give the single-instance lock a moment to release.
timeout /t 2 /nobreak >nul

:start
start "" /d "%FUEL_DIR%" "%ELECTRON%" "%FUEL_DIR%"
exit /b 0
