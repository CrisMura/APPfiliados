const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { initDatabase } = require('./db/config');
const dealsRouter = require('./routes/deals');
const { updateMeliBestSellers } = require('./services/meliBestSellers');

const app = express();
const PORT = process.env.PORT || 5000;
let scheduledJob;

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

// Iniciar servidor
const startServer = async () => {
  try {
    // Inicializar base de datos
    await initDatabase();
    console.log('✅ Base de datos inicializada');

    scheduledJob = cron.schedule('*/5 * * * *', async () => {
      try {
        await updateMeliBestSellers();
      } catch (error) {
        console.error('❌ Error actualizando ranking Meli:', error.message);
      }
    });

    if (process.env.MELI_SYNC_ON_START !== 'false') {
      updateMeliBestSellers().catch((error) => {
        console.error('❌ Error en actualización inicial Meli:', error.message);
      });
    }
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📊 Endpoint de ofertas: http://localhost:${PORT}/api/deals`);
      console.log('⏰ Ranking Meli programado cada 5 minutos');
    });
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;

process.on('SIGTERM', () => scheduledJob?.stop());
