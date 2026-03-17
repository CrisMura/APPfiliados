#!/bin/bash

# DealRadar - Script de inicio para Linux/Mac

echo "========================================"
echo "  DealRadar - Iniciando servicios"
echo "========================================"
echo ""

# Verificar si PostgreSQL está corriendo
if ! pgrep -x "postgres" > /dev/null; then
    echo "⚠️  PostgreSQL no está corriendo. Por favor, inicia PostgreSQL primero."
    exit 1
fi

# Crear base de datos si no existe
createdb dealradar 2>/dev/null
echo "✅ Base de datos: dealradar"

# Iniciar backend
echo ""
echo "[1] Iniciando Backend (Puerto 5000)..."
cd backend
npm run dev &
BACKEND_PID=$!

cd ..

# Esperar un momento
sleep 3

# Iniciar frontend
echo "[2] Iniciando Frontend (Puerto 3000)..."
cd frontend
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "========================================"
echo "  Servicios iniciados!"
echo "========================================"
echo ""
echo "Backend API:    http://localhost:5000"
echo "Frontend:       http://localhost:3000"
echo ""
echo "Para detener los servicios:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Mantener el script corriendo
wait

