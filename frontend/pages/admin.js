import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function Admin() {
  const [products, setProducts] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  const authHeader = password ? `Basic ${btoa(`:${password}`)}` : null;

  const fetchPendingProducts = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      setMessage('');

      const response = await axios.get(`${API_URL}/admin/products?pending=true&limit=200`, {
        headers: authHeader ? { Authorization: authHeader } : {}
      });

      setProducts(response.data);
      setLoggedIn(true);
    } catch (err) {
      console.error('Error fetching admin products:', err);
      setAuthError('No se pudieron cargar los productos. Verifica la contraseña de admin.');
      setLoggedIn(false);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!password) {
      setAuthError('Debes ingresar la contraseña de admin.');
      return;
    }
    await fetchPendingProducts();
  };

  const handleAffiliateChange = (id, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSave = async (product) => {
    const affiliateUrl = drafts[product.id] !== undefined ? drafts[product.id] : product.url_affiliate;
    if (!affiliateUrl || affiliateUrl.trim() === '') {
      setMessage('La URL de afiliado no puede quedar vacía.');
      return;
    }

    try {
      setSavingId(product.id);
      setMessage('');

      await axios.put(
        `${API_URL}/admin/products/${product.id}`,
        { url_affiliate: affiliateUrl.trim() },
        { headers: authHeader ? { Authorization: authHeader } : {} }
      );

      setProducts((prev) => prev.filter((item) => item.id !== product.id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      setMessage('URL de afiliado guardada correctamente. El producto ya está listo para publicación.');
    } catch (err) {
      console.error('Error saving affiliate URL:', err);
      setMessage('Error al guardar la URL de afiliado. Revisa la contraseña y el backend.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (product) => {
    const confirmDelete = window.confirm('¿Deseas eliminar este producto de forma permanente?');
    if (!confirmDelete) return;

    try {
      setSavingId(product.id);
      setMessage('');

      await axios.delete(`${API_URL}/admin/products/${product.id}`, {
        headers: authHeader ? { Authorization: authHeader } : {}
      });

      setProducts((prev) => prev.filter((item) => item.id !== product.id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      setMessage('Producto eliminado correctamente.');
    } catch (err) {
      console.error('Error deleting product:', err);
      setMessage('Error al eliminar el producto. Revisa la contraseña y el backend.');
    } finally {
      setSavingId(null);
    }
  };

  const pendingProducts = products.filter(
    (product) => !product.url_affiliate || product.url_affiliate.trim() === ''
  );

  return (
    <Layout title="Admin - DealRadar">
      <section className="admin-header">
        <div className="container">
          <h1>Panel de Administración</h1>
          <p>Revisa los productos pendientes y agrega la URL de afiliado antes de publicar.</p>

          <div className="admin-summary">
            <div>Total productos en espera: {pendingProducts.length}</div>
          </div>
        </div>
      </section>

      <section className="container admin-page">
        {!loggedIn && (
          <div className="admin-login-card">
            <h2>Acceso administrativo</h2>
            <p>Ingresa la contraseña de admin para ver los productos pendientes.</p>
            <form onSubmit={handleLogin} className="admin-login-form">
              <label htmlFor="adminPassword">Contraseña</label>
              <input
                id="adminPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña de admin"
              />
              <button type="submit">Ingresar</button>
              {authError && <div className="error-box">{authError}</div>}
            </form>
          </div>
        )}

        {loggedIn && (
          <>
            {message && <div className="message-box">{message}</div>}
            {loading && <p>Cargando productos...</p>}

            {!loading && pendingProducts.length === 0 && (
              <div className="empty-state">
                <h2>No hay productos pendientes</h2>
                <p>Todos los productos tienen URL de afiliado y están listos para publicación.</p>
              </div>
            )}

            {!loading && pendingProducts.length > 0 && (
              <div className="admin-list">
                {pendingProducts.map((product, index) => (
                  <div key={product.id} className="admin-card">
                    <div className="admin-card-header">
                      <div>
                        <h3>{product.title}</h3>
                        <p>{product.category || 'Sin categoría'} • {product.store || 'Sin tienda'}</p>
                      </div>
                      <div className="admin-card-price">
                        <strong>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(product.price)}</strong>
                      </div>
                    </div>

                    <div className="admin-card-body">
                      <div className="admin-field">
                        <label>Enlace original</label>
                        <a href={product.url} target="_blank" rel="noreferrer">Abrir</a>
                      </div>

                      <div className="admin-field">
                        <label>URL de afiliado</label>
                        <input
                          type="text"
                          value={drafts[product.id] !== undefined ? drafts[product.id] : product.url_affiliate || ''}
                          onChange={(e) => handleAffiliateChange(product.id, e.target.value)}
                          placeholder="https://www.mercadolibre.cl/..."
                        />
                      </div>

                      <div className="admin-actions">
                        <button
                          type="button"
                          onClick={() => handleSave(product)}
                          disabled={savingId === product.id}
                        >
                          {savingId === product.id ? 'Guardando...' : 'Guardar URL de afiliado'}
                        </button>
                        <button
                          type="button"
                          className="admin-delete-button"
                          onClick={() => handleDelete(product)}
                          disabled={savingId === product.id}
                        >
                          Eliminar producto
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </Layout>
  );
}
