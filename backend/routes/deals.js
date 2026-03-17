const express = require('express');
const router = express.Router();
const { pool, query } = require('../db/config');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// GET /api/deals - Devuelve todas las ofertas ordenadas por mayor descuento
router.get('/deals', async (req, res) => {
  try {
    const { category, limit = 50 } = req.query;
    
    let sql = 'SELECT * FROM products';
    const params = [];
    
    if (category) {
      sql += ' WHERE category = $1';
      params.push(category);
    }
    
    sql += ' ORDER BY discount DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ofertas:', error);
    res.status(500).json({ error: 'Error al obtener ofertas' });
  }
});

// GET /api/deals/ranking - Devuelve ofertas con mayor score (discount + clicks)
router.get('/deals/ranking', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const sql = `
      SELECT *, 
        (discount * 100 + clicks) as score 
      FROM products 
      ORDER BY score DESC 
      LIMIT $1
    `;
    
    const result = await query(sql, [parseInt(limit)]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ranking:', error);
    res.status(500).json({ error: 'Error al obtener ranking' });
  }
});

// GET /api/deals/:id - Devuelve una oferta específica
router.get('/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM products WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Oferta no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener oferta:', error);
    res.status(500).json({ error: 'Error al obtener oferta' });
  }
});

// GET /go/:id - Incrementa clicks y redirige a la URL del producto
router.get('/go/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener la URL del producto
    const result = await query('SELECT url FROM products WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    // Incrementar contador de clicks
    await query('UPDATE products SET clicks = clicks + 1 WHERE id = $1', [id]);
    
    // Redireccionar a la URL del producto
    res.redirect(result.rows[0].url);
  } catch (error) {
    console.error('Error al redireccionar:', error);
    res.status(500).json({ error: 'Error al redireccionar' });
  }
});

// POST /api/fetch-deals - Ejecuta manualmente el scraper
router.post('/fetch-deals', async (req, res) => {
  try {
    const searchQueries = [
      'tecnologia',
      'hogar',
      'herramientas',
      'deportes',
      'electrodomesticos'
    ];
    
    const minDiscount = parseFloat(process.env.MIN_DISCOUNT) || 0.30;
    let totalSaved = 0;
    
    for (const searchQuery of searchQueries) {
      const response = await axios.get(
        `${process.env.MELI_API_URL}?q=${encodeURIComponent(searchQuery)}`,
        { timeout: 10000 }
      );
      
      const products = response.data.results;
      
      for (const product of products) {
        const originalPrice = product.original_price || product.price;
        const currentPrice = product.price;
        
        if (!originalPrice || originalPrice <= currentPrice) continue;
        
        const discount = (originalPrice - currentPrice) / originalPrice;
        
        if (discount >= minDiscount) {
          // Verificar si ya existe
          const existingProduct = await query(
            'SELECT id FROM products WHERE url = $1',
            [product.permalink]
          );
          
          if (existingProduct.rows.length === 0) {
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
          }
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: `Se guardaron ${totalSaved} nuevas ofertas`,
      totalSaved 
    });
  } catch (error) {
    console.error('Error al ejecutar scraper:', error);
    res.status(500).json({ error: 'Error al ejecutar scraper' });
  }
});

// GET /api/stats - Estadísticas del sistema
router.get('/stats', async (req, res) => {
  try {
    const totalProducts = await query('SELECT COUNT(*) as total FROM products');
    const avgDiscount = await query('SELECT AVG(discount * 100) as avg_discount FROM products');
    const totalClicks = await query('SELECT SUM(clicks) as total_clicks FROM products');
    
    res.json({
      totalProducts: parseInt(totalProducts.rows[0].total),
      avgDiscount: parseFloat(avgDiscount.rows[0].avg_discount || 0).toFixed(2),
      totalClicks: parseInt(totalClicks.rows[0].total_clicks || 0)
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;

