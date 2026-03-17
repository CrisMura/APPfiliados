const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const { pool, initDatabase, query } = require('./db/config');
const dealsRouter = require('./routes/deals');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Rutas de API
app.use('/api', dealsRouter);

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// reutilizar la lógica del scraper desde el módulo dedicado
const { fetchDeals } = require('./fetchDeals');


// Programar el scraper cada hora usando node-cron
cron.schedule('0 * * * *', () => {
  console.log('\n⏰ Ejecutando tarea programada (cada hora)...');
  fetchDeals();
});

// Iniciar servidor
const startServer = async () => {
  try {
    // Inicializar base de datos
    await initDatabase();
    console.log('✅ Base de datos inicializada');
    
    // Ejecutar scraper al iniciar (opcional)
    // await fetchDeals();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📊 Endpoint de ofertas: http://localhost:${PORT}/api/deals`);
      console.log(`⏰ Scraper programado para ejecutarse cada hora`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;

