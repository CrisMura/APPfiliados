const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const {
  canonicalProductUrl,
  extractAssignedJson,
  fetchBestSellersPage,
  getMeliId,
  inspectMeliHtml,
  parseBestSellers,
} = require('../services/meliBestSellers');

test('normaliza ID y URL de publicaciones de Mercado Libre', () => {
  const tracked = 'https://articulo.mercadolibre.cl/MLC-123456789-producto-_JM?tracking_id=abc';
  assert.equal(getMeliId(tracked), 'MLC123456789');
  assert.equal(canonicalProductUrl(tracked), 'https://articulo.mercadolibre.cl/MLC-123456789-_JM');
});

test('conserva las URL de catálogo de Mercado Libre', () => {
  const catalog = 'https://www.mercadolibre.cl/producto-ejemplo/p/MLC75478520?tracking_id=abc#reviews';
  assert.equal(
    canonicalProductUrl(catalog),
    'https://www.mercadolibre.cl/producto-ejemplo/p/MLC75478520'
  );
});

test('extrae únicamente el objeto JSON asignado en el estado Nordic', () => {
  const source = '_n.ctx.r={"texto":"llave } interna","valor":1};_n.ctx.r.assets={};';
  assert.equal(extractAssignedJson(source), '{"texto":"llave } interna","valor":1}');
});

test('extrae productos Nordic y mezcla las mejores posiciones por categoría', () => {
  const state = {
    appProps: { pageProps: { dataLanding: { components: [
      { items: [
        { data: { title: 'Celular número uno', price: 100000, original_price: 120000,
          thumbnail: 'https://http2.mlstatic.com/celular-1.jpg',
          permalink: 'https://www.mercadolibre.cl/celular/p/MLC10000001', best_sellers_position: '1' },
          tracking: { eventData: { c_campaign: 'celulares-y-telefonos' } } },
        { data: { title: 'Celular número dos', price: 90000,
          thumbnail: 'https://http2.mlstatic.com/celular-2.jpg',
          permalink: 'https://www.mercadolibre.cl/celular-2/p/MLC10000002', best_sellers_position: '2' },
          tracking: { eventData: { c_campaign: 'celulares-y-telefonos' } } },
      ] },
      { items: [
        { data: { title: 'Notebook número uno', price: 500000,
          thumbnail: 'https://http2.mlstatic.com/notebook-1.jpg',
          permalink: 'https://www.mercadolibre.cl/notebook/p/MLC20000001', best_sellers_position: '1' },
          tracking: { eventData: { c_campaign: 'computacion' } } },
      ] },
    ] } } },
  };
  const html = `<script id="__NORDIC_RENDERING_CTX__">_n.ctx.r=${JSON.stringify(state)};_n.ctx.r.assets={};</script>`;
  const products = parseBestSellers(html);

  assert.deepEqual(products.map((product) => product.title), [
    'Celular número uno', 'Notebook número uno', 'Celular número dos',
  ]);
  assert.deepEqual(products.map((product) => product.category), [
    'Celulares y Telefonía', 'Computación', 'Celulares y Telefonía',
  ]);
  assert.equal(products[0].discount, 1 / 6);
  assert.equal(products[0].url, 'https://www.mercadolibre.cl/celular/p/MLC10000001');
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

test('usa Scrape.do con geolocalización chilena cuando existe token', async (t) => {
  const originalGet = axios.get;
  const originalToken = process.env.SCRAPEDO_TOKEN;
  process.env.SCRAPEDO_TOKEN = 'token-de-prueba';
  t.after(() => {
    axios.get = originalGet;
    if (originalToken === undefined) delete process.env.SCRAPEDO_TOKEN;
    else process.env.SCRAPEDO_TOKEN = originalToken;
  });

  axios.get = async (requestUrl, options) => {
    assert.equal(requestUrl, 'https://api.scrape.do/');
    assert.deepEqual(options.params, {
      token: 'token-de-prueba',
      url: 'https://www.mercadolibre.cl/mas-vendidos',
      geoCode: 'cl',
    });
    return { data: '<html>contenido válido</html>' };
  };

  const html = await fetchBestSellersPage();
  assert.equal(html, '<html>contenido válido</html>');
});

test('genera diagnóstico estructural sin incluir contenido sensible', () => {
  const diagnostics = inspectMeliHtml(`
    <html><head><title>Más vendidos | Mercado Libre Chile</title></head>
    <body>
      <a href="/mas-vendidos/MLC1747">Categoría</a>
      <div class="ui-recommendation-card"><a href="/p/MLC123456">Producto</a></div>
    </body></html>
  `);
  assert.equal(diagnostics.title, 'Más vendidos | Mercado Libre Chile');
  assert.equal(diagnostics.recommendationCards, 1);
  assert.equal(diagnostics.productLinks, 1);
  assert.equal(diagnostics.categoryLinks, 1);
  assert.equal(diagnostics.totalLinks, 2);
});
