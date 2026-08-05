import { query } from '../../../../lib/db';

const adminPassword = process.env.ADMIN_PASSWORD;

const requireAdminAuth = (req, res) => {
  if (!adminPassword) {
    res.status(500).json({ error: 'ADMIN_PASSWORD no configurada' });
    return false;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf-8');
  const [, password] = credentials.split(':');

  if (password !== adminPassword) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
};

export default async function handler(req, res) {
  if (!requireAdminAuth(req, res)) return;

  if (req.method === 'GET') {
    try {
      const { search, limit = 100, offset = 0, pending } = req.query;
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
      params.push(parseInt(limit, 10), parseInt(offset, 10));

      const result = await query(sql, params);
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error al obtener productos admin:', error);
      return res.status(500).json({ error: 'Error al obtener productos' });
    }
  }

  if (req.method === 'POST') {
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
        search_query,
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

      return res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error al crear producto admin:', error);
      return res.status(500).json({ error: 'Error al crear producto' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ error: 'Method not allowed' });
}
