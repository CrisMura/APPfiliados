/**
 * Script para obtener ofertas de MercadoLibre
 * Este script consulta la API de MercadoLibre, filtra productos con descuento >30%
 * y los guarda en la base de datos PostgreSQL.
 * 
 * Uso: node scripts/fetchDeals.js
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const { pool, initDatabase, query } = require('../backend/db/config');

// Categorías de búsqueda
const SEARCH_QUERIES = [
  'tecnologia',
  'hogar',
  'herramientas',
  'deportes',
  'electrodomesticos',
  'celulares',
  'notebooks',
  'televisores',
  'audifonos',
  'cámaras'
];

// Descuento mínimo para guardar
const MIN_DISCOUNT = parseFloat(process.env.MIN_DISCOUNT) || 0.30;

/**
 * Función principal para obtener ofertas
 */
async function fetchDeals() {
  console.log('🚀 DealRadar - Scraper de MercadoLibre\n');
  console.log('='.repeat(50));
  
  let totalSaved = 0;
  let totalProcessed = 0;
  
  for (const searchQuery of SEARCH_QUERIES) {
    console.log(`\n📦 Buscando: "${searchQuery}"...`);
    
    try {
      const response = await axios.get(
        `${process.env.MELI_API_URL}?q=${encodeURIComponent(searchQuery)}`,
        {
          timeout: 15000,
          headers: {
            'User-Agent': 'DealRadar/1.0 (https://dealradar.com)'
          }
        }
      );
      
      const products = response.data.results;
      console.log(`   → Encontrados ${products.length} productos`);
      
      for (const product of products) {
        totalProcessed++;
        
        try {
          const originalPrice = product.original_price || product.price;
          const currentPrice = product.price;
          
          // Saltar si no hay precio original o no hay descuento
          if (!originalPrice || originalPrice <= currentPrice) continue;
          
          // Calcular descuento
          const discount = (originalPrice - currentPrice) / originalPrice;
          
          // Solo guardar si el descuento es mayor al mínimo
          if (discount >= MIN_DISCOUNT) {
            // Verificar si ya existe para evitar duplicados
            const existingProduct = await query(
              'SELECT id FROM products WHERE url = $1',
              [product.permalink]
            );
            
            if (existingProduct.rows.length === 0) {
              // Insertar nuevo producto
              await query(
                `INSERT INTO products (id, title, price, original_price, discount, image, url, store, category, search_query)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                  uuidv4(),
                  product.title,
                  currentPrice,
                  originalPrice,
                  discount,
                  product.thumbnail,
                  product.permalink,
                  'MercadoLibre',
                  searchQuery,
                  searchQuery
                ]
              );
              
              totalSaved++;
              const discountPercent = (discount * 100).toFixed(0);
              console.log(`   ✅ ${discountPercent}% OFF: ${product.title.substring(0, 45)}...`);
            }
          }
        } catch (productError) {
          console.error(`   ❌ Error procesando producto:`, productError.message);
        }
      }
    } catch (apiError) {
      console.error(`   ❌ Error en API para ${searchQuery}:`, apiError.message);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 RESUMEN:`);
  console.log(`   • Productos procesados: ${totalProcessed}`);
  console.log(`   • Nuevas ofertas guardadas: ${totalSaved}`);
  console.log(`   • Total ofertas en DB: ${(await query('SELECT COUNT(*) FROM products')).rows[0].count}`);
  console.log('='.repeat(50));
  console.log('✨ Scraper completado!\n');
  
  return totalSaved;
}

/**
 * Función para limpiar ofertas antiguas (más de 7 días)
 */
async function cleanOldDeals() {
  console.log('🧹 Limpiando ofertas antiguas...');
  
  const result = await query(
    `DELETE FROM products 
     WHERE created_at < NOW() - INTERVAL '7 days'`
  );
  
  console.log(`   → Eliminadas ${result.rowCount} ofertas antiguas`);
}

/**
 * Función para mostrar estadísticas
 */
async function showStats() {
  const totalProducts = await query('SELECT COUNT(*) as total FROM products');
  const avgDiscount = await query('SELECT AVG(discount * 100) as avg_discount FROM products');
  const topDiscount = await query('SELECT MAX(discount * 100) as max_discount FROM products');
  
  console.log('\n📈 ESTADÍSTICAS:');
  console.log(`   • Total ofertas: ${totalProducts.rows[0].total}`);
  console.log(`   • Descuento promedio: ${parseFloat(avgDiscount.rows[0].avg_discount || 0).toFixed(1)}%`);
  console.log(`   • Mayor descuento: ${parseFloat(topDiscount.rows[0].max_discount || 0).toFixed(1)}%`);
}

// Ejecución principal
const main = async () => {
  try {
    // Inicializar base de datos
    await initDatabase();
    console.log('✅ Base de datos conectada\n');
    
    // Ejecutar scraper
    await fetchDeals();
    
    // Mostrar estadísticas
    await showStats();
    
    // Limpiar ofertas antiguas
    await cleanOldDeals();
    
    // Cerrar conexión
    await pool.end();
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    await pool.end();
    process.exit(1);
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { fetchDeals, cleanOldDeals, showStats };

