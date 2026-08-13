import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import DealCard from '../../components/DealCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function Ofertas() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/deals?limit=100`);
        setDeals(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching deals:', err);
        setError('Error al cargar las ofertas');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const pageTitle = 'Todas las ofertas - RadarOfertas';
  const pageDescription = 'Ver todas las ofertas cargadas manualmente. Tecnología, hogar, herramientas y más.';

  return (
    <Layout title={pageTitle}>
      <section className="category-header">
        <h1>🔥 Todas las ofertas</h1>
        <p>Las mejores ofertas cargadas manualmente en un solo lugar</p>
      </section>

      <section className="container">
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        )}

        {error && (
          <div className="error">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && deals.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3 className="empty-title">No hay ofertas disponibles</h3>
            <p>Próximamente más ofertas</p>
          </div>
        )}

        {!loading && !error && deals.length > 0 && (
          <div className="deals-grid">
            {deals.map((product) => (
              <DealCard 
                key={product.id} 
                product={product}
                showBestBadge={product.discount > 0.5}
              />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}

