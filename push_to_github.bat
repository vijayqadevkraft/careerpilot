@echo off
title CareerPilot AI - GitHub Setup
color 0B
echo ========================================================
echo         CareerPilot AI - GitHub Setup Helper
echo ========================================================
echo.
echo Step 1: Your browser is now open to create the repo.
echo         Make sure "Private" is selected and click
echo         the green "Create repository" button.
echo.
echo Step 2: After clicking "Create repository", press any
echo         key below to push your code!
echo.
echo ========================================================
pause
echo.
echo Pushing project to GitHub...
echo (If a browser window pops up, click "Sign in with browser")
echo.
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo ========================================================
  echo [SUCCESS] Your code is now live on GitHub!
  echo Repository URL: https://github.com/vijayqadevkraft/careerpilot-ai
  echo ========================================================
) else (
  echo ========================================================
  echo Push failed. Make sure you clicked "Create repository"
  echo on GitHub and authorized Git Credential Manager.
  echo ========================================================
)
echo.
pause
