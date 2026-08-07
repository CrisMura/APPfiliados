const axios = require('axios');
const cheerio = require('cheerio');
const { randomUUID } = require('crypto');
const fs = require('fs');
const { pool } = require('../db/config');

const BEST_SELLERS_URL = process.env.MELI_BEST_SELLERS_URL || 'https://www.mercadolibre.cl/mas-vendidos';
const SCRAPE_DO_URL = 'https://api.scrape.do/';
const MAX_PRODUCTS = Number.parseInt(process.env.MELI_BEST_SELLERS_LIMIT || '15', 10);
const LOCK_ID = 684531;

const requestHeaders = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-CL,es;q=0.9',
  'Cache-Control': 'no-cache',
  'User-Agent': process.env.MELI_USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/127.0 Safari/537.36',
};

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function absoluteUrl(value) {
  if (!value) return null;
  try {
    return new URL(value, 'https://www.mercadolibre.cl').toString();
  } catch (_) {
    return null;
  }
}

function getMeliId(url) {
  const match = String(url || '').match(/\b(MLC-?\d+)\b/i);
  return match ? match[1].replace('-', '').toUpperCase() : null;
}

function canonicalProductUrl(url) {
  const parsed = absoluteUrl(url);
  if (!parsed) return null;
  const result = new URL(parsed);
  result.search = '';
  result.hash = '';
  if (/\/p\/MLC\d+/i.test(result.pathname)) return result.toString();
  const meliId = getMeliId(parsed);
  if (meliId && /\/MLC-?\d+/i.test(result.pathname)) {
    return `https://articulo.mercadolibre.cl/${meliId.slice(0, 3)}-${meliId.slice(3)}-_JM`;
  }
  return result.toString();
}

function parseMoney(value) {
  if (typeof value === 'number') return value;
  const normalized = cleanText(value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function pushUnique(target, product) {
  if (!product.title || !product.url || !product.price || !product.image) return;
  const meliId = product.meli_id || getMeliId(product.url);
  const key = meliId || canonicalProductUrl(product.url);
  if (!key || target.some((item) => (item.meli_id || item.url) === key)) return;
  target.push({
    ...product,
    meli_id: meliId,
    url: canonicalProductUrl(product.url),
    image: absoluteUrl(product.image),
  });
}

function parseJsonLd($, products) {
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const raw = JSON.parse($(element).text());
      const roots = Array.isArray(raw) ? raw : [raw];
      const visit = (node) => {
        if (!node || typeof node !== 'object') return;
        const item = node.item || node;
        if (item['@type'] === 'Product') {
          const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          pushUnique(products, {
            title: cleanText(item.name),
            price: parseMoney(offer?.price || offer?.lowPrice),
            original_price: parseMoney(offer?.highPrice),
            image: Array.isArray(item.image) ? item.image[0] : item.image,
            url: item.url || offer?.url,
          });
        }
        Object.values(node).forEach((child) => {
          if (Array.isArray(child)) child.forEach(visit);
          else if (child && typeof child === 'object') visit(child);
        });
      };
      roots.forEach(visit);
    } catch (_) {
      // Algunas páginas incluyen bloques JSON-LD no estándar; continúa con el HTML.
    }
  });
}

function parseCards($, products) {
  const cardSelector = [
    'li.ui-search-layout__item',
    '.poly-card',
    '.ui-search-result',
    '.andes-card',
  ].join(',');

  $(cardSelector).each((_, card) => {
    const element = $(card);
    const link = element.find('a[href*="mercadolibre.cl"], a[href*="/MLC"], a[href*="/p/MLC"]').first();
    const title = cleanText(
      element.find('.poly-component__title, .ui-search-item__title, h2, h3').first().text() || link.attr('title')
    );
    const image = element.find('img').first();
    let priceNode = element.find('.poly-price__current .andes-money-amount').first();
    if (!priceNode.length) priceNode = element.find('.ui-search-price__second-line .andes-money-amount').first();
    if (!priceNode.length) {
      priceNode = element.find('.andes-money-amount').filter((_, node) =>
        $(node).closest('.andes-money-amount--previous, .ui-search-price__original-value').length === 0
      ).first();
    }
    const originalNode = element.find(
      '.andes-money-amount--previous, .ui-search-price__original-value .andes-money-amount'
    ).first();
    const price = parseMoney(priceNode.attr('aria-label') || priceNode.text());
    const originalPrice = parseMoney(originalNode.attr('aria-label') || originalNode.text());

    pushUnique(products, {
      title,
      price,
      original_price: originalPrice && originalPrice > price ? originalPrice : null,
      image: image.attr('data-src') || image.attr('src'),
      url: link.attr('href'),
    });
  });
}

