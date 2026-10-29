import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogueQuery, publicProductFilter, freshnessCutoff } from '../lib/catalog';

test('catalog search and category inputs are literal regular expressions', () => {
  const search = 'Brand (VIP)+ [.*] $';
  const { filter } = catalogueQuery({ search, category: 'bags|shoes' });
  const userFilter = (filter.$and as any[])[1];
  const expression = new RegExp(userFilter.$or[0].name.$regex, userFilter.$or[0].name.$options);
  assert.equal(expression.test(`New ${search} bag`), true);
  assert.equal(expression.test('Brand VIP anything'), false);
  const category = new RegExp(userFilter.category.$regex, userFilter.category.$options);
  assert.equal(category.test('bags|shoes'), true);
  assert.equal(category.test('bags'), false);
});

test('catalog rejects object/array query injection and invalid sorts or boolean filters', () => {
  for (const field of ['brand', 'category', 'retailer', 'gender', 'collection', 'search', 'sort', 'featured', 'onSale', 'inStock', 'page', 'limit', 'priceMin', 'priceMax', 'minDiscount']) {
    for (const value of [{ $ne: '' }, ['a', 'b']]) assert.throws(() => catalogueQuery({ [field]: value }), field);
  }
  for (const query of [{ sort: '__proto__' }, { sort: 'constructor' }, { featured: 'yes' }, { onSale: '1' }, { gender: 'unknown' }]) assert.throws(() => catalogueQuery(query));
});

test('catalog pagination and ranges are bounded and deterministic', () => {
  for (const query of [{ page: '0' }, { page: '-1' }, { page: '1.5' }, { page: '100001' },
    { limit: '0' }, { limit: '101' }, { limit: 'Infinity' }, { priceMin: '100', priceMax: '99' }, { minDiscount: '101' }]) assert.throws(() => catalogueQuery(query));
  const query = catalogueQuery({ page: '2', limit: '24', sort: 'price-low', priceMin: '10.50', priceMax: '100' });
  assert.equal(query.page, 2);
  assert.equal(query.limit, 24);
  assert.deepEqual(query.sort, { ourPrice: 1, _id: 1 });
  assert.deepEqual((query.filter.$and as any[])[1].ourPrice, { $gte: 10.5, $lte: 100 });
});

test('query filters cannot replace public availability and freshness constraints', () => {
  const query = catalogueQuery({ search: 'coat', inStock: 'false', onSale: 'false' });
  const [base, user] = query.filter.$and as any[];
  assert.equal(base.status, 'active');
  const external = base.$or.find((entry: any) => entry.purchaseMode === 'external');
  assert.equal(external.inStock, true);
  assert.equal(external.isOnSale, true);
  assert.equal(external.currency, 'USD');
  assert.deepEqual(external.$expr, { $lt: ['$ourPrice', '$originalPrice'] });
  assert.ok(external.lastVerifiedAt.$gte instanceof Date);
  assert.ok(external.lastVerifiedAt.$lte instanceof Date);
  assert.equal(user.inStock, false);
  assert.equal(user.isOnSale, false);
});

test('collection constraints remain independent from contradictory query filters', () => {
  for (const [collection, query, field, expected] of [
    ['trending', { minDiscount: '0' }, 'discount', { $gte: 30 }],
    ['sale', { onSale: 'false' }, 'isOnSale', true],
    ['featured', { featured: 'false' }, 'featured', true],
  ] as const) {
    const result = catalogueQuery(query, collection);
    assert.deepEqual((result.filter.$and as any[])[2][field], expected);
  }
});

test('freshness uses a bounded configured duration and guards future timestamps', () => {
  const saved = process.env.OFFER_MAX_AGE_HOURS;
  const now = new Date('2026-10-28T12:00:00.000Z');
  try {
    process.env.OFFER_MAX_AGE_HOURS = '6';
    assert.equal(freshnessCutoff(now).toISOString(), '2026-10-28T06:00:00.000Z');
    for (const invalid of ['NaN', '0', '169', '-1']) {
      process.env.OFFER_MAX_AGE_HOURS = invalid;
      assert.equal(freshnessCutoff(now).toISOString(), '2026-10-27T12:00:00.000Z');
    }
    const external = (publicProductFilter(now).$or as any[])[1];
    assert.equal(external.lastVerifiedAt.$lte.toISOString(), '2026-10-28T12:01:00.000Z');
  } finally {
    if (saved === undefined) delete process.env.OFFER_MAX_AGE_HOURS; else process.env.OFFER_MAX_AGE_HOURS = saved;
  }
});
