import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../lib/db';

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

const MIN_DISCOUNT = 0.10; // Temporalmente reducido para probar
const MELI_API_URL = process.env.MELI_API_URL || 'https://api.mercadolibre.com/sites/MLC/search';

export default async function handler(req, res) {
  if (!['POST', 'GET'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Ejecutando fetchDeals real desde API route');

    let totalSaved = 0;

    for (const searchQuery of SEARCH_QUERIES) {
      try {
        console.log(`🔎 Buscando ${searchQuery} en MercadoLibre...`);

        const response = await axios.get(MELI_API_URL, {
          params: { q: searchQuery },
          timeout: 15000,
          headers: {
            'User-Agent': 'DealRadar/1.0'
          }
        });

        const products = response.data.results || [];
        console.log(`   → Encontrados ${products.length} productos para ${searchQuery}`);

        for (const product of products) {
          try {
            const originalPrice = product.original_price || product.price;
            const currentPrice = product.price;

            if (!originalPrice || originalPrice <= currentPrice) continue;

            const discount = (originalPrice - currentPrice) / originalPrice;
            if (discount < MIN_DISCOUNT) continue;

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
      } catch (apiErr) {
        console.error(`   ❌ Error en API para ${searchQuery}:`, apiErr.message);
      }
    }

    console.log(`✨ Scraper real finalizado. Guardadas ${totalSaved} nuevas ofertas.`);
    res.status(200).json({ message: `Guardadas ${totalSaved} nuevas ofertas.` });
  } catch (error) {
    console.error('Error al ejecutar scraper:', error);
    res.status(500).json({ error: 'Error al ejecutar scraper' });
  }
}