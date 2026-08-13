@echo off
setlocal EnableExtensions
title Create Desktop Shortcut
chcp 65001 >nul
cd /d "%~dp0"

set "TARGET=%~dp0启动-DeepSeek-Harness.bat"
set "LINK=%USERPROFILE%\Desktop\DeepSeek Harness.lnk"

if not exist "%TARGET%" (
  echo [ERROR] launcher not found: %TARGET%
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('%LINK%'); $sc.TargetPath = '%TARGET%'; $sc.WorkingDirectory = '%~dp0'; $sc.Description = 'DeepSeek Harness Web UI'; $sc.Save()"

if exist "%LINK%" (
  echo [OK] Shortcut created: %LINK%
  echo [TIP] Right-click the shortcut -^> Properties -^> Shortcut -^> Change Icon to customize.
) else (
  echo [ERROR] Failed to create shortcut.
)
pause
endlocal
