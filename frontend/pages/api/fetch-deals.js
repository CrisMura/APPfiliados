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

    // Mock data para probar la app
    const mockProducts = [
      {
        title: 'Notebook Lenovo IdeaPad 3',
        price: 450000,
        original_price: 600000,
        discount: 0.25,
        image: 'https://http2.mlstatic.com/D_NQ_NP_123456-MLA12345678_012023-I.jpg',
        url: 'https://articulo.mercadolibre.cl/MLC-123456789',
        store: 'MercadoLibre',
        category: 'tecnologia',
        search_query: 'tecnologia'
      },
      {
        title: 'Smart TV Samsung 43"',
        price: 250000,
        original_price: 350000,
        discount: 0.2857,
        image: 'https://http2.mlstatic.com/D_NQ_NP_987654-MLA98765432_012023-I.jpg',
        url: 'https://articulo.mercadolibre.cl/MLC-987654321',
        store: 'MercadoLibre',
        category: 'tecnologia',
        search_query: 'tecnologia'
      }
    ];

    let totalSaved = 0;
    for (const product of mockProducts) {
      try {
        // Evitar duplicados
        const exists = await query('SELECT id FROM products WHERE url = $1', [product.url]);
        if (exists.rows.length > 0) continue;

        await query(
          `INSERT INTO products (id, title, price, original_price, discount, image, url, store, category, search_query)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            uuidv4(),
            product.title,
            product.price,
            product.original_price,
            product.discount,
            product.image,
            product.url,
            product.store,
            product.category,
            product.search_query
          ]
        );
        totalSaved++;
        console.log(`   -> Producto guardado: ${product.title}`);
      } catch (prodErr) {
        console.error('   ❌ Error procesando producto:', prodErr.message);
      }
    }

    console.log(`✨ Scraper finalizado. Guardadas ${totalSaved} ofertas mock.`);
    res.status(200).json({ message: `Guardadas ${totalSaved} ofertas mock.` });
  } catch (error) {
    console.error('Error al ejecutar scraper:', error);
    res.status(500).json({ error: 'Error al ejecutar scraper' });
  }
}