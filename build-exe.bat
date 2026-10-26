@echo off
rem Rebuilds dist\PathAnimator-1.0.0-portable.exe (same name and folder every time).
cd /d "%~dp0"
tasklist /fi "imagename eq PathAnimator-1.0.0-portable.exe" | find /i "PathAnimator" >nul
if not errorlevel 1 (
  echo Path Animator is still running. Please close it first, then run this again.
  pause
  exit /b 1
)
echo Building dist\PathAnimator-1.0.0-portable.exe ...
call npm run dist
if errorlevel 1 (
  echo.
  echo BUILD FAILED - copy the messages above and send them to Claude.
) else (
  echo.
  echo BUILD OK: dist\PathAnimator-1.0.0-portable.exe
)
pause
