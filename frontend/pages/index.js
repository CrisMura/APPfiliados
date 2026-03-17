import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import DealCard from '../components/DealCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function Home() {
  const [deals, setDeals] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [stats, setStats] = useState({ totalProducts: 0, avgDiscount: 0, totalClicks: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch deals
        const dealsResponse = await axios.get(`${API_URL}/deals?limit=50`);
        setDeals(dealsResponse.data);
        
        // Fetch ranking
        const rankingResponse = await axios.get(`${API_URL}/deals/ranking?limit=5`);
        setRanking(rankingResponse.data);
        
        // Fetch stats
        const statsResponse = await axios.get(`${API_URL}/stats`);
        setStats(statsResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error al cargar las ofertas. Asegúrate de que el backend esté corriendo.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Layout title="DealRadar - Las mejores ofertas de MercadoLibre">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>📡 DealRadar</h1>
          <p>Descubre los mejores descuentos en MercadoLibre. Ofertas actualizadas automáticamente cada hora.</p>
          
          <div className="stats-bar">
            <div className="stat-item">
              <div className="stat-number">{stats.totalProducts}</div>
              <div className="stat-label">Ofertas</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{stats.avgDiscount}%</div>
              <div className="stat-label">Descuento Promedio</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{stats.totalClicks}</div>
              <div className="stat-label">Clics Totales</div>
            </div>
          </div>
        </div>
      </section>

      {/* Ranking Section */}
      {ranking.length > 0 && (
        <section className="ranking-section">
          <div className="container">
            <h2 className="section-title">
              <span className="section-title-icon">🏆</span>
              Mejores ofertas del día
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {ranking.map((product, index) => (
                <a 
                  key={product.id}
                  href={`/go/${product.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ranking-card"
                >
                  <div className="ranking-number">#{index + 1}</div>
                  <img 
                    src={product.image} 
                    alt={product.title}
                    className="ranking-image"
                  />
                  <div className="ranking-info">
                    <div className="ranking-title">{product.title}</div>
                    <div className="ranking-stats">
                      {Math.round(product.discount * 100)}% OFF • {product.clicks} clics
                    </div>
                  </div>
                  <div className="ranking-discount">
                    {Math.round(product.discount * 100)}%
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Deals Section */}
      <section className="container">
        <h2 className="section-title">
          <span className="section-title-icon">🔥</span>
          Todas las ofertas
        </h2>
        
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
            <p>Asegurate de que el backend este corriendo y el scraper haya ejecutado.</p>
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

