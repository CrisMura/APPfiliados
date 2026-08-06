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

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await query('SELECT * FROM products WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      return res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Error al obtener producto admin:', error);
      return res.status(500).json({ error: 'Error al obtener producto' });
    }
  }

  if (req.method === 'PUT') {
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

      updates.push('discount = $' + (params.length + 1));
      params.push(discount);

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No hay campos para actualizar' });
      }

      const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = $${params.length + 1} RETURNING *`;
      params.push(id);

      const result = await query(sql, params);
      return res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      return res.status(500).json({ error: 'Error al actualizar producto' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await query('DELETE FROM products WHERE id = $1', [id]);
      return res.status(204).end();
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      return res.status(500).json({ error: 'Error al eliminar producto' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}
