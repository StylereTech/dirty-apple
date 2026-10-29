import assert from 'node:assert/strict';
import { afterEach, test, mock } from 'node:test';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import { createApp } from '../app';
import { Cart } from '../models/Cart';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { getStripeServer } from '../lib/stripe';
import { normalizeItems, quantity, validateProduct } from '../lib/commerce';
import { verifyPaidIntent } from '../lib/orders';

const savedEnv = { ...process.env };
afterEach(() => {
  mock.restoreAll();
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
});

async function withServer(run: (url: string) => Promise<void>) {
  const server = createApp({ isDatabaseReady: () => true }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`); }
  finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

const productId = '507f1f77bcf86cd799439011';
const product = {
  _id: productId, name: 'Verified direct inventory', brand: 'Test', ourPrice: 125.55, originalPrice: 200,
  images: ['https://example.com/product.jpg'], status: 'active', inStock: true, currency: 'USD', purchaseMode: 'direct',
  sizes: [{ size: 'M', available: true }],
};
const customer = { firstName: 'Test', lastName: 'Buyer', email: 'buyer@example.com', address: '123 Test St', city: 'Dallas', state: 'TX', zip: '75201', country: 'US' };

test('order number exists before required-field validation', async () => {
  const order = new Order({ items: [], customer: { ...customer, address: { street: customer.address, city: customer.city, state: customer.state, zip: customer.zip, country: 'US' } }, subtotal: 100, total: 115 });
  await order.validate();
  assert.match(order.orderNumber, /^DA-\d{8}-[A-F0-9]{12}$/);
});

test('quantities and duplicate lines cannot bypass order limits', () => {
  for (const value of [-1, 0, 1.5, 11, NaN, Infinity, '2']) assert.throws(() => quantity(value));
  assert.throws(() => normalizeItems([
    { productId, size: 'M', quantity: 6 }, { productId, size: 'M', quantity: 6 },
  ]), /Quantity/);
});

test('external offers, out-of-stock products and unavailable sizes cannot be purchased locally', () => {
  assert.throws(() => validateProduct({ ...product, purchaseMode: 'external' }, 'M'), /retailer website/);
  assert.throws(() => validateProduct({ ...product, inStock: false }, 'M'), /no longer available/);
  assert.throws(() => validateProduct(product, 'L'), /available size/);
});

test('direct checkout fails closed by default without contacting Stripe', async () => {
  delete process.env.DIRECT_CHECKOUT_ENABLED;
  await withServer(async url => {
    const response = await fetch(`${url}/api/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-Id': randomUUID() }, body: JSON.stringify({ items: [{ productId, price: 0.01, quantity: 1, size: 'M' }], customer }) });
    assert.equal(response.status, 503);
  });
});

test('known IDs cannot bypass demo inventory exclusion in cart or checkout', async () => {
  process.env.DIRECT_CHECKOUT_ENABLED = 'true';
  process.env.STRIPE_SECRET_KEY = 'sk_test_offline_demo_only';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_offline_demo_only';
  let selectedProduct: any = product;
  mock.method(Product, 'find', (() => ({ lean: async () => [selectedProduct] })) as any);
  mock.method(Product, 'findById', (() => ({ lean: async () => selectedProduct })) as any);
  mock.method(Order, 'findOne', (() => ({ select: async () => null })) as any);
  mock.method(getStripeServer().paymentIntents, 'create', (async () => { throw new Error('Demo products must not reach Stripe'); }) as any);
  const headers = { 'Content-Type': 'application/json', 'X-Session-Id': randomUUID(), 'Idempotency-Key': randomUUID() };
  await withServer(async url => {
    for (const variant of [
      { ...product, sourceType: 'demo' },
      { ...product, images: ['https://picsum.photos/seed/mock/600/800'] },
      { ...product, images: ['https://fastly.picsum.photos/seed/mock/600/800'] },
    ]) {
      selectedProduct = variant;
      const cart = await fetch(`${url}/api/cart`, { method: 'POST', headers, body: JSON.stringify({ productId, quantity: 1, size: 'M' }) });
      assert.equal(cart.status, 409);
      const checkout = await fetch(`${url}/api/checkout`, { method: 'POST', headers, body: JSON.stringify({ items: [{ productId, quantity: 1, size: 'M' }], customer }) });
      assert.equal(checkout.status, 409);
      assert.match((await checkout.json() as any).error, /Demonstration products/);
    }
  });
});

