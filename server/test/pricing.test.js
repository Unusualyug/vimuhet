import test from 'node:test';
import assert from 'node:assert/strict';
import { effectivePrice, isSaleActive, publicProduct } from '../services/pricing.js';

const now = new Date('2026-10-25T12:00:00.000Z');

test('scheduled sale price is inactive before its start and active within its window', () => {
  const product = { price: 2000, salePrice: 1500, saleStartsAt: '2026-10-26T00:00:00.000Z', saleEndsAt: '2026-10-30T00:00:00.000Z' };
  assert.equal(isSaleActive(product, now), false);
  assert.equal(effectivePrice(product, now), 2000);
  assert.equal(isSaleActive(product, new Date('2026-10-28T12:00:00.000Z')), true);
  assert.equal(effectivePrice(product, new Date('2026-10-28T12:00:00.000Z')), 1500);
});

test('expired sales are omitted from storefront price while manual pricing remains unchanged', () => {
  const expired = { price: 2000, salePrice: 1500, saleStartsAt: '2026-10-01T00:00:00.000Z', saleEndsAt: '2026-10-20T00:00:00.000Z' };
  assert.equal(effectivePrice(expired, now), 2000);
  assert.equal(publicProduct(expired, now).salePrice, null);
  assert.equal(effectivePrice({ price: 900 }, now), 900);
});
