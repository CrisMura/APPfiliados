const path = require('path');
const { chromium } = require('playwright');
const { pool } = require('../db/config');

const PROFILE_DIR = process.env.MELI_AFFILIATE_PROFILE_DIR ||
  path.resolve(__dirname, '..', '..', '.meli-affiliate-profile');
const LIMIT = Number.parseInt(process.env.MELI_AFFILIATE_LIMIT || '15', 10);
const DELAY_MS = Number.parseInt(process.env.MELI_AFFILIATE_DELAY_MS || '4000', 10);

function parseCommission(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  const patterns = [
    /(?:comisi[oó]n|ganas?|recibe(?:s)?)[^\d]{0,30}(\d+(?:[.,]\d+)?)\s*%/i,
    /(\d+(?:[.,]\d+)?)\s*%[^\n]{0,50}(?:comisi[oó]n|ganas?|recibe(?:s)?)/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return Number.parseFloat(match[1].replace(',', '.'));
  }
  return null;
}

function isAffiliateUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return /(^|\.)mercadolibre\.cl$/i.test(url.hostname) && /\/sec\//i.test(url.pathname);
  } catch (_) {
    return false;
  }
}

async function findCommission(page) {
  const candidates = page.locator('body').getByText(/(?:comisi[oó]n|ganas?|recibe(?:s)?)[^\n]{0,80}%|%[^\n]{0,80}(?:comisi[oó]n|ganas?|recibe(?:s)?)/i);
  const count = Math.min(await candidates.count(), 10);
  for (let index = 0; index < count; index += 1) {
    const text = await candidates.nth(index).innerText().catch(() => '');
    const commission = parseCommission(text);
    if (commission !== null) return commission;
  }
  return parseCommission(await page.locator('body').innerText());
}

async function openShareModal(page) {
  const button = page.getByRole('button', { name: /compartir/i }).first();
  if (!(await button.isVisible().catch(() => false))) {
    throw new Error('No se encontró el botón Compartir; la sesión puede haber vencido');
  }
  await button.click();
  await page.getByText(/link del producto/i).first().waitFor({ state: 'visible', timeout: 10000 });
}

async function readAffiliateUrl(page) {
  const label = page.getByText(/link del producto/i).first();
  const modal = label.locator('xpath=ancestor::*[@role="dialog"][1]');
  const scope = (await modal.count()) ? modal : page.locator('body');
  const inputs = scope.locator('input');
  const count = await inputs.count();
  for (let index = 0; index < count; index += 1) {
    const value = await inputs.nth(index).inputValue().catch(() => '');
    if (isAffiliateUrl(value)) return value;
  }
  const links = scope.locator('a[href*="mercadolibre.cl/sec/"]');
  if (await links.count()) return links.first().getAttribute('href');
  throw new Error('El modal no contiene un link de afiliado reconocible');
}

async function getPendingProducts(client = pool) {
  const result = await client.query(
    `SELECT id, title, url
       FROM products
      WHERE is_best_seller = TRUE
        AND (url_affiliate IS NULL OR btrim(url_affiliate) = '')
      ORDER BY best_seller_rank NULLS LAST, last_seen_at DESC
      LIMIT $1`,
    [LIMIT]
  );
  return result.rows;
}

async function saveAffiliateUrl(id, url, client = pool) {
  if (!isAffiliateUrl(url)) throw new Error('Se rechazó un link que no parece ser de afiliado');
  const result = await client.query(
    `UPDATE products
        SET url_affiliate = $1
      WHERE id = $2
        AND (url_affiliate IS NULL OR btrim(url_affiliate) = '')
      RETURNING id`,
    [url, id]
  );
  return result.rowCount === 1;
}

async function launchAffiliateBrowser({ headless = true } = {}) {
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    locale: 'es-CL',
    timezoneId: 'America/Santiago',
    viewport: { width: 1365, height: 900 },
  });
}

async function syncAffiliateLinks() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada en el archivo .env');
  const products = await getPendingProducts();
  const summary = { pending: products.length, saved: 0, zeroCommission: 0, failed: 0 };
  if (products.length === 0) return summary;

  const context = await launchAffiliateBrowser({ headless: process.env.MELI_AFFILIATE_HEADLESS !== 'false' });
  const page = context.pages()[0] || await context.newPage();
  try {
    for (const product of products) {
      try {
        await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(1500);
        const commission = await findCommission(page);
        if (commission === null) throw new Error('No se pudo leer la comisión; verifica que la sesión siga activa');
        if (commission <= 0) {
          summary.zeroCommission += 1;
          console.log(`[sin comisión] ${product.title}`);
          continue;
        }
        await openShareModal(page);
        const affiliateUrl = await readAffiliateUrl(page);
        if (await saveAffiliateUrl(product.id, affiliateUrl)) summary.saved += 1;
        console.log(`[guardado ${commission}%] ${product.title}`);
      } catch (error) {
        summary.failed += 1;
        console.error(`[falló] ${product.title}: ${error.message}`);
      }
      await page.waitForTimeout(DELAY_MS);
    }
    return summary;
  } finally {
    await context.close();
  }
}

module.exports = {
  PROFILE_DIR,
  parseCommission,
  isAffiliateUrl,
  readAffiliateUrl,
  getPendingProducts,
  saveAffiliateUrl,
  launchAffiliateBrowser,
  syncAffiliateLinks,
};
