import assert from 'node:assert/strict';
import { afterEach, test, mock } from 'node:test';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import { createApp } from '../app';
import { Cart } from '../models/Cart';
import { Order } from '../models/Order';
import { getStripeServer } from '../lib/stripe';
import { startServer } from '../index';

const savedEnv = { ...process.env };
afterEach(() => {
  mock.restoreAll();
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
});

async function withServer(run: (url: string) => Promise<void>, ready = true) {
  const server = createApp({ isDatabaseReady: () => ready }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`); }
  finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

function configurePayments() {
  process.env.STRIPE_SECRET_KEY = 'sk_test_offline_regression_only';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_offline_regression_only';
}

test('administration and order PII are inaccessible without credentials', async () => {
  process.env.ADMIN_API_TOKEN = 'a'.repeat(48);
  await withServer(async url => {
    for (const [path, method] of [
      ['/api/products', 'POST'], ['/api/products/507f1f77bcf86cd799439011', 'PUT'],
      ['/api/products/507f1f77bcf86cd799439011', 'DELETE'], ['/api/scrape', 'POST'],
      ['/api/scrape/jobs', 'GET'], ['/api/orders', 'GET'], ['/api/orders/email/customer@example.com', 'GET'],
      ['/api/orders/DA-20261027-EXAMPLE', 'GET'], ['/api/orders/507f1f77bcf86cd799439011/status', 'PATCH'],
    ]) {
      const response = await fetch(`${url}${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(method !== 'GET' ? { body: '{}' } : {}) });
      assert.equal(response.status, 401, `${method} ${path}`);
    }
  });
});

test('admin mutation fails closed if ADMIN_API_TOKEN is absent', async () => {
  delete process.env.ADMIN_API_TOKEN;
  await withServer(async url => {
    const response = await fetch(`${url}/api/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 503);
  });
});

test('cart requires a random session ID and isolates database queries by its hash', async () => {
  const sessions: string[] = [];
  mock.method(Cart, 'findOne', ((filter: any) => { sessions.push(filter.sessionHash); return Promise.resolve(null); }) as any);
  await withServer(async url => {
    assert.equal((await fetch(`${url}/api/cart`)).status, 400);
    assert.equal((await fetch(`${url}/api/cart`, { headers: { 'X-Session-Id': 'default' } })).status, 400);
    const firstSession = randomUUID();
    const secondSession = randomUUID();
    for (const session of [firstSession, secondSession, firstSession]) {
      assert.equal((await fetch(`${url}/api/cart`, { headers: { 'X-Session-Id': session } })).status, 200);
    }
    assert.equal(sessions.length, 3);
    assert.notEqual(sessions[0], sessions[1]);
    assert.equal(sessions[0], sessions[2]);
    assert.notEqual(sessions[0], firstSession);
  });
});

test('webhooks reject unsigned or modified payloads and verify raw bytes on both supported URLs', async () => {
  configurePayments();
  const stripe = getStripeServer();
  const payload = JSON.stringify({ id: 'evt_offline', type: 'unhandled.test.event', data: { object: {} } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
  await withServer(async url => {
    for (const path of ['/api/webhooks/stripe', '/api/checkout/webhook']) {
      const unsigned = await fetch(`${url}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
      assert.equal(unsigned.status, 400);
      const signed = await fetch(`${url}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature }, body: payload });
      assert.equal(signed.status, 200);
      const modified = await fetch(`${url}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature }, body: `${payload} ` });
      assert.equal(modified.status, 400);
    }
  });
});

test('partially refunded payments are not marked fully refunded', async () => {
  configurePayments();
  const order = new Order({ total: 100, paymentStatus: 'paid', fulfillmentStatus: 'shipped' });
  mock.method(Order, 'findOne', (() => Promise.resolve(order)) as any);
  const updates: any[] = [];
  mock.method(Order, 'updateOne', ((_filter: any, update: any) => { updates.push(update); return Promise.resolve({ matchedCount: 1 }); }) as any);
  const payload = JSON.stringify({ id: 'evt_refund', type: 'charge.refunded', data: { object: {
    id: 'ch_test', payment_intent: 'pi_test', currency: 'usd', amount: 10000, amount_refunded: 2500, refunded: false,
  } } });
  const signature = getStripeServer().webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
  await withServer(async url => {
    const response = await fetch(`${url}/api/webhooks/stripe`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature }, body: payload });
    assert.equal(response.status, 200);
    assert.deepEqual(updates[0], { $max: { refundedAmount: 25 } });
  });
});

test('health and API report database failure instead of mock success', async () => {
  await withServer(async url => {
    assert.equal((await fetch(`${url}/api/health`)).status, 503);
    assert.equal((await fetch(`${url}/api/products`)).status, 503);
  }, false);
});

test('production boot refuses missing database configuration before opening a port', async () => {
  process.env.NODE_ENV = 'production';
  delete process.env.MONGODB_URI;
  await assert.rejects(startServer(), /MONGODB_URI is required/);
});

test('CORS allows configured storefront and rejects other browser origins', async () => {
  process.env.NODE_ENV = 'production';
  process.env.CORS_ORIGINS = 'https://shop.example.com';
  await withServer(async url => {
    const allowed = await fetch(`${url}/api/health`, { headers: { Origin: 'https://shop.example.com' } });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://shop.example.com');
    assert.equal((await fetch(`${url}/api/health`, { headers: { Origin: 'https://untrusted.example.com' } })).status, 403);
  });
});
