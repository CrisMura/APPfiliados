import Link from 'next/link';
import Image from 'next/image';

const DealCard = ({ product, showBestBadge = false }) => {
  const discountPercent = Math.round(product.discount * 100);
  const formattedPrice = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
  }).format(product.price);

  const formattedOriginalPrice = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
  }).format(product.original_price);

  // Calculate score for ranking
  const score = Math.round(product.discount * 100 + (product.clicks || 0));

  return (
    <div className="deal-card">
      <div className="deal-image-container">
        <img
          src={product.image}
          alt={product.title}
          className="deal-image"
          loading="lazy"
        />
        <div className={`discount-badge ${showBestBadge ? 'best' : ''}`}>
          {discountPercent}% OFF
        </div>
      </div>
      <div className="deal-content">
        <h3 className="deal-title">{product.title}</h3>
        <div className="deal-prices">
          <span className="original-price">{formattedOriginalPrice}</span>
          <span className="current-price">{formattedPrice}</span>
        </div>
        <Link href={`/go/${product.id}`} className="deal-button" target="_blank">
          Ver oferta
        </Link>
      </div>
    </div>
  );
};

export default DealCard;