function extractAssignedJson(source, assignment = '_n.ctx.r=') {
  const text = String(source || '');
  const assignmentIndex = text.indexOf(assignment);
  if (assignmentIndex < 0) return null;
  const start = text.indexOf('{', assignmentIndex + assignment.length);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === '{') depth += 1;
    else if (character === '}' && --depth === 0) return text.slice(start, index + 1);
  }
  return null;
}

const CATEGORY_NAMES = {
  'celulares-y-telefonos': 'Celulares y Telefonía',
  computacion: 'Computación',
  'electrodomesticos-y-aires-ac': 'Electrodomésticos y Aires Acondicionados',
  'ropa-y-accesorios': 'Ropa y Accesorios',
  'electronica-audio-y-video': 'Electrónica, Audio y Video',
  'accesorios-para-vehiculos': 'Accesorios para Vehículos',
};

function parseNordicState($, products) {
  const script = $('#__NORDIC_RENDERING_CTX__').first().text();
  const json = extractAssignedJson(script);
  if (!json) return;

  try {
    const state = JSON.parse(json);
    const components = state?.appProps?.pageProps?.dataLanding?.components || [];
    const candidates = [];

    components.forEach((component, componentOrder) => {
      const items = Array.isArray(component?.items) ? component.items : [];
      items.forEach((item, itemOrder) => {
        const data = item?.data || {};
        const campaign = data?.tracking?.eventData?.c_campaign ||
          item?.tracking?.eventData?.c_campaign ||
          component?.data?.viewMoreLink?.tracking?.eventData?.c_campaign;
        const position = Number.parseInt(data.best_sellers_position, 10);
        candidates.push({
          title: cleanText(data.title),
          price: parseMoney(data.price),
          original_price: parseMoney(data.original_price),
          image: data.thumbnail,
          url: data.permalink,
          meli_id: getMeliId(data.itemId) || getMeliId(data.permalink),
          category: CATEGORY_NAMES[campaign] || cleanText(campaign) || 'Más vendidos',
          sourcePosition: Number.isFinite(position) ? position : Number.MAX_SAFE_INTEGER,
          componentOrder,
          itemOrder,
        });
      });
    });

    candidates
      .sort((a, b) => a.sourcePosition - b.sourcePosition ||
        a.componentOrder - b.componentOrder || a.itemOrder - b.itemOrder)
      .forEach((candidate) => pushUnique(products, candidate));
  } catch (_) {
    // Si Meli cambia el estado Nordic, se conservan los parsers alternativos.
  }
}

function parseBestSellers(html) {
  const $ = cheerio.load(html);
  const products = [];
  parseNordicState($, products);
  if (products.length === 0) {
    parseJsonLd($, products);
    parseCards($, products);
  }
  return products.slice(0, MAX_PRODUCTS).map((product, index) => ({
    ...product,
    rank: index + 1,
    discount: product.original_price && product.original_price > product.price
      ? (product.original_price - product.price) / product.original_price
      : null,
  }));
}

function inspectMeliHtml(html) {
  const $ = cheerio.load(String(html || ''));
  return {
    bytes: Buffer.byteLength(String(html || ''), 'utf8'),
    title: cleanText($('title').first().text()).slice(0, 200),
    jsonLdBlocks: $('script[type="application/ld+json"]').length,
    nordicBlocks: $('#__NORDIC_RENDERING_CTX__').length,
    polyCards: $('.poly-card').length,
    andesCards: $('.andes-card').length,
    searchCards: $('.ui-search-layout__item, .ui-search-result').length,
    recommendationCards: $('[class*="recommendation"][class*="card"]').length,
    productLinks: $('a[href*="/MLC"], a[href*="/p/MLC"], a[href*="articulo.mercadolibre.cl"]')
      .filter((_, link) => !String($(link).attr('href')).includes('/mas-vendidos/MLC')).length,
    categoryLinks: $('a[href*="/mas-vendidos/MLC"]').length,
    totalLinks: $('a[href]').length,
  };
}

