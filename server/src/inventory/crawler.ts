import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { Agent, fetch as nodeFetch, RequestInit, Response } from 'undici';
import robotsParser from 'robots-parser';
import { RetailerId, RETAILERS } from './retailers';
import { extractJsonLdOffers, htmlAttributes } from './jsonld';

export const CRAWLER_USER_AGENT = 'DirtyAppleBot/1.0';
const MAX_PAGES = 10;
const MAX_BODY_BYTES = 2_000_000;
const MAX_ROBOTS_BYTES = 256_000;
const MAX_CRAWL_DELAY_MS = 30_000;

export interface CollectorOptions {
  url?: string;
  maxPages?: number;
  category?: string;
  signal?: AbortSignal;
}

export interface CollectorResult {
  records: unknown[];
  pagesVisited: number;
  warnings: string[];
  truncated: boolean;
}

type Address = { address: string; family: number };
type RequestOptions = RequestInit & { dispatcher?: Agent };
interface CollectorDependencies {
  lookup: (hostname: string) => Promise<Address[]>;
  fetch: (url: string, init: RequestOptions) => Promise<Response>;
  sleep: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  now: () => number;
}

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 ||
        (b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (isIP(address) === 6) {
    const parts = address.toLowerCase().split(':');
    const first = Number.parseInt(parts[0], 16);
    const second = Number.parseInt(parts[1] || '0', 16);
    // Only global unicast; reject local/mapped, transition and documentation ranges.
    return first >= 0x2000 && first <= 0x3fff && first !== 0x2002 &&
      !(first === 0x2001 && (second <= 0x1ff || second === 0xdb8)) &&
      !(first === 0x3fff && second <= 0xfff);
  }
  return false;
}

function retailerUrl(value: string, retailer: RetailerId, base?: string): URL {
  const url = new URL(value, base);
  if (value.length > 2048 || url.protocol !== 'https:' || url.username || url.password || url.port ||
      !(RETAILERS[retailer].hosts as readonly string[]).includes(url.hostname)) {
    throw new Error('Crawler URLs must use HTTPS on the selected retailer host without credentials or custom ports');
  }
  url.hash = '';
  return url;
}

function isProductPath(url: URL, retailer: RetailerId): boolean {
  switch (retailer) {
    case 'saks': return url.pathname.startsWith('/product/');
    case 'nordstrom': return /^\/s\/[^/]+\/\d+\/?$/.test(url.pathname);
    case 'bloomingdales': return url.pathname.startsWith('/shop/product/') && !!url.searchParams.get('ID') ||
      url.pathname.startsWith('/shop/product/') && !!url.searchParams.get('id');
    case 'mrporter': return /^\/en-us\/mens\/product\//.test(url.pathname);
    case 'neiman': return /^\/p\/[^/]+/.test(url.pathname);
    case 'farfetch': return /-item-\d+\.aspx$/.test(url.pathname);
  }
}

