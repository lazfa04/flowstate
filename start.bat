@echo off
setlocal
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "SRV=%ROOT%\server"
set "CLI=%ROOT%\client"

echo Starting FlowState server and client...
start "FlowState Server" cmd /k cd /d "%SRV%" ^&^& npm run dev
start "FlowState Client" cmd /k cd /d "%CLI%" ^&^& npm run dev

timeout /t 4 /nobreak >nul
start "" "http://localhost:5173"

endlocal
exit /b 0
