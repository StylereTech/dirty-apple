import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJsonLdOffers } from '../inventory/jsonld';

const url = 'https://www.nordstrom.com/s/test-jacket/12345';
const observedAt = '2026-10-28T00:00:00.000Z';
function fixture() {
  return {
    '@context': 'https://schema.org', '@type': 'Product', name: 'Test jacket', sku: 'SKU-123',
    brand: { '@type': 'Brand', name: 'Test brand' }, category: 'Clothing', url,
    image: ['https://n.nordstrommedia.com/jacket.jpg'], size: 'M', color: 'Blue',
    offers: {
      '@type': 'Offer', url, price: '80.00', priceCurrency: 'USD', availability: 'https://schema.org/InStock',
      priceSpecification: { '@type': 'UnitPriceSpecification', priceType: 'https://schema.org/StrikethroughPrice', price: '100.00', priceCurrency: 'USD' },
    },
  };
}
const html = (value: unknown) => `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
const parse = (value: unknown) => extractJsonLdOffers(html(value), url, { observedAt });

test('extracts explicit same-offer sale and stock facts without inventing other variants', () => {
  const result = parse(fixture());
  assert.equal(result.records.length, 1);
  assert.deepEqual(result.records[0], {
    externalProductId: 'SKU-123', name: 'Test jacket', brand: 'Test brand', category: 'Clothing',
    originalPrice: 100, salePrice: 80, currency: 'USD', retailerUrl: url,
    images: ['https://n.nordstrommedia.com/jacket.jpg'], inStock: true,
    sizes: [{ size: 'M', available: true }], colors: ['Blue'], observedAt,
  });
});

test('a sale page or single Offer price is not evidence of a discount', () => {
  const product = fixture();
  delete (product.offers as Record<string, unknown>).priceSpecification;
  const result = parse(product);
  assert.equal(result.records.length, 0);
  assert.match(result.warnings.join(' '), /comparable regular and sale prices/);
  assert.deepEqual(result.productUrls, [url]);
});

test('rejects aggregate, ranged, multiple variant, and conflicting current prices', () => {
  for (const offers of [
    { '@type': 'AggregateOffer', lowPrice: 50, highPrice: 100, priceCurrency: 'USD' },
    { ...fixture().offers, lowPrice: 50, highPrice: 100 },
    [fixture().offers, { ...fixture().offers, price: 90 }],
    [fixture().offers, { '@id': '#unresolved-variant' }],
    { ...fixture().offers, priceSpecification: [fixture().offers.priceSpecification, { '@type': 'UnitPriceSpecification', price: 40, priceCurrency: 'USD' }] },
    { ...fixture().offers, priceSpecification: [fixture().offers.priceSpecification, { '@id': '#unresolved-price' }] },
    { ...fixture().offers, price: undefined, priceSpecification: [fixture().offers.priceSpecification, { '@type': 'DeliveryChargeSpecification', price: 5, priceCurrency: 'USD' }] },
  ]) {
    const result = parse({ ...fixture(), offers });
    assert.equal(result.records.length, 0);
    assert.ok(result.warnings.length);
  }
});

test('requires an explicit matching currency, a positive discount, and explicit stock', () => {
  for (const patch of [
    { price: '120.00' }, { price: 0 }, { price: '80,00' }, { price: '$80' },
    { priceCurrency: 'EUR' }, { availability: undefined }, { availability: 'https://schema.org/PreOrder' },
    { priceSpecification: { ...fixture().offers.priceSpecification, priceType: 'https://schema.org/MSRP' } },
  ]) {
    assert.equal(parse({ ...fixture(), offers: { ...fixture().offers, ...patch } }).records.length, 0);
  }
});

test('rejects member/quantity-qualified prices and expired or future offers', () => {
  for (const patch of [
    { validForMemberTier: 'club' }, { eligibleQuantity: { minValue: 2 } },
    { priceValidUntil: '2026-10-27' }, { validFrom: '2026-11-01' }, { validThrough: 'not a date' },
    { priceSpecification: { ...fixture().offers.priceSpecification, validForMemberTier: 'club' } },
  ]) {
    assert.equal(parse({ ...fixture(), offers: { ...fixture().offers, ...patch } }).records.length, 0);
  }
});

test('supports current price specifications and explicit out-of-stock refresh records', () => {
  const product = fixture();
  const offer = { ...product.offers, price: undefined, availability: 'https://schema.org/OutOfStock', priceSpecification: [
    product.offers.priceSpecification,
    { '@type': 'UnitPriceSpecification', price: '70', priceCurrency: 'USD', validThrough: '2026-10-28' },
  ] };
  const result = parse({ ...product, offers: offer });
  assert.equal(result.records[0].salePrice, 70);
  assert.equal(result.records[0].inStock, false);
  assert.deepEqual(result.records[0].sizes, [{ size: 'M', available: false }]);
});

test('reads graph references and ItemList URLs without fetching external schemas', () => {
  const product = fixture();
  const result = parse({ '@graph': [
    { ...product, offers: { '@id': '#offer' } },
    { '@id': '#offer', ...product.offers },
    { '@type': 'ItemList', itemListElement: [
      { '@type': 'ListItem', item: { '@type': 'Product', url: '/s/another/54321' } },
      { '@type': 'ListItem', item: '/s/third/99999' },
    ] },
  ] });
  assert.equal(result.records.length, 1);
  assert.ok(result.productUrls.includes('https://www.nordstrom.com/s/another/54321'));
  assert.ok(result.productUrls.includes('https://www.nordstrom.com/s/third/99999'));
});

test('malformed scripts do not hide other valid products and unsafe images are dropped', () => {
  const product = { ...fixture(), image: ['javascript:alert(1)', 'http://images.example.test/test.jpg', { contentUrl: 'https://n.nordstrommedia.com/safe.jpg' }] };
  const result = extractJsonLdOffers('<script type="application/ld+json">{bad}</script>' + html(product), url, { observedAt });
  assert.equal(result.records.length, 1);
  assert.deepEqual(result.records[0].images, ['https://n.nordstrommedia.com/safe.jpg']);
  assert.match(result.warnings.join(' '), /Malformed/);
});
