@echo off
echo ========================================
echo   DealRadar - Instalacion
echo ========================================
echo.

echo [1/4] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no esta instalado. Por favor instala Node.js 18+ desde https://nodejs.org/
    pause
    exit /b 1
)
echo OK: Node.js instalado

echo.
echo [2/4] Verificando PostgreSQL...
psql --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: PostgreSQL no esta instalado. Por favor instala PostgreSQL desde https://www.postgresql.org/
    pause
    exit /b 1
)
echo OK: PostgreSQL instalado

echo.
echo [3/4] Creando base de datos...
createdb dealradar 2>nul
if errorlevel 1 (
    echo La base de datos ya existe o no se pudo crear.
) else (
    echo OK: Base de datos creada
)

echo.
echo [4/4] Instalando dependencias...
echo.
echo Instalando backend...
cd backend
call npm install
if errorlevel 1 (
    echo ERROR al instalar backend
    pause
    exit /b 1
)

echo.
echo Instalando frontend...
cd ..\frontend
call npm install
if errorlevel 1 (
    echo ERROR al instalar frontend
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Instalacion completada!
echo ========================================
echo.
echo Para ejecutar el proyecto:
echo.
echo Terminal 1 (Backend):
echo   cd backend
echo   npm run dev
echo.
echo Terminal 2 (Frontend):
echo   cd frontend
echo   npm run dev
echo.
echo Luego visita: http://localhost:3000
echo.
pause