test('checkout prices from the catalog, reuses idempotent requests, verifies and confirms exactly one order', async () => {
  process.env.DIRECT_CHECKOUT_ENABLED = 'true';
  process.env.STRIPE_SECRET_KEY = 'sk_test_offline_commerce_only';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_offline_commerce_only';
  const stripe = getStripeServer();
  const orders = new Map<string, any>();
  const intents = new Map<string, any>();
  let createdIntents = 0;
  let paidTransitions = 0;
  let currentCatalog: any = product;
  mock.method(Product, 'find', (() => ({ lean: async () => [currentCatalog] })) as any);
  mock.method(Order.prototype, 'save', (async function (this: any) {
    orders.set(String(this._id), this);
    return this;
  }) as any);
  mock.method(Order, 'findOne', ((filter: any) => {
    const found = [...orders.values()].find(order => Object.entries(filter).every(([key, value]) => order[key] === value));
    return filter.checkoutKeyHash ? { select: async () => found || null } : Promise.resolve(found || null);
  }) as any);
  mock.method(Order, 'findById', ((id: any) => Promise.resolve(orders.get(String(id)) || null)) as any);
  mock.method(Order, 'findOneAndUpdate', ((filter: any, update: any) => {
    const order = orders.get(String(filter._id));
    if (!order || !filter.paymentStatus.$in.includes(order.paymentStatus)) return Promise.resolve(null);
    paidTransitions++;
    Object.assign(order, update.$set);
    return Promise.resolve(order);
  }) as any);
  mock.method(stripe.paymentIntents, 'create', (async (params: any) => {
    createdIntents++;
    const intent = { id: 'pi_offline123', client_secret: 'pi_offline123_secret_offline', status: 'requires_payment_method', amount_received: 0, ...params };
    intents.set(intent.id, intent);
    return intent;
  }) as any);
  mock.method(stripe.paymentIntents, 'retrieve', (async (id: string) => intents.get(id)) as any);
  const session = randomUUID();
  const idempotencyKey = randomUUID();
  const headers = { 'Content-Type': 'application/json', 'X-Session-Id': session, 'Idempotency-Key': idempotencyKey };
  const request = { items: [{ productId, quantity: 2, size: 'M', price: 0.01, name: 'Tampered price' }], customer };
  await withServer(async url => {
    const created = await fetch(`${url}/api/checkout`, { method: 'POST', headers, body: JSON.stringify(request) });
    assert.equal(created.status, 200);
    const response = await created.json() as any;
    assert.equal(response.subtotal, 251.1);
    assert.equal(response.total, 266.1);
    assert.equal(intents.get('pi_offline123').amount, 26610);
    assert.equal(orders.size, 1);
    assert.equal(orders.values().next().value.items[0].name, product.name);
    const retried = await fetch(`${url}/api/checkout`, { method: 'POST', headers, body: JSON.stringify(request) });
    assert.equal(retried.status, 200);
    assert.equal(createdIntents, 1);
    assert.equal(orders.size, 1);
    currentCatalog = { ...product, sourceType: 'demo' };
    const nowDemo = await fetch(`${url}/api/checkout`, { method: 'POST', headers, body: JSON.stringify(request) });
    assert.equal(nowDemo.status, 409);
    currentCatalog = product;
    const changed = await fetch(`${url}/api/checkout`, { method: 'POST', headers, body: JSON.stringify({ ...request, customer: { ...customer, address: 'Other address' } }) });
    assert.equal(changed.status, 409);
    intents.get('pi_offline123').status = 'processing';
    const changedWhileProcessing = await fetch(`${url}/api/checkout`, { method: 'POST', headers, body: JSON.stringify({ ...request, items: [{ productId, quantity: 3, size: 'M' }] }) });
    assert.equal(changedWhileProcessing.status, 409);
    const processing = await fetch(`${url}/api/checkout`, { method: 'POST', headers, body: JSON.stringify(request) });
    assert.equal(processing.status, 200);
    assert.equal((await processing.json() as any).paymentStatus, 'processing');
    assert.equal(createdIntents, 1);
    intents.get('pi_offline123').status = 'succeeded';
    intents.get('pi_offline123').amount_received = 26610;
    const confirm = { paymentIntentId: 'pi_offline123', orderAccessToken: response.orderAccessToken, items: [{ productId, quantity: 1000, price: 0.01 }] };
    for (let attempt = 0; attempt < 2; attempt++) {
      const confirmed = await fetch(`${url}/api/checkout/confirm`, { method: 'POST', headers, body: JSON.stringify(confirm) });
      assert.equal(confirmed.status, 200);
      const result = await confirmed.json() as any;
      assert.equal(result.total, 266.1);
      assert.equal(result.paymentStatus, 'paid');
      assert.equal(result.items[0].quantity, 2);
      assert.equal(result.stripePaymentId, undefined);
      assert.equal(result.accessTokenHash, undefined);
    }
    assert.equal(paidTransitions, 1);
    const stranger = await fetch(`${url}/api/checkout/confirm`, { method: 'POST', headers: { ...headers, 'X-Session-Id': randomUUID() }, body: JSON.stringify(confirm) });
    assert.equal(stranger.status, 404);
    const wrongToken = await fetch(`${url}/api/checkout/confirm`, { method: 'POST', headers, body: JSON.stringify({ ...confirm, orderAccessToken: randomUUID() }) });
    assert.equal(wrongToken.status, 404);
    const stored = orders.values().next().value;
    stored.fulfillmentStatus = 'cancelled';
    const cancelled = await fetch(`${url}/api/checkout`, { method: 'POST', headers, body: JSON.stringify(request) });
    assert.equal(cancelled.status, 410);
    stored.fulfillmentStatus = 'pending';
    stored.paymentStatus = 'refunded';
    const refunded = await fetch(`${url}/api/checkout`, { method: 'POST', headers, body: JSON.stringify(request) });
    assert.equal(refunded.status, 410);
    stored.paymentStatus = 'pending';
    intents.get('pi_offline123').status = 'canceled';
    const canceledIntent = await fetch(`${url}/api/checkout`, { method: 'POST', headers, body: JSON.stringify(request) });
    assert.equal(canceledIntent.status, 410);
    assert.equal(createdIntents, 1);
  });
});

