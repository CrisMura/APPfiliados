const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const DealCard = ({ product, showBestBadge = false }) => {
  const discount = Number(product.discount || 0);
  const hasDiscount = discount > 0;
  const discountPercent = Math.round(discount * 100);
  const formattedPrice = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
  }).format(product.price);

  const formattedOriginalPrice = product.original_price
    ? new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
      }).format(product.original_price)
    : null;

  return (
    <div className="deal-card">
      <div className="deal-image-container">
        <img
          src={product.image || '/placeholder.svg'}
          alt={product.title}
          className="deal-image"
          loading="lazy"
        />
        {hasDiscount && (
          <div className={`discount-badge ${showBestBadge ? 'best' : ''}`}>
            {discountPercent}% OFF
          </div>
        )}
      </div>
      <div className="deal-content">
        <h3 className="deal-title">{product.title}</h3>
        <div className="deal-prices">
          {formattedOriginalPrice && (
            <span className="original-price">{formattedOriginalPrice}</span>
          )}
          <span className="current-price">{formattedPrice}</span>
        </div>
        <a href={`${API_URL}/go/${product.id}`} className="deal-button" target="_blank" rel="noopener noreferrer">
          Ver oferta
        </a>
      </div>
    </div>
  );
};

export default DealCard;

