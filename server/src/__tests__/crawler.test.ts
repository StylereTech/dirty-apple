import test from 'node:test';
import assert from 'node:assert/strict';
import { Response } from 'undici';
import { createRetailerCollector, CRAWLER_USER_AGENT, isPublicAddress } from '../inventory/crawler';

const origin = 'https://www.nordstrom.com';
const sale = `${origin}/browse/sale`;
const productUrl = `${origin}/s/test-jacket/12345`;
function saleProduct(overrides: Record<string, unknown> = {}): string {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Product', sku: 'test-123', name: 'Test jacket',
    brand: 'Test brand', category: 'clothing', url: productUrl, image: ['https://n.nordstrommedia.com/test.jpg'],
    offers: { '@type': 'Offer', price: 50, priceCurrency: 'USD', availability: 'https://schema.org/InStock',
      priceSpecification: { '@type': 'UnitPriceSpecification', priceType: 'https://schema.org/StrikethroughPrice', price: 100, priceCurrency: 'USD' } },
    ...overrides,
  })}</script>`;
}
function harness(pages: Record<string, string | (() => Response)>, dns = [{ address: '93.184.216.34', family: 4 }]) {
  let clock = Date.parse('2026-10-28T00:00:00.000Z');
  const calls: { url: string; at: number }[] = [];
  const delays: number[] = [];
  const collector = createRetailerCollector({
    lookup: async () => dns,
    now: () => clock,
    sleep: async milliseconds => { delays.push(milliseconds); clock += milliseconds; },
    fetch: async (url, init) => {
      assert.equal(init.redirect, 'manual');
      assert.equal((init.headers as Record<string, string>)['User-Agent'], CRAWLER_USER_AGENT);
      assert.ok(init.dispatcher, 'requests pin the validated DNS address');
      calls.push({ url, at: clock });
      const response = pages[url];
      assert.ok(response != null, `Unexpected request: ${url}`);
      return typeof response === 'function' ? response() : new Response(response, { headers: {
        'content-type': url.endsWith('/robots.txt') ? 'text/plain' : 'text/html',
      } });
    },
  });
  return { collector, calls, delays };
}

test('follows only bounded retailer links, deduplicates products, and honors robots crawl delay', async () => {
  const pageTwo = `${sale}?page=2`;
  const h = harness({
    [`${origin}/robots.txt`]: 'User-agent: DirtyAppleBot\nDisallow: /account\nCrawl-delay: 2',
    [sale]: `${saleProduct()}<a rel="next" href="?page=2">Next</a><a href="https://attacker.example/steal">Bad</a>`,
    [pageTwo]: `${saleProduct()}<a rel="next" href="${sale}">Loop</a><a href="${productUrl}">Product</a>`,
  });
  const result = await h.collector('nordstrom', { maxPages: 2 });
  assert.equal(result.pagesVisited, 2);
  assert.equal(result.records.length, 1);
  assert.equal(result.truncated, true);
  assert.deepEqual(h.calls.map(call => call.url), [`${origin}/robots.txt`, sale, pageTwo]);
  assert.ok(h.delays.every(delay => delay >= 2000));
  assert.match(result.warnings.join(' '), /partial catalog/);
});

test('follows product links on canonical retailer paths and ItemList entries', async () => {
  const h = harness({
    [`${origin}/robots.txt`]: 'User-agent: *\nAllow: /',
    [sale]: `<script type="application/ld+json">{"@type":"ItemList","itemListElement":[{"@type":"ListItem","item":{"url":"${productUrl}"}}]}</script>`,
    [productUrl]: saleProduct(),
  });
  const result = await h.collector('nordstrom', { maxPages: 2 });
  assert.equal(result.records.length, 1);
  assert.equal(result.truncated, false);
  assert.ok(h.delays.every(delay => delay >= 1000));
});

test('rejects credential, protocol, external host, and custom-port seed URLs before requests', async () => {
  for (const url of ['http://www.nordstrom.com/browse/sale', 'https://user:pass@www.nordstrom.com/browse/sale',
    'https://www.nordstrom.com:444/browse/sale', 'https://www.nordstrom.com.attacker.test/browse/sale', 'https://127.0.0.1/']) {
    const h = harness({});
    await assert.rejects(h.collector('nordstrom', { url }), /HTTPS/);
    assert.equal(h.calls.length, 0);
  }
});

test('rejects redirects escaping the allowlist and private DNS addresses', async () => {
  const h = harness({
    [`${origin}/robots.txt`]: 'User-agent: *\nAllow: /',
    [sale]: () => new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/internal' } }),
  });
  await assert.rejects(h.collector('nordstrom'), /HTTPS/);
  for (const address of ['127.0.0.1', '10.2.3.4', '169.254.169.254', '::1', '::ffff:127.0.0.1', 'fc00::1']) {
    const privateDns = harness({}, [{ address, family: address.includes(':') ? 6 : 4 }]);
    await assert.rejects(privateDns.collector('nordstrom'), /public network/);
    assert.equal(privateDns.calls.length, 0);
  }
  const mixed = harness({}, [{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.1', family: 4 }]);
  await assert.rejects(mixed.collector('nordstrom'), /public network/);
});

test('fails closed on denied or missing robots and unsupported crawl delays', async () => {
  for (const robots of [
    'User-agent: *\nDisallow: /',
    'User-agent: DirtyAppleBot\nCrawl-delay: 60',
    () => new Response('not found', { status: 404 }),
  ]) {
    const h = harness({ [`${origin}/robots.txt`]: robots });
    await assert.rejects(h.collector('nordstrom'), /robots|crawl delay/);
    assert.equal(h.calls.length, 1);
  }
});

test('fails closed on throttling, access challenges, wrong content types and oversized bodies', async () => {
  for (const response of [
    () => new Response('blocked', { status: 403 }),
    () => new Response('slow down', { status: 429 }),
    () => new Response('<title>Access Denied</title>', { headers: { 'content-type': 'text/html' } }),
    () => new Response('{}', { headers: { 'content-type': 'application/json' } }),
    () => new Response('large', { headers: { 'content-type': 'text/html', 'content-length': '3000000' } }),
  ]) {
    const h = harness({ [`${origin}/robots.txt`]: 'User-agent: *\nAllow: /', [sale]: response });
    await assert.rejects(h.collector('nordstrom'), /HTTP|challenge|content type|body limit/);
  }
});

test('empty or nonverifiable sale pages never report a successful import', async () => {
  const h = harness({ [`${origin}/robots.txt`]: 'User-agent: *\nAllow: /', [sale]: '<h1>Sale</h1><p>Up to 70% off</p>' });
  await assert.rejects(h.collector('nordstrom'), /No verifiable discounted offers/);
});

test('requires finite bounded page limits and checks abort before requesting', async () => {
  for (const maxPages of [0, 11, 1.5, NaN, Infinity]) {
    await assert.rejects(harness({}).collector('nordstrom', { maxPages }), /1 to 10/);
  }
  const controller = new AbortController();
  controller.abort();
  const h = harness({});
  await assert.rejects(h.collector('nordstrom', { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(h.calls.length, 0);
});

test('public address classification excludes nonpublic and transition ranges', () => {
  for (const address of ['93.184.216.34', '8.8.8.8', '2606:4700::1111', '2001:4860:4860::8888']) assert.equal(isPublicAddress(address), true, address);
  for (const address of ['0.0.0.0', '100.64.0.1', '172.16.0.1', '192.168.1.1', '198.18.1.1', '203.0.113.1', '224.0.0.1', '2001:db8::1', '2002:7f00:1::', 'fe80::1', '::ffff:8.8.8.8']) assert.equal(isPublicAddress(address), false, address);
});
