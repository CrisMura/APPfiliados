import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const result = await query('SELECT url_affiliate, url FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const { url_affiliate, url } = result.rows[0];
    const redirectUrl = url_affiliate && url_affiliate.trim() !== '' ? url_affiliate : url;

    await query('UPDATE products SET clicks = clicks + 1 WHERE id = $1', [id]);
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error al redireccionar:', error);
    return res.status(500).json({ error: 'Error al redireccionar' });
  }
}