test('payment proof must match order identity, currency and exact amount', () => {
  const order = new Order({ total: 100, stripePaymentId: 'pi_test123' });
  const intent = { id: 'pi_test123', status: 'succeeded', amount: 10000, amount_received: 10000, currency: 'usd', metadata: { orderId: String(order._id) } };
  verifyPaidIntent(order, intent as any);
  for (const patch of [{ amount: 1 }, { amount_received: 1 }, { currency: 'eur' }, { id: 'pi_other' }, { metadata: { orderId: 'other' } }, { status: 'processing' }]) {
    assert.throws(() => verifyPaidIntent(order, { ...intent, ...patch } as any));
  }
});

test('canceling an unpaid order also cancels its issued Stripe intent', async () => {
  process.env.ADMIN_API_TOKEN = 'a'.repeat(48);
  process.env.STRIPE_SECRET_KEY = 'sk_test_offline_cancellation_only';
  const stripe = getStripeServer();
  const order = new Order({ total: 100, stripePaymentId: 'pi_cancel123', paymentStatus: 'pending', fulfillmentStatus: 'pending' });
  const intent = { id: order.stripePaymentId, status: 'requires_payment_method', amount: 10000, currency: 'usd', metadata: { orderId: String(order._id) } };
  let cancelCalls = 0;
  mock.method(Order, 'findByIdAndUpdate', (async (_id: any, update: any) => { Object.assign(order, update.$set); return order; }) as any);
  mock.method(Order, 'findOneAndUpdate', (async (_filter: any, update: any) => { Object.assign(order, update.$set); return order; }) as any);
  mock.method(stripe.paymentIntents, 'retrieve', (async () => intent) as any);
  mock.method(stripe.paymentIntents, 'cancel', (async (id: string) => { assert.equal(id, intent.id); cancelCalls++; return { ...intent, status: 'canceled' }; }) as any);
  await withServer(async url => {
    const result = await fetch(`${url}/api/orders/${order._id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ADMIN_API_TOKEN}` }, body: JSON.stringify({ fulfillmentStatus: 'cancelled' }) });
    assert.equal(result.status, 200);
    const body = await result.json() as any;
    assert.equal(body.fulfillmentStatus, 'cancelled');
    assert.equal(body.paymentStatus, 'failed');
    assert.equal(cancelCalls, 1);
  });
});

