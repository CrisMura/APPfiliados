import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category, limit = 50 } = req.query;

    let sql = "SELECT * FROM products WHERE is_best_seller = TRUE AND url_affiliate IS NOT NULL AND TRIM(url_affiliate) <> ''";
    const params = [];

    if (category) {
      sql += ' AND LOWER(category) LIKE $1';
      params.push(`%${category.toLowerCase()}%`);
    }

    sql += ' ORDER BY best_seller_rank ASC NULLS LAST LIMIT $' + (params.length + 1);
    params.push(parseInt(limit, 10));

    const result = await query(sql, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener ofertas:', error);
    res.status(500).json({ error: 'Error al obtener ofertas' });
  }
}
