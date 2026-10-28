import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOffer, previewOffers } from '../inventory/normalize';
import { importOffers, nextOfferStatus } from '../inventory/importer';
import { Product } from '../models/Product';
import { PriceHistory } from '../models/PriceHistory';

function source(patch: Record<string, unknown> = {}) {
  return {
    externalProductId: 'sku-100', name: 'Silk evening dress', brand: 'Example', category: 'Dresses',
    originalPrice: 200, salePrice: 150, currency: 'USD', inStock: true,
    retailerUrl: 'https://www.nordstrom.com/s/silk-evening-dress/12345',
    images: ['https://n.nordstrommedia.com/example.jpg'], observedAt: new Date().toISOString(), ...patch,
  };
}

test('retailer/product/variant identity stays stable when merchandising or tracking URLs change', () => {
  const first = normalizeOffer(source({ variantId: 'blue-M' }), 'nordstrom');
  const refreshed = normalizeOffer(source({ variantId: 'blue-M', name: 'Updated product name', salePrice: 100,
    retailerUrl: 'https://www.nordstrom.com/s/silk-evening-dress/12345?utm_source=partner#details' }), 'nordstrom');
  const anotherVariant = normalizeOffer(source({ variantId: 'blue-L' }), 'nordstrom');
  const anotherRetailer = normalizeOffer(source({ variantId: 'blue-M', retailerUrl: 'https://www.saksfifthavenue.com/product/example.html' }), 'saks');
  assert.equal(first.sku, refreshed.sku);
  assert.equal(refreshed.retailerUrl, first.retailerUrl);
  assert.notEqual(first.sku, anotherVariant.sku);
  assert.notEqual(first.sku, anotherRetailer.sku);
  assert.equal(first.category, 'clothing');
  assert.equal(first.discount, 25);
});

test('failed batch validation makes no database reads or writes', async t => {
  const read = t.mock.method(Product, 'findOne', (() => { throw new Error('Database must not be touched'); }) as any);
  const write = t.mock.method(Product, 'findOneAndUpdate', (() => { throw new Error('Database must not be touched'); }) as any);
  const history = t.mock.method(PriceHistory, 'create', (() => { throw new Error('Database must not be touched'); }) as any);
  const result = await importOffers([source(), source({ externalProductId: 'bad', salePrice: 'not a number' })], 'nordstrom');
  assert.equal(result.committed, false);
  assert.equal(result.errors.length, 1);
  assert.equal(result.created, 0);
  assert.equal(result.updated, 0);
  assert.equal(read.mock.callCount(), 0);
  assert.equal(write.mock.callCount(), 0);
  assert.equal(history.mock.callCount(), 0);
});

test('duplicate identities invalidate a batch and missing variants do not merge distinct variants', () => {
  assert.match(previewOffers([source(), source({ name: 'Duplicate' })], 'nordstrom').errors[0].error, /Duplicate/);
  assert.equal(previewOffers([source({ variantId: 'M' }), source({ variantId: 'L' })], 'nordstrom').valid, 2);
});

test('requires explicit prices, USD, observed availability, recent timestamps and source URLs', () => {
  for (const patch of [
    { originalPrice: 0 }, { salePrice: -1 }, { salePrice: '1,000.00' }, { salePrice: 12.345 },
    { currency: 'EUR' }, { currency: undefined }, { inStock: 'true' },
    { observedAt: 'today' }, { observedAt: new Date(Date.now() - 8 * 86_400_000).toISOString() },
    { observedAt: new Date(Date.now() + 10 * 60_000).toISOString() },
    { retailerUrl: 'https://evil.example/product' }, { images: ['http://images.example.com/product.jpg'] },
    { images: ['https://127.0.0.1/product.jpg'] }, { images: ['https://picsum.photos/200/300'] },
  ]) assert.throws(() => normalizeOffer(source(patch), 'nordstrom'), JSON.stringify(patch));
});

test('explicit member, coupon and quantity conditions cannot masquerade as public sale prices', () => {
  for (const patch of [
    { conditionalPrice: true }, { conditionalPrice: 'false' }, { membersOnly: true },
    { requiresMembership: true }, { requiresCoupon: true }, { couponCode: 'SAVE20' },
    { promoCode: 'VIP' }, { validForMemberTier: 'gold' }, { eligibleQuantity: { minValue: 2 } },
    { eligibleCustomerType: 'NewCustomer' }, { minimumPurchase: 200 },
  ]) assert.throws(() => normalizeOffer(source(patch), 'nordstrom'), /Conditional|must be a boolean/);
  assert.equal(normalizeOffer(source({ conditionalPrice: false, requiresCoupon: false }), 'nordstrom').ourPrice, 150);
});

test('availability and full-price refreshes are accepted but cannot publish new offers', () => {
  const sale = normalizeOffer(source(), 'nordstrom');
  const fullPrice = normalizeOffer(source({ salePrice: 200 }), 'nordstrom');
  const soldOut = normalizeOffer(source({ inStock: false }), 'nordstrom');
  assert.equal(fullPrice.isOnSale, false);
  assert.equal(fullPrice.discount, 0);
  assert.equal(nextOfferStatus(fullPrice, 'active'), 'delisted');
  assert.equal(nextOfferStatus(soldOut, 'active'), 'sold_out');
  assert.equal(nextOfferStatus(sale), 'draft');
  assert.equal(nextOfferStatus(sale, 'delisted'), 'delisted');
  assert.equal(nextOfferStatus(sale, 'sold_out'), 'draft');
  assert.equal(nextOfferStatus(sale, 'active'), 'active');
  assert.equal(nextOfferStatus({ ...sale, category: 'other' }, 'active'), 'draft');
  assert.equal(nextOfferStatus({ ...sale, lastVerifiedAt: new Date(Date.now() - 8 * 86_400_000) }, 'active'), 'draft');
});
