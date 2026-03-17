import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const totalProducts = await query('SELECT COUNT(*) as total FROM products');
    const avgDiscount = await query('SELECT AVG(discount * 100) as avg_discount FROM products');
    const totalClicks = await query('SELECT SUM(clicks) as total_clicks FROM products');

    res.status(200).json({
      totalProducts: parseInt(totalProducts.rows[0].total),
      avgDiscount: parseFloat(avgDiscount.rows[0].avg_discount || 0).toFixed(2),
      totalClicks: parseInt(totalClicks.rows[0].total_clicks || 0)
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
}