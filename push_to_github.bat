@echo off
echo ========================================================
echo   CareerPilot AI - Push Project to GitHub
echo ========================================================
echo.
echo Target: https://github.com/vijayqadevkraft/careerpilot-ai.git
echo.
echo Pushing main branch to GitHub...
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo ========================================================
  echo SUCCESS! Your code is now live on GitHub.
  echo View your repository at:
  echo https://github.com/vijayqadevkraft/careerpilot-ai
  echo ========================================================
) else (
  echo ========================================================
  echo NOTE: If you got "Repository not found", make sure you
  echo created the repo first at: https://github.com/new?name=careerpilot-ai
  echo ========================================================
)
echo.
pause
