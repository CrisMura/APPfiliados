const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err, client) => {
  console.error('Error inesperado en el cliente de base de datos', err);
});

// Función para ejecutar queries
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
};

// Función para inicializar la base de datos
const initDatabase = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      price NUMERIC(12, 2) NOT NULL,
      original_price NUMERIC(12, 2),
      discount NUMERIC(5, 4),
      image TEXT,
      url TEXT UNIQUE NOT NULL,
      store TEXT DEFAULT 'MercadoLibre',
      category TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      clicks INTEGER DEFAULT 0
    );
  `;
  await query(createTableSQL);
};

module.exports = { pool, query, initDatabase };