function writeDiagnosticHtml(html) {
  const diagnosticFile = process.env.MELI_DIAGNOSTIC_FILE;
  if (!diagnosticFile) return;
  const token = process.env.SCRAPEDO_TOKEN;
  const limited = String(html || '').slice(0, 1_000_000);
  const sanitized = token ? limited.split(token).join('[REDACTED]') : limited;
  fs.writeFileSync(diagnosticFile, sanitized, 'utf8');
}

async function fetchBestSellersPage(url = BEST_SELLERS_URL) {
  const scrapeDoToken = process.env.SCRAPEDO_TOKEN;
  const requestUrl = scrapeDoToken ? SCRAPE_DO_URL : url;
  const response = await axios.get(requestUrl, {
    params: scrapeDoToken ? {
      token: scrapeDoToken,
      url,
      geoCode: 'cl',
    } : undefined,
    headers: requestHeaders,
    timeout: 60000,
    maxRedirects: 5,
    responseType: 'text',
    validateStatus: (status) => status >= 200 && status < 400,
  });
  const html = response.data;
  if (/rps:\s*w403|access denied|captcha/i.test(String(html))) {
    throw new Error('Mercado Libre bloqueó la solicitud incluso a través del proxy');
  }
  return html;
}

async function ensureColumns(client) {
  await client.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS meli_id TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS best_seller_rank INTEGER;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_meli_id
      ON products(meli_id) WHERE meli_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_products_best_seller_rank
      ON products(is_best_seller, best_seller_rank);
  `);
}

async function syncProducts(products) {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('Mercado Libre no devolvió productos; se conserva la tabla sin cambios');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureColumns(client);
    await client.query("UPDATE products SET is_best_seller = FALSE, best_seller_rank = NULL WHERE store = 'MercadoLibre'");

    for (const product of products) {
      const values = [
        product.meli_id, product.title, product.price, product.original_price,
        product.discount, product.image, product.url, product.rank,
        product.category || 'Más vendidos',
      ];
      const existing = await client.query(
        `UPDATE products SET
          meli_id = COALESCE(meli_id, $1), title = $2, price = $3, original_price = $4,
          discount = $5, image = $6, url = $7, store = 'MercadoLibre',
          category = $9, search_query = 'mas-vendidos',
          is_best_seller = TRUE, best_seller_rank = $8, last_seen_at = NOW()
         WHERE ($1::text IS NOT NULL AND meli_id = $1) OR url = $7`,
        values
      );

      if (existing.rowCount === 0) await client.query(
        `INSERT INTO products (
          id, meli_id, title, price, original_price, discount, image, url, store,
          category, search_query, is_best_seller, best_seller_rank, last_seen_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'MercadoLibre',$10,'mas-vendidos',TRUE,$9,NOW())
        ON CONFLICT (url) DO UPDATE SET
          meli_id = COALESCE(products.meli_id, EXCLUDED.meli_id),
          title = EXCLUDED.title,
          price = EXCLUDED.price,
          original_price = EXCLUDED.original_price,
          discount = EXCLUDED.discount,
          image = EXCLUDED.image,
          store = EXCLUDED.store,
          category = EXCLUDED.category,
          search_query = EXCLUDED.search_query,
          is_best_seller = TRUE,
          best_seller_rank = EXCLUDED.best_seller_rank,
          last_seen_at = NOW()`,
        [randomUUID(), ...values]
      );
    }

    await client.query('COMMIT');
    return products.length;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateMeliBestSellers() {
  const lockClient = await pool.connect();
  try {
    const lock = await lockClient.query('SELECT pg_try_advisory_lock($1) AS acquired', [LOCK_ID]);
    if (!lock.rows[0].acquired) {
      console.log('Actualización Meli omitida: ya existe otra ejecución activa');
      return { skipped: true, updated: 0 };
    }

    const html = await fetchBestSellersPage();
    const diagnostics = inspectMeliHtml(html);
    console.log(`[meli-diagnostics] ${JSON.stringify(diagnostics)}`);
    const products = parseBestSellers(html);
    if (products.length === 0) writeDiagnosticHtml(html);
    const updated = await syncProducts(products);
    console.log(`Ranking Meli actualizado: ${updated} productos`);
    return { skipped: false, updated };
  } finally {
    try { await lockClient.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]); } catch (_) {}
    lockClient.release();
  }
}

module.exports = {
  canonicalProductUrl,
  extractAssignedJson,
  getMeliId,
  inspectMeliHtml,
  parseBestSellers,
  fetchBestSellersPage,
  syncProducts,
  updateMeliBestSellers,
};
