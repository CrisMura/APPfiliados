-- Migración para crear la tabla products
-- DealRadar - Base de datos PostgreSQL

-- Crear extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    original_price NUMERIC(12, 2),
    discount NUMERIC(5, 4),
    image TEXT,
    url TEXT UNIQUE NOT NULL,
    store TEXT DEFAULT 'MercadoLibre',
    clicks INTEGER DEFAULT 0,
    category TEXT,
    search_query TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_products_discount ON products(discount DESC);
CREATE INDEX IF NOT EXISTS idx_products_clicks ON products(clicks DESC);
CREATE INDEX IF NOT EXISTS idx_products_url ON products(url);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_score ON products((discount * 100 + clicks));

-- Insertar datos de ejemplo (opcional)
-- INSERT INTO products (title, price, original_price, discount, image, url, store, category)
-- VALUES ('Producto de ejemplo', 100.00, 150.00, 0.33, 'https://http2.mlstatic.com/D_980749-MLA123456789_012014-I.jpg', 'https://articulo.mercadolibre.com.ar/MLA-123456789', 'MercadoLibre', 'tecnologia');

-- Verificar tabla
-- SELECT * FROM products LIMIT 10;

--统计
-- SELECT COUNT(*) as total_products, AVG(discount * 100) as avg_discount FROM products;

