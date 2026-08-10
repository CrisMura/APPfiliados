const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCommission, isAffiliateUrl } = require('../services/meliAffiliateLinks');

test('lee formatos habituales de comisión de Meli', () => {
  assert.equal(parseCommission('Ganas 12% de comisión'), 12);
  assert.equal(parseCommission('Comisión: 7,5 %'), 7.5);
  assert.equal(parseCommission('0% de comisión'), 0);
  assert.equal(parseCommission('Envío gratis'), null);
});

test('acepta los formatos de links afiliados de Mercado Libre', () => {
  assert.equal(isAffiliateUrl('https://www.mercadolibre.cl/sec/ABC123'), true);
  assert.equal(isAffiliateUrl('https://mercadolibre.cl/sec/xyz'), true);
  assert.equal(isAffiliateUrl('https://meli.la/12nYNLG'), true);
  assert.equal(isAffiliateUrl('https://articulo.mercadolibre.cl/MLC-123'), false);
  assert.equal(isAffiliateUrl('https://evil.example/sec/ABC123'), false);
  assert.equal(isAffiliateUrl('http://meli.la/12nYNLG'), false);
  assert.equal(isAffiliateUrl('https://meli.la/'), false);
  assert.equal(isAffiliateUrl('https://evil.example/meli.la/12nYNLG'), false);
});
