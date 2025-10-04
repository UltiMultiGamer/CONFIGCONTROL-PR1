@echo off


cd /d "%~dp0"
call npm install

start "CONFIGCONTROL Dev Server" cmd /c "npm run dev"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000/?vfs-path=C:&script-path=test.vasi"


pause
