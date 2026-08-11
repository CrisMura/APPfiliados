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
  const [storyPublishingId, setStoryPublishingId] = useState(null);

  const buildAuthHeaders = (pw) => {
    const value = pw || password;
    return value ? { Authorization: `Basic ${btoa(`:${value}`)}` } : {};
  };

  const authHeaders = buildAuthHeaders();

  const fetchProducts = async (pw) => {
    try {
      setLoading(true);
      setAuthError(null);
      setMessage('');

      const response = await axios.get(`${API_URL}/admin/products?limit=200`, {
        headers: buildAuthHeaders(pw),
      });

      setProducts(response.data);
      setLoggedIn(true);
      return true;
    } catch (err) {
      console.error('Error fetching admin products:', err);
      if (err.response?.status === 401) {
        sessionStorage.removeItem('adminPassword');
        setPassword('');
      }
      setAuthError('No se pudieron cargar los productos. Verifica la contraseña de admin.');
      setLoggedIn(false);
      setProducts([]);
      return false;
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

    const success = await fetchProducts(password);
    if (success) {
      sessionStorage.setItem('adminPassword', password);
    }
  };

  const handleAffiliateChange = (id, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminPassword');
    setPassword('');
    setLoggedIn(false);
    setProducts([]);
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

      const response = await axios.put(
        `${API_URL}/admin/products/${product.id}`,
        { url_affiliate: affiliateUrl.trim() },
        { headers: authHeaders }
      );

      setProducts((prev) => prev.map((item) => item.id === product.id ? { ...item, url_affiliate: response.data.url_affiliate } : item));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      setMessage('URL de afiliado guardada correctamente. El producto se mantiene en el listado.');
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
        headers: authHeaders
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









const handlePublishInstagramStory = async (product) => {
  setStoryPublishingId(product.id);
  setMessage('');

  const shareUrl = product.url_affiliate?.trim();
  const shareText = `Link de compra\n${shareUrl}`;
  const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  let copiadoExitoso = false;
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      copiadoExitoso = true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = shareText;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      textArea.setSelectionRange(0, 99999);
      copiadoExitoso = document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  } catch (clipboardError) {
    console.warn("Fallo el copiado inmediato:", clipboardError);
  }

  if (copiadoExitoso) {
    setMessage(esMovil
      ? '¡Enlace copiado! Abriendo Instagram Stories...'
      : 'Texto copiado al portapapeles. Abre Instagram en tu móvil.'
    );
  } else {
    window.prompt('Copia este texto para publicar en Instagram Stories:', shareText);
    setMessage('Usa el texto copiado para publicar en Instagram Stories.');
  }

  if (esMovil) {
    // NUEVA URL: Utiliza el compartidor oficial de Meta que genera la previsualización interactiva de tu enlace
    const metaShareUrl = `https://instagram.com{encodeURIComponent(shareUrl)}`;
    window.location.href = metaShareUrl;

    setTimeout(() => {
      if (document.hidden) return;
      const esiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      window.location.href = esiOS ? "https://apple.com" : "https://google.com";
    }, 2500);
  }

  try {
    await axios.put(
      `${API_URL}/admin/products/${product.id}`,
      { shared_instagram: true },
      { headers: authHeaders }
    );

    setProducts((prev) =>
      prev.map((item) =>
        item.id === product.id ? { ...item, shared_instagram: true } : item
      )
    );
  } catch (apiError) {
    console.error('Error al actualizar el estado en el servidor:', apiError);
  } finally {
    setStoryPublishingId(null);
  }
};




















  const pendingCount = products.filter(
    (product) => !product.url_affiliate || product.url_affiliate.trim() === ''
  ).length;

  useEffect(() => {
    const savedPassword = sessionStorage.getItem('adminPassword');
    if (savedPassword) {
      setPassword(savedPassword);
      fetchProducts(savedPassword);
    }
  }, []);

  return (
    <Layout
      title="Admin - DealRadar"
      navActions={loggedIn ? (
        <button type="button" className="header-logout-button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      ) : null}
    >
      <section className="admin-header">
        <div className="container">
          <h1>Panel de Administración</h1>
          <p>Revisa los productos y administra sus enlaces de afiliado e historial de Instagram.</p>

          <div className="admin-summary">
            <div>Total productos: {products.length}</div>
            <div>Productos sin URL de afiliado: {pendingCount}</div>
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

            {!loading && products.length === 0 && (
              <div className="empty-state">
                <h2>No hay productos</h2>
                <p>No se encontraron productos en el listado administrativo.</p>
              </div>
            )}

            {!loading && products.length > 0 && (
              <div className="admin-list">
                {products.map((product, index) => (
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
                      <div className="admin-card-meta">
                        <span className={`shared-badge ${product.shared_instagram ? 'shared-yes' : 'shared-no'}`}>
                          <svg className={`instagram-icon ${product.shared_instagram ? 'small' : 'small'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                            <linearGradient id="igGrad" x1="0%" x2="100%">
                              <stop offset="0%" stopColor="#f58529" />
                              <stop offset="50%" stopColor="#dd2a7b" />
                              <stop offset="100%" stopColor="#8134af" />
                            </linearGradient>
                            <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#igGrad)" />
                            <circle cx="12" cy="12" r="3.2" fill="#fff" />
                            <circle cx="17.5" cy="6.5" r="0.9" fill="#fff" />
                          </svg>
                          {product.shared_instagram ? 'Compartido en Instagram' : 'No compartido'}
                        </span>
                      </div>
                      <div className="admin-field admin-link-row">
                        <label>Enlace original</label>
                        <div className="admin-link-preview">
                          <a href={product.url} target="_blank" rel="noreferrer">Abrir</a>
                          {product.image && (
                            <img src={product.image} alt={product.title} />
                          )}
                        </div>
                      </div>

                      <div className="admin-field">
                        <label>URL de afiliado</label>
                        <input
                          type="text"
                          value={drafts[product.id] !== undefined ? drafts[product.id] : product.url_affiliate || ''}
                          onChange={(e) => handleAffiliateChange(product.id, e.target.value)}
                          placeholder=""
                        />
                      </div>

                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-story-button"
                          onClick={() => handlePublishInstagramStory(product)}
                          disabled={storyPublishingId === product.id}
                        >
                          {storyPublishingId === product.id ? (
                            'Compartiendo...'
                          ) : (
                            <>
                              <svg className="instagram-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                                <linearGradient id="igBtnGrad" x1="0%" x2="100%">
                                  <stop offset="0%" stopColor="#f58529" />
                                  <stop offset="50%" stopColor="#dd2a7b" />
                                  <stop offset="100%" stopColor="#8134af" />
                                </linearGradient>
                                <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#igBtnGrad)" />
                                <circle cx="12" cy="12" r="3.2" fill="#fff" />
                                <circle cx="17.5" cy="6.5" r="0.9" fill="#fff" />
                              </svg>
                              <span style={{ marginLeft: 8 }}>Publicar historia de Instagram</span>
                            </>
                          )}
                        </button>
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