test('checkout closes a newly issued intent when order cancellation races payment creation', async () => {
  process.env.DIRECT_CHECKOUT_ENABLED = 'true';
  process.env.STRIPE_SECRET_KEY = 'sk_test_offline_cancel_race_only';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_offline_cancel_race_only';
  const stripe = getStripeServer();
  let order: any;
  let cancelCalls = 0;
  mock.method(Product, 'find', (() => ({ lean: async () => [product] })) as any);
  mock.method(Order, 'findOne', (() => ({ select: async () => null })) as any);
  mock.method(Order.prototype, 'save', (async function (this: any) { order = this; return this; }) as any);
  mock.method(Order, 'findById', (async () => { order.fulfillmentStatus = 'cancelled'; return order; }) as any);
  mock.method(Order, 'findOneAndUpdate', (async (_filter: any, update: any) => { Object.assign(order, update.$set); return order; }) as any);
  mock.method(stripe.paymentIntents, 'create', (async (params: any) => ({ id: 'pi_race123', client_secret: 'secret_that_must_not_be_returned', status: 'requires_payment_method', ...params })) as any);
  mock.method(stripe.paymentIntents, 'cancel', (async () => { cancelCalls++; return { status: 'canceled' }; }) as any);
  await withServer(async url => {
    const result = await fetch(`${url}/api/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-Id': randomUUID(), 'Idempotency-Key': randomUUID() }, body: JSON.stringify({ items: [{ productId, quantity: 1, size: 'M' }], customer }) });
    assert.equal(result.status, 410);
    assert.equal((await result.json() as any).clientSecret, undefined);
    assert.equal(cancelCalls, 1);
  });
});

test('cart ignores submitted prices and conditional cleanup preserves changed quantities', async () => {
  let saved: any = null;
  mock.method(Product, 'findById', (() => ({ lean: async () => product })) as any);
  mock.method(Product, 'find', (() => ({ lean: async () => [product] })) as any);
  mock.method(Cart, 'findOne', ((filter: any) => Promise.resolve(saved?.sessionHash === filter.sessionHash ? saved : null)) as any);
  mock.method(Cart.prototype, 'save', (async function (this: any) { saved = this; return this; }) as any);
  const headers = { 'Content-Type': 'application/json', 'X-Session-Id': randomUUID() };
  await withServer(async url => {
    const added = await fetch(`${url}/api/cart`, { method: 'POST', headers, body: JSON.stringify({ productId, size: 'M', quantity: 2, price: 1 }) });
    assert.equal(added.status, 200);
    const cart = await added.json() as any;
    assert.equal(cart.subtotal, 251.1);
    assert.equal(cart.count, 2);
    const wrong = await fetch(`${url}/api/cart/${cart.items[0]._id}`, { method: 'DELETE', headers, body: JSON.stringify({ expectedQuantity: 1, expectedProductId: productId, expectedSize: 'M' }) });
    assert.equal(wrong.status, 409);
    assert.equal(saved.items.length, 1);
    const valid = await fetch(`${url}/api/cart/${cart.items[0]._id}`, { method: 'DELETE', headers, body: JSON.stringify({ expectedQuantity: 2, expectedProductId: productId, expectedSize: 'M' }) });
    assert.equal(valid.status, 200);
    assert.equal(saved.items.length, 0);
  });
});
