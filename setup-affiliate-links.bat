@echo off
setlocal
cd /d "%~dp0"

echo Instalando dependencias del backend...
call npm install --prefix backend
if errorlevel 1 goto :error

echo Instalando Chromium para Playwright...
call npx --prefix backend playwright install chromium
if errorlevel 1 goto :error

echo Abriendo Mercado Libre para guardar la sesion local...
call npm run setup:meli-affiliate --prefix backend
if errorlevel 1 goto :error

echo.
echo Configuracion completada.
pause
exit /b 0

:error
echo.
echo La configuracion fallo. Revisa el mensaje anterior.
pause
exit /b 1
