import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { AddressInfo } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import express from 'express';
import { createInventoryCronRouter, INVENTORY_JOB_BUDGET_MS } from '../routes/inventory-cron';
import { createScrapeJobProcessor } from '../inventory/worker';
import { importOffers, ImportInterruptedError } from '../inventory/importer';
import { ScrapeJob } from '../models/ScrapeJob';
import { Product } from '../models/Product';
import { PriceHistory } from '../models/PriceHistory';

const savedSecret = process.env.CRON_SECRET;
const savedEnabled = process.env.INVENTORY_CRON_ENABLED;
const secret = 'cron-unit-test-only-credential-with-48-characters';
afterEach(() => {
  mock.restoreAll();
  if (savedSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = savedSecret;
  if (savedEnabled === undefined) delete process.env.INVENTORY_CRON_ENABLED; else process.env.INVENTORY_CRON_ENABLED = savedEnabled;
});

async function withCron(processor: Parameters<typeof createInventoryCronRouter>[0], run: (url: string) => Promise<void>, startupElapsedMs = 0) {
  const app = express();
  app.use((_req, res, next) => { res.locals.requestStartedAt = Date.now() - startupElapsedMs; next(); });
  app.use('/api/internal/inventory', createInventoryCronRouter(processor));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/internal/inventory/run`); }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}

function configureCron() {
  process.env.CRON_SECRET = secret;
  process.env.INVENTORY_CRON_ENABLED = 'true';
}

function queueOneJob() {
  const updates: any[] = [];
  const claims: any[] = [];
  let pending = true;
  mock.method(ScrapeJob, 'updateMany', (async () => ({ modifiedCount: 0 })) as any);
  mock.method(ScrapeJob, 'findOneAndUpdate', (async (_filter: unknown, update: any) => {
    claims.push(update);
    if (!pending) return null;
    pending = false;
    return { jobId: 'bounded-job', retailer: 'nordstrom', maxPages: 2, ...update.$set };
  }) as any);
  mock.method(ScrapeJob, 'updateOne', (async (filter: unknown, update: unknown) => {
    updates.push({ filter, update }); return { matchedCount: 1 };
  }) as any);
  mock.method(ScrapeJob, 'exists', (() => ({ maxTimeMS: async () => ({ _id: 'bounded-job' }) })) as any);
  return { updates, claims };
}

const collected = { records: [{}], pagesVisited: 1, warnings: [], truncated: true };
const imported = { total: 1, valid: 1, saleOffers: 1, errors: [], committed: true, created: 1, updated: 0, skipped: 0, failures: [], warnings: [] };

test('cron fails closed without a strong secret and rejects unauthorized or non-GET invocations before work', async () => {
  let called = 0;
  configureCron();
  await withCron(async () => { called++; return false; }, async url => {
    for (const configured of [undefined, '', 'short']) {
      if (configured === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = configured;
      assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${configured}` } })).status, 503);
    }
    process.env.CRON_SECRET = secret;
    for (const auth of ['', 'Bearer invalid', `Bearer ${secret}extra`]) {
      const response = await fetch(url, { headers: { Authorization: auth } });
      assert.equal(response.status, 401);
      assert.match(response.headers.get('cache-control')!, /no-store/);
    }
    for (const method of ['HEAD', 'POST', 'PUT']) {
      const response = await fetch(url, { method, headers: { Authorization: `Bearer ${secret}` } });
      assert.equal(response.status, 405);
      assert.equal(response.headers.get('allow'), 'GET');
    }
    process.env.INVENTORY_CRON_ENABLED = 'false';
    assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${secret}` } })).status, 503);
  });
  assert.equal(called, 0);
});

test('cron awaits its bounded job and returns queue failures without exposing internal errors', async () => {
  configureCron();
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let started!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  await withCron(async options => {
    assert.equal(options?.budgetMs, INVENTORY_JOB_BUDGET_MS);
    started(); await held; return true;
  }, async url => {
    let responded = false;
    const response = fetch(url, { headers: { Authorization: `Bearer ${secret}` } }).then(value => { responded = true; return value; });
    await began;
    await delay(5);
    assert.equal(responded, false, 'Response must not finish while database work is still running');
    release();
    const result = await response;
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { status: 'ok', processed: true });
  });
  await withCron(async () => { throw new Error('mongodb://username:private-password@private-host'); }, async url => {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Inventory queue is temporarily unavailable' });
  });
});

test('concurrent worker invocations claim one queued job and fence completion to that claim', async () => {
  const { updates, claims } = queueOneJob();
  let collections = 0;
  let imports = 0;
  const process = createScrapeJobProcessor({
    collect: async () => { collections++; await delay(10); return collected; },
    import: async (_records, _retailer, _type, options) => { imports++; assert.ok(options?.signal); return imported; },
  });
  assert.deepEqual((await Promise.all([process(), process()])).sort(), [false, true]);
  assert.equal(collections, 1);
  assert.equal(imports, 1);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].filter.status, 'running');
  assert.equal(updates[0].filter.leaseToken, claims[0].$set.leaseToken);
  assert.ok(updates[0].filter.leaseExpiresAt.$gt instanceof Date);
  assert.equal(updates[0].update.$set.status, 'completed');
  assert.equal(updates[0].update.$set.productsSaved, 1);
  assert.equal(updates[0].update.$set.truncated, true);
});

test('cold-start time reduces the work budget and exhausted startups never claim a job', async () => {
  configureCron();
  let called = 0;
  await withCron(async options => {
    called++;
    assert.ok(options?.budgetMs && options.budgetMs <= 180_000 && options.budgetMs > 179_000);
    return false;
  }, async url => {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
    assert.equal(response.status, 200);
  }, 80_000);
  await withCron(async () => { called++; return false; }, async url => {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
    assert.equal(response.status, 503);
    assert.match((await response.json() as { error: string }).error, /startup exceeded/);
  }, 260_000);
  assert.equal(called, 1);
});

test('expired execution cancels collection before import and records a retryable failure', async () => {
  const { updates } = queueOneJob();
  let imports = 0;
  const process = createScrapeJobProcessor({
    collect: async (_retailer, options) => {
      assert.ok(options?.signal);
      await delay(60, undefined, { signal: options.signal });
      return collected;
    },
    import: async () => { imports++; return imported; },
  });
  assert.equal(await process({ budgetMs: 20 }), true);
  assert.equal(imports, 0);
  assert.equal(updates[0].update.$set.status, 'failed');
  assert.match(updates[0].update.$set.errorMessages[0], /execution budget/);
  assert.equal(updates[0].update.$unset.leaseToken, '');
});

test('partial import interruption retains confirmed save counts and never reports completion', async () => {
  const { updates } = queueOneJob();
  const controller = new AbortController();
  const process = createScrapeJobProcessor({
    collect: async () => collected,
    import: async () => { controller.abort(); throw new ImportInterruptedError(2, 3, 1); },
  });
  await process({ signal: controller.signal });
  assert.equal(updates[0].update.$set.status, 'failed');
  assert.equal(updates[0].update.$set.productsSaved, 5);
});

test('import cancellation stops further writes while retaining a confirmed first insertion', async () => {
  const controller = new AbortController();
  const reads = mock.method(Product, 'findOne', (async () => null) as any);
  const writes = mock.method(Product, 'findOneAndUpdate', (async () => {
    controller.abort();
    return { value: { _id: 'saved-offer' }, lastErrorObject: { upserted: 'saved-offer' } };
  }) as any);
  const history = mock.method(PriceHistory, 'create', (async () => { throw new Error('Must not start another write after cancellation'); }) as any);
  const source = {
    externalProductId: 'bounded-first', name: 'Silk jacket', brand: 'Example', category: 'clothing',
    originalPrice: 200, salePrice: 100, currency: 'USD', inStock: true,
    retailerUrl: 'https://www.nordstrom.com/s/example-jacket/12345',
    images: ['https://n.nordstrommedia.com/example.jpg'], observedAt: new Date().toISOString(),
  };
  await assert.rejects(importOffers([source, { ...source, externalProductId: 'bounded-second' }], 'nordstrom', 'scrape', { signal: controller.signal }), error => {
    assert.ok(error instanceof ImportInterruptedError);
    assert.equal(error.created, 1);
    assert.equal(error.updated, 0);
    return true;
  });
  assert.equal(reads.mock.callCount(), 1);
  assert.equal(writes.mock.callCount(), 1);
  assert.equal(history.mock.callCount(), 0);
});
