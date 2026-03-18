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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Ejecutando fetchDeals desde API route');
    let totalSaved = 0;

    for (const searchQuery of SEARCH_QUERIES) {
      try {
        console.log(`📦 Buscando ${searchQuery}...`);

        const response = await axios.get(
          `${MELI_API_URL}?q=${encodeURIComponent(searchQuery)}&access_token=${process.env.MELI_ACCESS_TOKEN}`,
          {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
              'Referer': 'https://www.mercadolibre.cl/',
              'DNT': '1'
            }
          }
        );

        console.log(`   -> Respuesta de API: ${response.status}, productos encontrados: ${response.data.results ? response.data.results.length : 0}`);

        for (const product of products) {
          try {
            const originalPrice = product.original_price || product.price;
            const currentPrice = product.price;

            if (!originalPrice || originalPrice <= currentPrice) continue;

            const discount = (originalPrice - currentPrice) / originalPrice;
            if (discount < MIN_DISCOUNT) {
              console.log(`   -> Producto descartado por descuento bajo: ${discount} < ${MIN_DISCOUNT}`);
              continue;
            }

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
            console.log(`   -> Producto guardado: ${product.title.substring(0, 50)}... con descuento ${discount}`);
          } catch (prodErr) {
            console.error('   ❌ Error procesando producto:', prodErr.message);
          }
        }
      } catch (err) {
        console.error(`   ❌ Error en API para ${searchQuery}:`, err.message);
      }

      // Delay de 2 segundos entre requests para evitar rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`✨ Scraper finalizado. Guardadas ${totalSaved} nuevas ofertas.`);
    res.status(200).json({ message: `Guardadas ${totalSaved} nuevas ofertas.` });
  } catch (error) {
    console.error('Error al ejecutar scraper:', error);
    res.status(500).json({ error: 'Error al ejecutar scraper' });
  }
}