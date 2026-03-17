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
      ORDER BY score DESC
      LIMIT $1
    `;

    const result = await query(sql, [parseInt(limit)]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener ranking:', error);
    res.status(500).json({ error: 'Error al obtener ranking' });
  }
}