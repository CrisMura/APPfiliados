import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = 10 } = req.query;

    const sql = `
      SELECT *,
        (discount * 100 + clicks) as score
      FROM products
      WHERE url_affiliate IS NOT NULL AND TRIM(url_affiliate) <> ''
      ORDER BY is_best_seller DESC, best_seller_rank ASC NULLS LAST, score DESC NULLS LAST, last_seen_at DESC NULLS LAST, created_at DESC
      LIMIT $1
    `;

    const result = await query(sql, [parseInt(limit, 10)]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener ranking:', error);
    res.status(500).json({ error: 'Error al obtener ranking' });
  }
}
