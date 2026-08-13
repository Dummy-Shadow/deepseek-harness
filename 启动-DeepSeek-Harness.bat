@echo off
setlocal EnableExtensions
title DeepSeek Harness Web UI
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   DeepSeek Harness Web UI
echo   URL: http://127.0.0.1:3080
echo ============================================
echo.

rem --- If the server is already running, just open the browser ---
netstat -ano | findstr /r /c:":3080 .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo [OK] DeepSeek Harness is already running.
  echo [OK] Opening browser...
  start "" http://127.0.0.1:3080
  echo.
  pause
  exit /b 0
)

rem --- Locate pnpm: prefer Corepack's repo-pinned version ---
set "PNPM_CMD=pnpm.cmd"

where corepack >nul 2>nul
if not errorlevel 1 (
  set "PNPM_CMD=corepack pnpm"
) else (
  if exist "%APPDATA%\npm\pnpm.cmd" set "PNPM_CMD=%APPDATA%\npm\pnpm.cmd"
  if exist "%LocalAppData%\pnpm\pnpm.cmd" set "PNPM_CMD=%LocalAppData%\pnpm\pnpm.cmd"
)

rem --- Start the server in the foreground so logs stay visible ---
echo [dsh] Starting DeepSeek Harness Web UI ...
echo [dsh] Close this window or press Ctrl+C to stop the server.
echo.
%PNPM_CMD% dsh web
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
  echo [dsh] Server stopped normally.
) else (
  echo [ERROR] Server exited with code %EXIT_CODE%.
  echo [TIP] If the port 3080 is in use, close the other instance first.
)
echo.
pause
endlocal
