import assert from 'node:assert/strict';
import { afterEach, test, mock } from 'node:test';
import { AddressInfo } from 'node:net';
import { setImmediate } from 'node:timers/promises';
import app, { createApp } from '../app';
import { getStripeServer } from '../lib/stripe';
import { Cart } from '../models/Cart';

const savedEnv = { ...process.env };
afterEach(() => {
  mock.restoreAll();
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
});

async function withServer(application: ReturnType<typeof createApp>, run: (url: string) => Promise<void>) {
  const server = application.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`); }
  finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test('the Vercel-detected default app initializes safely and reports missing configuration as 503', async () => {
  process.env.VERCEL = '1';
  delete process.env.MONGODB_URI;
  await withServer(app, async url => {
    const health = await fetch(`${url}/api/health`);
    assert.equal(health.status, 503);
    assert.equal(health.headers.get('cache-control'), 'no-store');
    assert.equal(health.headers.get('retry-after'), '5');
    assert.deepEqual(await health.json(), { status: 'unavailable', database: 'unavailable' });
    const products = await fetch(`${url}/api/products`);
    assert.equal(products.status, 503);
    assert.deepEqual(await products.json(), { error: 'Service is temporarily unavailable' });
  });
});

test('requests wait for startup and no route runs when initialization rejects with sensitive details', async () => {
  let complete!: () => void;
  let started!: () => void;
  const startupStarted = new Promise<void>(resolve => { started = resolve; });
  const startup = new Promise<void>(resolve => { complete = resolve; });
  let routeCalls = 0;
  mock.method(Cart, 'findOne', (() => { routeCalls++; return Promise.resolve(null); }) as any);
  const application = createApp({
    initializeDatabase: () => { started(); return startup; },
    isDatabaseReady: () => true,
  });
  await withServer(application, async url => {
    const response = fetch(`${url}/api/cart`, { headers: { 'X-Session-Id': '813c914b-0a35-4891-90f1-936c435a5a16' } });
    await startupStarted;
    await setImmediate();
    assert.equal(routeCalls, 0);
    complete();
    assert.equal((await response).status, 200);
    assert.equal(routeCalls, 1);
  });

  const unavailable = createApp({
    initializeDatabase: async () => { throw new Error('mongodb://secret-user:secret-password@private-host/orders'); },
    isDatabaseReady: () => true,
  });
  await withServer(unavailable, async url => {
    const response = await fetch(`${url}/api/cart`, { headers: { 'X-Session-Id': '813c914b-0a35-4891-90f1-936c435a5a16' } });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Service is temporarily unavailable' });
    assert.equal(routeCalls, 1);
  });
});

test('awaiting database startup preserves Stripe raw-body verification on both webhook paths', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_offline_serverless_regression';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_offline_serverless_regression';
  const payload = '{\n  "id": "evt_offline_serverless", "type": "unhandled.test.event", "data": { "object": {} }\n}';
  const signature = getStripeServer().webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  const application = createApp({ initializeDatabase: async () => { await setImmediate(); }, isDatabaseReady: () => true });
  await withServer(application, async url => {
    for (const path of ['/api/webhooks/stripe', '/api/checkout/webhook']) {
      const send = (body: string) => fetch(`${url}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature },
        body,
      });
      assert.equal((await send(payload)).status, 200);
      assert.equal((await send(`${payload} `)).status, 400);
    }
  });
});
