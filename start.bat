@echo off
echo ========================================
echo   DealRadar - Iniciando servicios
echo ========================================
echo.

echo [1] Iniciando Backend (Puerto 5000)...
start "DealRadar Backend" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2] Iniciando Frontend (Puerto 3000)...
start "DealRadar Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo   Servicios iniciados!
echo ========================================
echo.
echo Backend API:    http://localhost:5000
echo Frontend:       http://localhost:3000
echo.
echo Presiona cualquier tecla para salir...
pause >nul

