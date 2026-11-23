@echo off
title CareerPilot AI - GitHub Setup
color 0B
echo ========================================================
echo         CareerPilot AI - GitHub Setup Helper
echo ========================================================
echo.
echo Pushing project to https://github.com/vijayqadevkraft/careerpilot.git ...
echo.
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo ========================================================
  echo [SUCCESS] Your code is now live on GitHub!
  echo Repository URL: https://github.com/vijayqadevkraft/careerpilot
  echo ========================================================
) else (
  echo ========================================================
  echo Push failed. If a browser window popped up, please click
  echo "Sign in with browser" to authorize Git Credential Manager.
  echo ========================================================
)
echo.
pause
