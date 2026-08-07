const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'dealradar',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err, client) => {
  console.error('Error inesperado en el cliente de base de datos', err);
});

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
      url_affiliate TEXT,
      store TEXT DEFAULT 'DealRadar',
      clicks INTEGER DEFAULT 0,
      category TEXT,
      search_query TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_products_discount ON products(discount DESC);
    CREATE INDEX IF NOT EXISTS idx_products_clicks ON products(clicks DESC);
    CREATE INDEX IF NOT EXISTS idx_products_url ON products(url);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
  `;

  try {
    await pool.query(createTableSQL);
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS url_affiliate TEXT');
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS meli_id TEXT');
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN NOT NULL DEFAULT FALSE');
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS best_seller_rank INTEGER');
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP');
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_products_meli_id ON products(meli_id) WHERE meli_id IS NOT NULL');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_products_best_seller_rank ON products(is_best_seller, best_seller_rank)');
    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
};

module.exports = {
  pool,
  initDatabase,
  query: (text, params) => pool.query(text, params),
};
