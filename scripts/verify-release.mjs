#!/usr/bin/env node
/**
 * Read-only checks against an explicitly selected dirtyApple release.
 * No products, carts, orders, jobs, payments or database settings are changed.
 * Browser interaction and a real approved source refresh are separate release gates.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const usage = `Usage: node scripts/verify-release.mjs --frontend https://dirty-apple.shop [--api https://API_ORIGIN] [--allow-empty]

Required by default: at least one current published product.
--allow-empty is only for infrastructure staging; it does not certify inventory readiness.

Optional environment variables (never pass secrets as command-line arguments):
  LIVE_ADMIN_TOKEN                       Verify authenticated inventory reads.
  VERCEL_AUTOMATION_BYPASS_SECRET         Access the selected protected frontend.
  VERCEL_API_AUTOMATION_BYPASS_SECRET     Access the selected protected API.
  OFFER_MAX_AGE_HOURS                     Match the API setting; defaults to 24.
`;

const args = process.argv.slice(2);
if (args.includes('--help')) { console.log(usage); process.exit(0); }
let frontendArg, apiArg, allowEmpty = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--frontend') frontendArg = args[++i];
  else if (args[i] === '--api') apiArg = args[++i];
  else if (args[i] === '--allow-empty') allowEmpty = true;
  else throw new Error('Unknown option. Use --help for supported arguments.');
}

function origin(value, name) {
  assert(value, `${name} is required. Use --help.`);
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  assert(url.protocol === 'https:' || (local && url.protocol === 'http:'), `${name} must use HTTPS (HTTP is allowed only for localhost).`);
  assert(!url.username && !url.password && !url.search && !url.hash && url.pathname === '/', `${name} must be an origin without credentials, query, fragment or path.`);
  return url.origin;
}

const frontend = origin(frontendArg, '--frontend');
const api = apiArg ? origin(apiArg, '--api') : null;
const freshnessHours = Number(process.env.OFFER_MAX_AGE_HOURS || 24);
assert(Number.isFinite(freshnessHours) && freshnessHours >= 1 && freshnessHours <= 168, 'OFFER_MAX_AGE_HOURS must be between 1 and 168.');
const checks = [];
const observations = {};

async function check(name, action) {
  try { await action(); checks.push({ name, status: 'passed' }); }
  catch (error) {
    // No response bodies, credentials, customer data or fetched URLs enter the report.
    const message = error instanceof assert.AssertionError ? error.message.split('\n')[0] : error?.name === 'TimeoutError' ? 'Request timed out' : 'Request or response validation failed';
    checks.push({ name, status: 'failed', reason: message });
  }
}

async function request(base, path, options = {}) {
  const headers = new Headers(options.headers);
  const bypass = base === frontend ? process.env.VERCEL_AUTOMATION_BYPASS_SECRET : process.env.VERCEL_API_AUTOMATION_BYPASS_SECRET;
  if (bypass) headers.set('x-vercel-protection-bypass', bypass);
  const response = await fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(30_000), redirect: 'manual', cache: 'no-store' });
  // Never forward an authentication header to a redirect destination.
  assert(response.status < 300 || response.status >= 400, `Unexpected HTTP redirect for ${path}; verify the exact deployment origin.`);
  return response;
}

async function json(base, path, expectedStatus = 200, headers) {
  const response = await request(base, path, { headers });
  assert.equal(response.status, expectedStatus, `${path} must return HTTP ${expectedStatus}; received ${response.status}.`);
  assert((response.headers.get('content-type') || '').includes('application/json'), `${path} must return JSON, not a hosting login or error page.`);
  return { response, body: await response.json() };
}

function validateProduct(product) {
  assert(product && typeof product === 'object', 'Catalog entries must be objects.');
  assert.equal(product.status, 'active', 'Unpublished inventory must not be public.');
  assert.notEqual(product.sourceType, 'demo', 'Demo products must not be public.');
  assert(Number.isFinite(product.ourPrice) && product.ourPrice > 0, 'Public prices must be positive numbers.');
  assert(Array.isArray(product.images) && product.images.length > 0, 'Public products require imagery.');
  assert(product.images.every(value => typeof value === 'string' && /^https:\/\//i.test(value) && !/^https?:\/\/picsum\.photos(?:\/|$)/i.test(value)), 'Product imagery must use HTTPS and exclude demo assets.');
  if (product.purchaseMode === 'external') {
    assert.equal(product.currency, 'USD', 'External offers must declare USD.');
    assert.equal(product.inStock, true, 'Unavailable external offers must not be public.');
    assert.equal(product.isOnSale, true, 'Full-price external offers must not be public.');
    assert(product.originalPrice > product.ourPrice, 'External offers require a verified discount.');
    const observed = Date.parse(product.lastVerifiedAt);
    assert(Number.isFinite(observed) && observed >= Date.now() - freshnessHours * 3_600_000 && observed <= Date.now() + 60_000, 'External offer verification must be current.');
    const retailer = new URL(product.retailerUrl);
    assert(retailer.protocol === 'https:' && !retailer.username && !retailer.password, 'Retailer destinations must be HTTPS without credentials.');
  }
}

let catalog;
await Promise.all([
  ...['/', '/shop', '/about', '/cart', '/checkout', '/admin', '/collections/bags'].map(path => check(`frontend page ${path}`, async () => {
    const response = await request(frontend, path);
    assert.equal(response.status, 200, `${path} must return HTTP 200; received ${response.status}.`);
    assert((response.headers.get('content-type') || '').includes('text/html'), `${path} must return HTML.`);
    const html = await response.text();
    assert(html.includes('DIRTY APPLE'), `${path} must contain the storefront title.`);
    if (path === '/') {
      for (const asset of ['/hero-bg.jpg', '/dirty-apple-logo.png', '/cat-bags.jpg', '/cat-shoes.jpg', '/editorial-collage.jpg']) {
        assert(html.includes(asset), `Homepage must retain original asset ${asset}.`);
      }
    }
  })),
  ...['/dirty-apple-logo.png', '/hero-bg.jpg', '/cat-bags.jpg', '/cat-shoes.jpg', '/cat-clothing.jpg', '/cat-accessories.jpg', '/editorial-collage.jpg', '/editorial-mens.jpg'].map(path => check(`original asset ${path}`, async () => {
    const response = await request(frontend, path);
    assert.equal(response.status, 200, `${path} must return HTTP 200; received ${response.status}.`);
    assert((response.headers.get('content-type') || '').startsWith('image/'), `${path} must return an image.`);
    await response.body?.cancel();
  })),
  ...[frontend, ...(api ? [api] : [])].map(base => check(`${base === frontend ? 'proxy' : 'backend'} database readiness`, async () => {
    const { response, body } = await json(base, '/api/health');
    assert.equal(body.status, 'ok', 'Health must report status ok.');
    assert.equal(body.database, 'connected', 'Health must report a connected database.');
    assert((response.headers.get('cache-control') || '').includes('no-store'), 'Health responses must not be cached.');
  })),
]);

await check('public inventory and publication rules', async () => {
  const { body } = await json(frontend, '/api/products?limit=100&sort=price-low');
  assert(Array.isArray(body.products) && Number.isSafeInteger(body.total), 'Catalog must contain products and an integer total.');
  assert(body.total >= body.products.length, 'Catalog totals must agree with the returned page.');
  if (!allowEmpty) assert(body.total > 0 && body.products.length > 0, 'A production release requires current published inventory; the catalog is empty.');
  body.products.forEach(validateProduct);
  catalog = body;
  observations.catalogTotal = body.total;
  observations.productsValidated = body.products.length;
  observations.externalOffersValidated = body.products.filter(product => product.purchaseMode === 'external').length;
});

if (api) await check('frontend proxy and backend catalog agree', async () => {
  assert(catalog, 'The proxied catalog must pass validation first.');
  const { body } = await json(api, '/api/products?limit=100&sort=price-low');
  assert.equal(body.total, catalog.total, 'Frontend and backend catalog totals must agree.');
  const values = products => products.map(product => [String(product._id), product.ourPrice]);
  assert.deepEqual(values(body.products), values(catalog.products), 'Frontend and backend must return the same ordered product IDs and prices.');
});

await Promise.all([
  ...['/api/inventory/products?limit=1', '/api/scrape/jobs', '/api/orders'].map(path => check(`anonymous administration rejected: ${path}`, async () => { await json(frontend, path, 401); })),
  check('missing cart session rejected', async () => { await json(frontend, '/api/cart', 400); }),
  check('new visitor carts are empty and private', async () => {
    const bodies = await Promise.all([randomUUID(), randomUUID()].map(async session => {
      const { response, body } = await json(frontend, '/api/cart', 200, { 'x-session-id': session });
      assert((response.headers.get('cache-control') || '').includes('no-store'), 'Cart responses must not be cached.');
      assert.deepEqual(body, { items: [], subtotal: 0, count: 0 }, 'A new visitor must not inherit another visitor cart.');
      return body;
    }));
    assert.equal(bodies.length, 2, 'Both private sessions must be checked.');
  }),
  check('invalid catalog query rejected', async () => { await json(frontend, '/api/products?limit=0', 400); }),
  check('unconfigured route is a genuine 404', async () => { await json(frontend, '/api/release-verification-does-not-exist', 404); }),
]);

if (catalog?.products.length) await check('published product detail reaches frontend and backend', async () => {
  const product = catalog.products[0];
  const { body } = await json(frontend, `/api/products/${encodeURIComponent(product._id)}`);
  validateProduct(body);
  assert.equal(String(body._id), String(product._id), 'Product detail must match its catalog entry.');
  const response = await request(frontend, `/product/${encodeURIComponent(product.slug || product._id)}`);
  assert.equal(response.status, 200, 'The published product page must return HTTP 200.');
});

if (process.env.LIVE_ADMIN_TOKEN) await check('authenticated inventory reads', async () => {
  const headers = { authorization: `Bearer ${process.env.LIVE_ADMIN_TOKEN}` };
  const { body } = await json(frontend, '/api/inventory/products?limit=1', 200, headers);
  assert(Array.isArray(body.products) && Number.isSafeInteger(body.total), 'Administrator inventory must have a valid paginated response.');
  const { body: sources } = await json(frontend, '/api/inventory/retailers', 200, headers);
  assert(Array.isArray(sources.retailers) && sources.retailers.length >= 4, 'Configured retailer sources must be available to administrators.');
  observations.inventoryTotal = body.total;
  observations.configuredRetailers = sources.retailers.length;
});

const failed = checks.filter(check => check.status === 'failed').length;
console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  frontend,
  api,
  mode: allowEmpty ? 'infrastructure-only' : 'published-inventory',
  operations: 'GET only; no data writes or payment actions',
  summary: { passed: checks.length - failed, failed, total: checks.length },
  observations,
  checks,
  remainingManualGates: ['Rendered desktop/mobile browser interactions', 'Approved source refresh and reviewed publication', 'DNS/TLS on the final domain', 'Runtime logs and monitoring'],
}, null, 2));
process.exitCode = failed ? 1 : 0;
