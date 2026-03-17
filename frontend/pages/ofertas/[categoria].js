import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import DealCard from '../../components/DealCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Mapeo de categorías para SEO
const categoryMeta = {
  tecnologia: {
    title: 'Ofertas de Tecnología - DealRadar',
    description: 'Los mejores descuentos en tecnología: celulares, notebooks, tablets, audifonos y más.',
    headerTitle: '💻 Ofertas de Tecnología',
    headerSubtitle: 'Los mejores descuentos en tecnología'
  },
  hogar: {
    title: 'Ofertas de Hogar - DealRadar',
    description: 'Encuentra las mejores ofertas para tu hogar: muebles, decoracion, electrodomesticos y mas.',
    headerTitle: '🏠 Ofertas de Hogar',
    headerSubtitle: 'Los mejores descuentos para tu hogar'
  },
  herramientas: {
    title: 'Ofertas de Herramientas - DealRadar',
    description: 'Ofertas en herramientas electricas, manuales y accesorios para tu taller.',
    headerTitle: '🔧 Ofertas de Herramientas',
    headerSubtitle: 'Los mejores descuentos en herramientas'
  },
  deportes: {
    title: 'Ofertas de Deportes - DealRadar',
    description: 'Ofertas en articulos deportivos, fitness, bicieltas y mas.',
    headerTitle: '⚽ Ofertas de Deportes',
    headerSubtitle: 'Los mejores descuentos en deportes'
  },
  electrodomesticos: {
    title: 'Ofertas de Electrodomesticos - DealRadar',
    description: 'Ofertas en electrodomesticos para tu hogar: refrigeradores, lavadoras, cocinas y mas.',
    headerTitle: '🔌 Ofertas de Electrodomesticos',
    headerSubtitle: 'Los mejores descuentos en electrodomesticos'
  }
};

export default function Categoria({ categoria }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const meta = categoryMeta[categoria] || {
    title: `Ofertas de ${categoria} - DealRadar`,
    description: `Los mejores descuentos en ${categoria}`,
    headerTitle: `🔥 Ofertas de ${categoria}`,
    headerSubtitle: `Los mejores descuentos en ${categoria}`
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Buscar por categoría
        const response = await axios.get(`${API_URL}/deals?category=${categoria}&limit=50`);
        setDeals(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching deals:', err);
        // Si no hay resultados por categoría, mostrar todas las ofertas
        try {
          const allResponse = await axios.get(`${API_URL}/deals?limit=50`);
          setDeals(allResponse.data.filter(d => 
            d.category?.toLowerCase() === categoria.toLowerCase() ||
            d.title?.toLowerCase().includes(categoria.toLowerCase())
          ));
        } catch (filterErr) {
          console.error('Error filtering deals:', filterErr);
        }
        setLoading(false);
      }
    };

    fetchData();
  }, [categoria]);

  return (
    <Layout title={meta.title}>
      <section className="category-header">
        <h1>{meta.headerTitle}</h1>
        <p>{meta.headerSubtitle}</p>
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
            <h3 className="empty-title">No hay ofertas de {categoria}</h3>
            <p>Proximamente mas ofertas en esta categoria</p>
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

// Get static paths para las categorías
export async function getStaticProps({ params }) {
  return {
    props: {
      categoria: params.categoria
    }
  };
}

export async function getStaticPaths() {
  const categories = ['tecnologia', 'hogar', 'herramientas', 'deportes', 'electrodomesticos'];
  
  return {
    paths: categories.map((categoria) => ({
      params: { categoria }
    })),
    fallback: true
  };
}

