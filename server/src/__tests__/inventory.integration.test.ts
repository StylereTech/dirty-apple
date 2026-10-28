import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { Product } from '../models/Product';
import { PriceHistory } from '../models/PriceHistory';
import { ScrapeJob } from '../models/ScrapeJob';
import { normalizeOffer } from '../inventory/normalize';
import { importOffers } from '../inventory/importer';
import { createScrapeJobProcessor, processNextScrapeJob } from '../inventory/worker';

function source(patch: Record<string, unknown> = {}) {
  return {
    externalProductId: 'source-100', name: 'Example silk jacket', brand: 'Example', category: 'clothing',
    originalPrice: 200, salePrice: 100, currency: 'USD', inStock: true,
    retailerUrl: 'https://www.nordstrom.com/s/example-jacket/12345',
    images: ['https://n.nordstrommedia.com/example.jpg'], observedAt: new Date().toISOString(), ...patch,
  };
}

// This suite always starts its own disposable localhost MongoDB. It never uses MONGODB_URI.
test('isolated real MongoDB inventory and catalog integration', {
  skip: process.env.RUN_MONGO_TESTS !== '1', timeout: 300_000,
}, async t => {
  assert.equal(mongoose.connection.readyState, 0, 'Integration tests must not reuse an existing database connection');
  const savedAdmin = process.env.ADMIN_API_TOKEN;
  const savedAge = process.env.OFFER_MAX_AGE_HOURS;
  const admin = 'dirtyapple-isolated-integration-test-only-token';
  process.env.ADMIN_API_TOKEN = admin;
  process.env.OFFER_MAX_AGE_HOURS = '24';
  const database = await MongoMemoryServer.create({
    binary: { downloadDir: process.env.MONGOMS_DOWNLOAD_DIR || join(tmpdir(), 'dirtyapple-mongodb-binaries') },
    instance: { ip: '127.0.0.1', dbName: 'dirtyapple_inventory_integration' },
  });
  let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
  try {
    await mongoose.connect(database.getUri(), { serverSelectionTimeoutMS: 5_000 });
    await Promise.all([Product.syncIndexes(), PriceHistory.syncIndexes(), ScrapeJob.syncIndexes()]);
    server = createApp().listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => { server!.once('listening', resolve); server!.once('error', reject); });
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const request = (path: string, method = 'GET', body?: unknown, authenticated = true) => fetch(`${origin}${path}`, {
      method,
      headers: { ...(authenticated ? { Authorization: `Bearer ${admin}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    t.beforeEach(async () => {
      await Promise.all([Product.deleteMany({}), PriceHistory.deleteMany({}), ScrapeJob.deleteMany({})]);
      process.env.ADMIN_API_TOKEN = admin;
    });

    await t.test('invalid imports leave products, history and job collections untouched', async () => {
      const records = [source(), source({ externalProductId: 'bad', currency: 'EUR' })];
      const response = await request('/api/inventory/import', 'POST', { retailer: 'nordstrom', records, dryRun: false });
      assert.equal(response.status, 422);
      assert.equal(await Product.countDocuments(), 0);
      assert.equal(await PriceHistory.countDocuments(), 0);
      assert.equal(await ScrapeJob.countDocuments(), 0);
    });

    await t.test('imports use real unique indexes and refresh without duplicating products or losing organization', async () => {
      const first = await importOffers([source({ variantId: 'M', promotion: 'Seasonal offer' })], 'nordstrom');
      assert.deepEqual(first.failures, []);
      assert.equal(first.created, 1);
      const original = await Product.findOne({ externalProductId: 'source-100', variantId: 'M' }).orFail();
      assert.equal(original.status, 'draft');
      const slug = original.slug;
      await Product.updateOne({ _id: original._id }, { $set: { status: 'active', category: 'accessories', gender: 'women', featured: true } });
      const updated = await importOffers([source({ variantId: 'M', name: 'Renamed product', salePrice: 80, category: 'other', observedAt: new Date(Date.now() + 1000).toISOString() })], 'nordstrom');
      assert.deepEqual(updated.failures, []);
      assert.equal(updated.updated, 1);
      const refreshed = await Product.findById(original._id).orFail();
      assert.equal(refreshed.slug, slug);
      assert.equal(refreshed.category, 'accessories');
      assert.equal(refreshed.gender, 'women');
      assert.equal(refreshed.featured, true);
      assert.equal(refreshed.status, 'active');
      assert.equal(refreshed.promotion, undefined);
      assert.equal(refreshed.ourPrice, 80);
      assert.equal(await PriceHistory.countDocuments({ product: original._id }), 2);
      await importOffers([source({ variantId: 'L' })], 'nordstrom');
      await importOffers([source({ variantId: 'M', retailerUrl: 'https://www.saksfifthavenue.com/product/example.html' })], 'saks');
      assert.equal(await Product.countDocuments(), 3);
      const products = await Product.find().lean();
      assert.equal(new Set(products.map(product => product.sku)).size, 3);
      await assert.rejects(Product.create({ ...normalizeOffer(source({ variantId: 'M' }), 'nordstrom'), sku: 'different-sku', slug: 'different-slug' }), (error: unknown) => (error as { code: number }).code === 11000);
    });

    await t.test('concurrent absent-product imports create one offer and do not misreport a second creation', async child => {
      const findOne = Product.findOne.bind(Product);
      let arrived = 0;
      let release!: () => void;
      const barrier = new Promise<void>(resolve => { release = resolve; });
      const spy = child.mock.method(Product, 'findOne', (async (...args: unknown[]) => {
        const product = await (findOne as any)(...args);
        if (++arrived === 2) release();
        await barrier;
        return product;
      }) as any);
      let results;
      try { results = await Promise.all([importOffers([source()], 'nordstrom'), importOffers([source()], 'nordstrom')]); }
      finally { spy.mock.restore(); }
      assert.equal(await Product.countDocuments(), 1);
      assert.equal(results.reduce((sum, result) => sum + result.created, 0), 1);
      assert.equal(results.reduce((sum, result) => sum + result.updated, 0), 0);
      assert.equal(await PriceHistory.countDocuments(), 1);
      assert.ok(results.every(result => result.failures.every(failure => /Concurrent/.test(failure.error))));
    });

    await t.test('a manual delist between read and refresh cannot be overwritten', async child => {
      await importOffers([source()], 'nordstrom');
      await Product.updateOne({}, { $set: { status: 'active' } });
      const findOne = Product.findOne.bind(Product);
      const spy = child.mock.method(Product, 'findOne', (async (...args: unknown[]) => {
        const product = await (findOne as any)(...args);
        await Product.updateOne({ _id: product._id }, { $set: { status: 'delisted' } });
        return product;
      }) as any);
      let result;
      try { result = await importOffers([source({ salePrice: 75 })], 'nordstrom'); }
      finally { spy.mock.restore(); }
      assert.equal(result.updated, 0);
      assert.equal(result.skipped, 1);
      const product = await Product.findOne().orFail();
      assert.equal(product.status, 'delisted');
      assert.equal(product.ourPrice, 100);
      await importOffers([source({ salePrice: 70 })], 'nordstrom');
      assert.equal((await Product.findById(product._id).orFail()).status, 'delisted');
    });

    await t.test('older observations cannot roll back current prices or stock', async () => {
      await importOffers([source()], 'nordstrom');
      const result = await importOffers([source({ salePrice: 50, inStock: false, observedAt: new Date(Date.now() - 3_600_000).toISOString() })], 'nordstrom');
      assert.equal(result.skipped, 1);
      const product = await Product.findOne().orFail();
      assert.equal(product.ourPrice, 100);
      assert.equal(product.inStock, true);
      assert.equal(await PriceHistory.countDocuments(), 1);
    });

    await t.test('full-price and sold-out refreshes hide existing listings and are not created as new deals', async () => {
      await importOffers([source({ externalProductId: 'full' }), source({ externalProductId: 'stock' })], 'nordstrom');
      await Product.updateMany({}, { $set: { status: 'active' } });
      const refreshed = await importOffers([source({ externalProductId: 'full', salePrice: 200 }), source({ externalProductId: 'stock', inStock: false })], 'nordstrom');
      assert.deepEqual(refreshed.failures, []);
      assert.equal((await Product.findOne({ externalProductId: 'full' }).orFail()).status, 'delisted');
      assert.equal((await Product.findOne({ externalProductId: 'stock' }).orFail()).status, 'sold_out');
      const skipped = await importOffers([source({ externalProductId: 'new-full', salePrice: 200 }), source({ externalProductId: 'new-stock', inStock: false })], 'nordstrom');
      assert.equal(skipped.skipped, 2);
      assert.equal(await Product.countDocuments(), 2);
      assert.equal((await (await request('/api/products')).json() as any).total, 0);
    });

    await t.test('public list, detail, related, featured and deals all exclude stale or invalid offers', async () => {
      const fresh = await Product.create({ ...normalizeOffer(source({ name: 'Fresh.* [VIP]', externalProductId: 'fresh' }), 'nordstrom'), status: 'active', featured: true });
      const hidden = [];
      for (const [id, patch] of [
        ['stale', { lastVerifiedAt: new Date(Date.now() - 25 * 3_600_000) }],
        ['future', { lastVerifiedAt: new Date(Date.now() + 86_400_000) }],
        ['fullprice', { ourPrice: 200, isOnSale: true }],
        ['stock', { inStock: false }], ['images', { images: [] }], ['demo', { sourceType: 'demo' }],
      ] as const) hidden.push(await Product.create({ ...normalizeOffer(source({ externalProductId: id }), 'nordstrom'), status: 'active', featured: true, ...patch }));
      const listing = await request('/api/products');
      assert.equal(listing.status, 200);
      assert.equal((await listing.json() as any).total, 1);
      for (const product of hidden) {
        assert.equal((await request(`/api/products/${product._id}`)).status, 404);
        assert.equal((await request(`/api/products/slug/${product.slug}`)).status, 404);
      }
      const detail = await (await request(`/api/products/${fresh._id}`)).json() as any;
      assert.deepEqual(detail.related, []);
      for (const path of ['/api/products/featured', '/api/products/deals']) {
        const rows = await (await request(path)).json() as any[];
        assert.deepEqual(rows.map(row => row._id), [String(fresh._id)]);
      }
      assert.equal((await (await request('/api/products?search=%2E%2A')).json() as any).total, 1);
      for (const path of ['/api/products?search[$ne]=anything', '/api/products?limit=101', '/api/inventory/products?stale[$ne]=true']) {
        assert.equal((await request(path)).status, 400, path);
      }
    });

    await t.test('collection membership cannot be overridden by query parameters', async () => {
      await Product.create({ ...normalizeOffer(source({ externalProductId: 'high' }), 'nordstrom'), status: 'active', featured: true });
      await Product.create({ ...normalizeOffer(source({ externalProductId: 'low', salePrice: 180 }), 'nordstrom'), status: 'active', featured: false });
      const trending = await (await request('/api/products/collections/trending?minDiscount=0')).json() as any;
      assert.equal(trending.total, 1);
      assert.equal(trending.products[0].externalProductId, 'high');
      assert.equal((await (await request('/api/products/collections/featured?featured=false')).json() as any).total, 0);
      assert.equal((await (await request('/api/products/collections/sale?onSale=false')).json() as any).total, 0);
    });

    await t.test('review can publish only fresh organized offers; absent admin configuration fails closed', async () => {
      await importOffers([source({ externalProductId: 'unknown', category: 'Unrecognized source category' }), source({ externalProductId: 'stale', observedAt: new Date(Date.now() - 2 * 86_400_000).toISOString() })], 'nordstrom');
      const unknown = await Product.findOne({ externalProductId: 'unknown' }).orFail();
      const stale = await Product.findOne({ externalProductId: 'stale' }).orFail();
      assert.equal((await request(`/api/inventory/products/${unknown._id}`, 'PATCH', { status: 'active' })).status, 400);
      assert.equal((await request(`/api/inventory/products/${stale._id}`, 'PATCH', { status: 'active' })).status, 400);
      assert.equal((await request(`/api/inventory/products/${unknown._id}`, 'PATCH', { status: 'active', category: 'clothing', gender: 'women' })).status, 200);
      assert.equal((await Product.findById(unknown._id).orFail()).status, 'active');
      assert.equal((await request('/api/inventory/products', 'GET', undefined, false)).status, 401);
      delete process.env.ADMIN_API_TOKEN;
      assert.equal((await request('/api/inventory/products')).status, 503);
      assert.equal((await request('/api/inventory/import', 'POST', { retailer: 'nordstrom', records: [source()], dryRun: false })).status, 503);
    });

    await t.test('expired worker leases become failed and release the retailer queue lock', async () => {
      await ScrapeJob.create({ jobId: 'expired-test-job', retailer: 'nordstrom', activeRetailer: 'nordstrom', sourceType: 'scrape', status: 'running', leaseExpiresAt: new Date(Date.now() - 1_000) });
      assert.equal(await processNextScrapeJob(), false);
      const job = await ScrapeJob.findOne({ jobId: 'expired-test-job' }).orFail();
      assert.equal(job.status, 'failed');
      assert.equal(job.activeRetailer, undefined);
      assert.equal(job.leaseExpiresAt, undefined);
      assert.match(job.errorMessages.join(' '), /lease expired/);
      await ScrapeJob.create({ jobId: 'retry-test-job', retailer: 'nordstrom', activeRetailer: 'nordstrom', sourceType: 'scrape', status: 'pending' });
    });

    await t.test('concurrent bounded workers atomically claim one job and save one reviewed draft', async () => {
      await ScrapeJob.create({ jobId: 'one-claim', retailer: 'nordstrom', activeRetailer: 'nordstrom', sourceType: 'scrape', status: 'pending' });
      let collections = 0;
      const process = createScrapeJobProcessor({ collect: async () => {
        collections++;
        return { records: [source()], pagesVisited: 1, warnings: [], truncated: false };
      } });
      assert.deepEqual((await Promise.all([process(), process()])).sort(), [false, true]);
      assert.equal(collections, 1);
      assert.equal(await Product.countDocuments(), 1);
      assert.equal((await Product.findOne().orFail()).status, 'draft');
      const job = await ScrapeJob.findOne({ jobId: 'one-claim' }).orFail();
      assert.equal(job.status, 'completed');
      assert.equal(job.productsSaved, 1);
      assert.equal(job.leaseToken, undefined);
      assert.equal(job.activeRetailer, undefined);
    });

    await t.test('a late worker cannot import or complete after another invocation recovers its expired lease', async () => {
      await ScrapeJob.create({ jobId: 'late-worker', retailer: 'nordstrom', activeRetailer: 'nordstrom', sourceType: 'scrape', status: 'pending' });
      let started!: () => void;
      const began = new Promise<void>(resolve => { started = resolve; });
      let release!: () => void;
      const held = new Promise<void>(resolve => { release = resolve; });
      const process = createScrapeJobProcessor({ collect: async () => {
        started(); await held;
        return { records: [source()], pagesVisited: 1, warnings: [], truncated: false };
      } });
      const late = process();
      await began;
      try {
        await ScrapeJob.updateOne({ jobId: 'late-worker' }, { $set: { leaseExpiresAt: new Date(Date.now() - 1_000) } });
        assert.equal(await processNextScrapeJob(), false);
      } finally { release(); }
      await late;
      const job = await ScrapeJob.findOne({ jobId: 'late-worker' }).orFail();
      assert.equal(job.status, 'failed');
      assert.match(job.errorMessages.join(' '), /lease expired/);
      assert.equal(await Product.countDocuments(), 0);
    });
  } finally {
    if (server) { server.closeAllConnections(); await new Promise<void>(resolve => server!.close(() => resolve())); }
    await mongoose.disconnect();
    await database.stop();
    if (savedAdmin === undefined) delete process.env.ADMIN_API_TOKEN; else process.env.ADMIN_API_TOKEN = savedAdmin;
    if (savedAge === undefined) delete process.env.OFFER_MAX_AGE_HOURS; else process.env.OFFER_MAX_AGE_HOURS = savedAge;
  }
});
