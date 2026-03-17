import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener ofertas:', error);
    res.status(500).json({ error: 'Error al obtener ofertas' });
  }
}