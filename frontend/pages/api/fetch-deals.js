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

const MIN_DISCOUNT = 0.30;
const MELI_API_URL = process.env.MELI_API_URL || 'https://api.mercadolibre.com/sites/MLA/search';

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
          `${MELI_API_URL}?q=${encodeURIComponent(searchQuery)}`,
          {
            timeout: 15000,
            headers: { 'User-Agent': 'DealRadar/1.0' }
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
    }

    console.log(`✨ Scraper finalizado. Guardadas ${totalSaved} nuevas ofertas.`);
    res.status(200).json({ message: `Guardadas ${totalSaved} nuevas ofertas.` });
  } catch (error) {
    console.error('Error al ejecutar scraper:', error);
    res.status(500).json({ error: 'Error al ejecutar scraper' });
  }
}