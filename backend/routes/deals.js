const express = require('express');
const router = express.Router();
const { query } = require('../db/config');
require('dotenv').config();

const adminPassword = process.env.ADMIN_PASSWORD;

const requireAdminAuth = (req, res, next) => {
  if (!adminPassword) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD no configurada' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf-8');
  const [, password] = credentials.split(':');

  if (password !== adminPassword) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

const publicProductsWhere = "url_affiliate IS NOT NULL AND TRIM(url_affiliate) <> ''";
const publicProductsOrder = 'is_best_seller DESC, best_seller_rank ASC NULLS LAST, last_seen_at DESC NULLS LAST, created_at DESC';

// GET /api/deals - Devuelve todas las ofertas publicadas (solo con url_affiliate)
router.get('/deals', async (req, res) => {
  try {
    const { category, limit = 50 } = req.query;
    
    let sql = `SELECT * FROM products WHERE ${publicProductsWhere}`;
    const params = [];
    
    if (category) {
      sql += ' AND LOWER(category) LIKE $1';
      params.push(`%${category.toLowerCase()}%`);
    }
    
    sql += ` ORDER BY ${publicProductsOrder} LIMIT $` + (params.length + 1);
    params.push(parseInt(limit));
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ofertas:', error);
    res.status(500).json({ error: 'Error al obtener ofertas' });
  }
});

// GET /api/admin/products - Listar productos protegidos por admin
router.get('/admin/products', requireAdminAuth, async (req, res) => {
  try {
    const { limit = 100, offset = 0, search, pending } = req.query;
    let sql = 'SELECT * FROM products';
    const filters = [];
    const params = [];

    if (search) {
      filters.push('(LOWER(title) LIKE $' + (params.length + 1) + ' OR LOWER(category) LIKE $' + (params.length + 1) + ')');
      params.push(`%${search.toLowerCase()}%`);
    }

    if (pending === 'true' || pending === '1') {
      filters.push('(url_affiliate IS NULL OR TRIM(url_affiliate) = \'\')');
    }

    if (filters.length > 0) {
      sql += ' WHERE ' + filters.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener productos admin:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/admin/products/:id - Obtener producto específico para admin
router.get('/admin/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener producto admin:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// POST /api/admin/products - Crear producto con enlace de afiliado
router.post('/admin/products', requireAdminAuth, async (req, res) => {
  try {
    const {
      title,
      price,
      original_price,
      image,
      url,
      store,
      category,
      url_affiliate,
      search_query
    } = req.body;

    if (!title || !price || !url) {
      return res.status(400).json({ error: 'title, price y url son obligatorios' });
    }

    const discount = original_price && original_price > price
      ? (original_price - price) / original_price
      : null;

    const result = await query(
      `INSERT INTO products (title, price, original_price, discount, image, url, store, category, url_affiliate, search_query)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [title, price, original_price, discount, image, url, store, category, url_affiliate, search_query]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// PUT /api/admin/products/:id - Actualizar producto y enlace de afiliado
router.put('/admin/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      price,
      original_price,
      image,
      url,
      store,
      category,
      url_affiliate,
      search_query
    } = req.body;

    const existing = await query('SELECT price, original_price FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const current = existing.rows[0];
    const newPrice = price !== undefined ? price : current.price;
    const newOriginalPrice = original_price !== undefined ? original_price : current.original_price;
    const discount = newOriginalPrice && newOriginalPrice > newPrice
      ? (newOriginalPrice - newPrice) / newOriginalPrice
      : null;

    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = $' + (params.length + 1)); params.push(title); }
    if (price !== undefined) { updates.push('price = $' + (params.length + 1)); params.push(price); }
    if (original_price !== undefined) { updates.push('original_price = $' + (params.length + 1)); params.push(original_price); }
    if (image !== undefined) { updates.push('image = $' + (params.length + 1)); params.push(image); }
    if (url !== undefined) { updates.push('url = $' + (params.length + 1)); params.push(url); }
    if (store !== undefined) { updates.push('store = $' + (params.length + 1)); params.push(store); }
    if (category !== undefined) { updates.push('category = $' + (params.length + 1)); params.push(category); }
    if (url_affiliate !== undefined) { updates.push('url_affiliate = $' + (params.length + 1)); params.push(url_affiliate); }
    if (search_query !== undefined) { updates.push('search_query = $' + (params.length + 1)); params.push(search_query); }

    // Always update discount if price/original_price changed or if provided explicitly
    updates.push('discount = $' + (params.length + 1));
    params.push(discount);

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = $${params.length + 1} RETURNING *`;
    params.push(id);

    const result = await query(sql, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
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
      WHERE ${publicProductsWhere}
      ORDER BY is_best_seller DESC, best_seller_rank ASC NULLS LAST, score DESC NULLS LAST, last_seen_at DESC NULLS LAST, created_at DESC
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
    const result = await query(
      `SELECT * FROM products WHERE id = $1 AND ${publicProductsWhere}`,
      [id]
    );
    
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
    
    const result = await query('SELECT url_affiliate FROM products WHERE id = $1', [id]);
    
    if (result.rows.length === 0 || !result.rows[0].url_affiliate || result.rows[0].url_affiliate.trim() === '') {
      return res.status(404).json({ error: 'Producto no publicado o no encontrado' });
    }

    await query('UPDATE products SET clicks = clicks + 1 WHERE id = $1', [id]);
    res.redirect(result.rows[0].url_affiliate);
  } catch (error) {
    console.error('Error al redireccionar:', error);
    res.status(500).json({ error: 'Error al redireccionar' });
  }
});

// GET /api/stats - Estadísticas del sistema
router.get('/stats', async (req, res) => {
  try {
    const totalProducts = await query(`SELECT COUNT(*) as total FROM products WHERE ${publicProductsWhere}`);
    const avgDiscount = await query(`SELECT AVG(discount * 100) as avg_discount FROM products WHERE ${publicProductsWhere}`);
    const totalClicks = await query(`SELECT SUM(clicks) as total_clicks FROM products WHERE ${publicProductsWhere}`);
    
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