function challengePage(body: string): boolean {
  return /<title[^>]*>\s*(?:Access Denied|Just a moment|Pardon Our Interruption|Robot Challenge|Security Check)/i.test(body) ||
    /(?:please verify (?:that )?you(?: are|'re) (?:a )?human|enable javascript and cookies to continue|checking your browser before accessing|press (?:and|&) hold to confirm)/i.test(body);
}

function abortable<T>(pending: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    pending.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

/** Injection is for deterministic tests; the exported collector uses pinned DNS and native fetch. */
export function createRetailerCollector(overrides: Partial<CollectorDependencies> = {}) {
  const dependencies: CollectorDependencies = {
    lookup: hostname => lookup(hostname, { all: true, verbatim: true }),
    fetch: (url, init) => nodeFetch(url, init),
    sleep: async (milliseconds, signal) => { await sleep(milliseconds, undefined, { signal }); },
    now: Date.now,
    ...overrides,
  };
  return async function collect(retailer: RetailerId, options: CollectorOptions = {}): Promise<CollectorResult> {
    if (!Object.hasOwn(RETAILERS, retailer)) throw new Error('Unknown retailer');
    const maxPages = options.maxPages ?? 3;
    if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > MAX_PAGES) throw new Error('maxPages must be an integer from 1 to 10');
    const seeds = options.url ? [options.url] : [...RETAILERS[retailer].saleUrls];
    if (!seeds.length) throw new Error('This retailer has no configured public sale pages; use an approved product feed');
    const queue = seeds.map(url => retailerUrl(url, retailer).toString());
    const queued = new Set(queue);
    const visited = new Set<string>();
    const records = new Map<string, unknown>();
    const warnings = new Set<string>();
    const rules = new Map<string, ReturnType<typeof robotsParser>>();
    const delays = new Map<string, number>();
    const signal = AbortSignal.any([AbortSignal.timeout(150_000), ...(options.signal ? [options.signal] : [])]);
    let lastRequestAt: number | undefined;
    let pagesVisited = 0;
    let truncated = false;
    const warn = (message: string) => { if (warnings.size < 50) warnings.add(message); };

    async function waitForSlot(url: URL): Promise<void> {
      signal.throwIfAborted();
      if (lastRequestAt != null) {
        const wait = Math.max(1_000, delays.get(url.origin) ?? 0) - (dependencies.now() - lastRequestAt);
        if (wait > 0) await dependencies.sleep(wait, signal);
      }
      lastRequestAt = dependencies.now();
    }

    async function readText(start: URL, kind: 'robots' | 'html'): Promise<{ body: string; url: URL }> {
      let url = start;
      for (let redirects = 0; redirects <= 3; redirects++) {
        signal.throwIfAborted();
        url = retailerUrl(url.toString(), retailer);
        const addresses = await abortable(dependencies.lookup(url.hostname), AbortSignal.any([signal, AbortSignal.timeout(10_000)]));
        if (!addresses.length || addresses.some(result => !isPublicAddress(result.address))) throw new Error('Retailer DNS did not resolve exclusively to public network addresses');
        if (kind === 'html' && url.toString() !== start.toString()) await ensureAllowed(url);
        await waitForSlot(url);
        const address = addresses.find(result => result.family === 4) ?? addresses[0];
        // Pin the validated address, closing the DNS validation/fetch rebinding window.
        const dispatcher = new Agent({ connect: { lookup: (_hostname, _options, callback) => {
          if (typeof _options === 'object' && _options.all) callback(null, [address] as never, address.family);
          else callback(null, address.address, address.family);
        } } });
        const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(15_000)]);
        try {
          const response = await abortable(dependencies.fetch(url.toString(), {
            dispatcher, redirect: 'manual', signal: requestSignal,
            headers: { 'User-Agent': CRAWLER_USER_AGENT, Accept: kind === 'robots' ? 'text/plain' : 'text/html,application/xhtml+xml' },
          }), requestSignal);
          if ([301, 302, 303, 307, 308].includes(response.status)) {
            const location = response.headers.get('location');
            await response.body?.cancel();
            if (!location || redirects === 3) throw new Error('Retailer redirect limit exceeded or redirect location missing');
            url = retailerUrl(location, retailer, url.toString());
            continue;
          }
          if (!response.ok) {
            await response.body?.cancel();
            throw new Error(`${kind === 'robots' ? 'robots.txt' : 'Retailer page'} returned HTTP ${response.status}; collection stopped`);
          }
          const contentType = response.headers.get('content-type') ?? '';
          if (kind === 'html' ? !/^(text\/html|application\/xhtml\+xml)(?:;|$)/i.test(contentType) :
            contentType && !/^(text\/plain|application\/octet-stream)(?:;|$)/i.test(contentType)) {
            await response.body?.cancel();
            throw new Error(`${kind === 'robots' ? 'robots.txt' : 'Retailer page'} returned an unsupported content type`);
          }
          const limit = kind === 'robots' ? MAX_ROBOTS_BYTES : MAX_BODY_BYTES;
          if (Number(response.headers.get('content-length')) > limit) {
            await response.body?.cancel();
            throw new Error('Retailer response exceeded the body limit');
          }
          if (!response.body) throw new Error('Retailer returned an empty response body');
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let bytes = 0;
          let body = '';
          try {
            for (;;) {
              const chunk = await abortable(reader.read(), requestSignal);
              if (chunk.done) break;
              bytes += chunk.value.byteLength;
              if (bytes > limit) { await reader.cancel(); throw new Error('Retailer response exceeded the body limit'); }
              body += decoder.decode(chunk.value, { stream: true });
            }
            body += decoder.decode();
          } finally { reader.releaseLock(); }
          if (!body.trim() || challengePage(body)) throw new Error('Retailer returned an empty page or access challenge; collection stopped');
          return { body, url };
        } finally { await dispatcher.destroy(); }
      }
      throw new Error('Retailer redirect limit exceeded');
    }

    async function ensureAllowed(url: URL): Promise<void> {
      if (!rules.has(url.origin)) {
        const robotsUrl = new URL('/robots.txt', url);
        const response = await readText(robotsUrl, 'robots');
        if (!/^\s*user-agent\s*:/im.test(response.body)) throw new Error('robots.txt did not contain readable user-agent rules; collection stopped');
        const parsed = robotsParser(robotsUrl.toString(), response.body);
        const delay = parsed.getCrawlDelay(CRAWLER_USER_AGENT);
        if (delay != null && (!Number.isFinite(delay) || delay < 0 || delay * 1_000 > MAX_CRAWL_DELAY_MS)) {
          throw new Error('Retailer robots crawl delay exceeds the supported limit; use a product feed');
        }
        rules.set(url.origin, parsed);
        delays.set(url.origin, Math.max(1_000, (delay ?? 0) * 1_000));
      }
      if (rules.get(url.origin)!.isAllowed(url.toString(), CRAWLER_USER_AGENT) !== true) {
        throw new Error('Retailer robots.txt does not allow this URL for DirtyAppleBot');
      }
    }

    function enqueue(raw: string, base: string, productOnly = false): void {
      try {
        const url = retailerUrl(raw, retailer, base);
        if (productOnly && !isProductPath(url, retailer)) return;
        const value = url.toString();
        if (!visited.has(value) && !queued.has(value)) {
          if (queue.length >= 500) { truncated = true; return; }
          queue.push(value); queued.add(value);
        }
      } catch { warn('Ignored a link outside the permitted retailer HTTPS hosts'); }
    }

    while (queue.length && pagesVisited < maxPages) {
      const next = queue.shift()!;
      if (visited.has(next)) continue;
      const url = retailerUrl(next, retailer);
      await ensureAllowed(url);
      const page = await readText(url, 'html');
      pagesVisited++;
      visited.add(next);
      if (visited.has(page.url.toString()) && page.url.toString() !== next) { warn('Skipped a repeated redirect destination'); continue; }
      visited.add(page.url.toString());
      const parsed = extractJsonLdOffers(page.body, page.url.toString(), { category: options.category, observedAt: new Date(dependencies.now()).toISOString() });
      parsed.warnings.forEach(warn);
      for (const record of parsed.records) {
        try {
          if (!isProductPath(retailerUrl(record.retailerUrl, retailer), retailer)) {
            warn('Rejected structured offer without a recognized retailer product URL'); continue;
          }
        }
        catch { warn('Rejected structured product URL outside the selected retailer'); continue; }
        if (records.size >= 500) { truncated = true; break; }
        records.set(`${retailer}:${record.externalProductId}:${record.retailerUrl}`, record);
      }
      // Explicit next links take precedence; all links remain within the page budget.
      const links = [...page.body.matchAll(/<(?:a|link)\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>/gi)].map(match => htmlAttributes(match[1]));
      for (const link of links) if (link.href && link.rel?.toLowerCase().split(/\s+/).includes('next')) enqueue(link.href, page.url.toString());
      for (const link of parsed.productUrls) enqueue(link, page.url.toString());
      for (const link of links) if (link.href) enqueue(link.href, page.url.toString(), true);
    }
    truncated ||= queue.some(url => !visited.has(url));
    if (truncated) warn('Collection reached its bounded page or item limit; this is a partial catalog');
    if (!records.size) {
      throw new Error(`No verifiable discounted offers found after ${pagesVisited} page(s). ${[...warnings].slice(0, 5).join('; ')} Use an approved retailer product feed when comparable structured prices are unavailable.`);
    }
    return { records: [...records.values()], pagesVisited, warnings: [...warnings], truncated };
  };
}

export const collectRetailerOffers = createRetailerCollector();
