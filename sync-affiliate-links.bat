@echo off
setlocal
cd /d "%~dp0"

call npm run sync:meli-affiliate --prefix backend
set "RESULTADO=%errorlevel%"

echo.
echo Proceso finalizado con codigo: %RESULTADO%
echo Revisa el resultado mostrado arriba.
pause

exit /b %RESULTADO%