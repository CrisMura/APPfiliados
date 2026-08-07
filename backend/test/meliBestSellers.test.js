const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalProductUrl, getMeliId, parseBestSellers } = require('../services/meliBestSellers');

test('normaliza ID y URL de publicaciones de Mercado Libre', () => {
  const tracked = 'https://articulo.mercadolibre.cl/MLC-123456789-producto-_JM?tracking_id=abc';
  assert.equal(getMeliId(tracked), 'MLC123456789');
  assert.equal(canonicalProductUrl(tracked), 'https://articulo.mercadolibre.cl/MLC-123456789-_JM');
});

test('extrae, ordena y deduplica productos desde tarjetas', () => {
  const html = `
    <ol>
      <li class="ui-search-layout__item">
        <a href="https://articulo.mercadolibre.cl/MLC-111111111-producto-uno-_JM?x=1"></a>
        <h2 class="ui-search-item__title">Producto Uno</h2>
        <img data-src="https://http2.mlstatic.com/uno.jpg">
        <div class="ui-search-price__original-value"><span class="andes-money-amount" aria-label="20.000 pesos"></span></div>
        <div class="ui-search-price__second-line"><span class="andes-money-amount" aria-label="15.000 pesos"></span></div>
      </li>
      <li class="poly-card">
        <a href="https://articulo.mercadolibre.cl/MLC-222222222-producto-dos-_JM"></a>
        <h2 class="poly-component__title">Producto Dos</h2>
        <img src="https://http2.mlstatic.com/dos.jpg">
        <div class="poly-price__current"><span class="andes-money-amount" aria-label="9.990 pesos"></span></div>
      </li>
    </ol>`;

  const products = parseBestSellers(html);
  assert.equal(products.length, 2);
  assert.deepEqual(products.map((item) => item.rank), [1, 2]);
  assert.equal(products[0].price, 15000);
  assert.equal(products[0].original_price, 20000);
  assert.equal(products[0].discount, 0.25);
  assert.equal(products[1].meli_id, 'MLC222222222');
});
