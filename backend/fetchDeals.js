const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { query } = require('./db/config');
require('dotenv').config();

// Categorías que utiliza el servidor para buscar ofertas
const SEARCH_QUERIES = [
  'tecnologia',
  'hogar',
  'herramientas',
  'deportes',
  'electrodomesticos',
  'celulares',
  'notebooks',
  'televisores'
];

// Descuento mínimo para considerar una oferta
const MIN_DISCOUNT = parseFloat(process.env.MIN_DISCOUNT) || 0.30;

/**
 * Ejecuta el scraper de MercadoLibre y guarda resultados en la base de datos.
 * Devuelve la cantidad de nuevas ofertas insertadas.
 */
async function fetchDeals() {
  console.log('🚀 fetchDeals desde backend/fetchDeals.js');
  let totalSaved = 0;

  for (const searchQuery of SEARCH_QUERIES) {
    try {
      console.log(`📦 Buscando ${searchQuery}...`);

      const response = await axios.get(
        `${process.env.MELI_API_URL}?q=${encodeURIComponent(searchQuery)}`,
        {
          timeout: 15000,
          headers: { 'User-Agent': 'DealRadar/1.0 (https://dealradar.com)' }
        }
      );

      const products = response.data.results || [];
      console.log(`   -> Encontrados ${products.length} productos`);

      for (const product of products) {
        try {
          const originalPrice = product.original_price || product.price;
          const currentPrice = product.price;

          if (!originalPrice || originalPrice <= currentPrice) continue;

          const discount = (originalPrice - currentPrice) / originalPrice;
          if (discount < MIN_DISCOUNT) continue;

          // Evitar duplicados
          const exists = await query('SELECT id FROM products WHERE url = $1', [product.permalink]);
          if (exists.rows.length > 0) continue;

          await query(
            `INSERT INTO products (id, title, price, original_price, discount, image, url, store, category, search_query)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
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
        } catch (prodErr) {
          console.error('   ❌ Error procesando producto:', prodErr.message);
        }
      }
    } catch (err) {
      console.error(`   ❌ Error en API para ${searchQuery}:`, err.message);
    }
  }

  console.log(`✨ Scraper finalizado. Guardadas ${totalSaved} nuevas ofertas.`);
  return totalSaved;
}

module.exports = { fetchDeals };

// Si se invoca directamente desde la línea de comandos, ejecutar el scraper
if (require.main === module) {
  fetchDeals()
    .then(() => {
      console.log('Proceso finalizado');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error fatal al ejecutar fetchDeals:', err);
      process.exit(1);
    });
}