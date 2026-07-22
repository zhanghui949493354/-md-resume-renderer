@echo off
cd /d "%~dp0"
if exist "..\0721_ai应用开发.md" (
  copy /Y "..\0721_ai应用开发.md" "resume.md" >nul
  echo Synced from ..\0721_ai应用开发.md
) else if exist "resume.example.md" (
  if not exist "resume.md" copy /Y "resume.example.md" "resume.md" >nul
  echo Using resume.md / resume.example.md
)
echo Open http://127.0.0.1:8765/
echo Press Ctrl+C to stop
python -m http.server 8765
