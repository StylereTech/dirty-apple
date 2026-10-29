import { createHash } from 'node:crypto';

type JsonObject = Record<string, unknown>;

export interface StructuredSaleOffer {
  externalProductId: string;
  name: string;
  brand: string;
  category: string;
  originalPrice: number;
  salePrice: number;
  currency: string;
  retailerUrl: string;
  images: string[];
  inStock: boolean;
  sizes?: { size: string; available: boolean }[];
  colors?: string[];
  observedAt: string;
}

export interface JsonLdResult {
  records: StructuredSaleOffer[];
  productUrls: string[];
  warnings: string[];
}

function object(value: unknown): JsonObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function schemaName(value: unknown): string | undefined {
  const name = text(value);
  return name?.replace(/^https?:\/\/schema\.org\//i, '');
}

function hasType(value: JsonObject, name: string): boolean {
  return list(value['@type']).some(type => schemaName(type) === name);
}

function amount(value: unknown): number | undefined {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(?:\.\d{1,4})?$/.test(value))) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

export function decodeHtmlAttribute(value: string): string {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
    const named: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const numeric = entity.toLowerCase().startsWith('&#x')
      ? Number.parseInt(entity.slice(3, -1), 16) : Number.parseInt(entity.slice(2, -1), 10);
    return numeric > 0 && numeric <= 0x10ffff && !(numeric >= 0xd800 && numeric <= 0xdfff)
      ? String.fromCodePoint(numeric) : '';
  });
}

export function htmlAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = Object.create(null);
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of source.matchAll(pattern)) {
    attributes[match[1].toLowerCase()] = decodeHtmlAttribute(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function httpsUrl(value: unknown, base: string): string | undefined {
  if (!text(value)) return undefined;
  try {
    const url = new URL(value as string, base);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return undefined;
    url.hash = '';
    return url.toString();
  } catch { return undefined; }
}

function inDateWindow(value: JsonObject, now: number): boolean {
  for (const [field, end] of [['validFrom', false], ['validThrough', true], ['priceValidUntil', true]] as const) {
    if (value[field] == null) continue;
    const raw = text(value[field]);
    if (!raw) return false;
    const date = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? `${raw}T${end ? '23:59:59.999' : '00:00:00.000'}Z` : raw);
    if (!Number.isFinite(date) || (end ? date < now : date > now)) return false;
  }
  return true;
}

/** Read only explicit Product/Offer facts. A sale-category URL is never proof of a markdown. */
export function extractJsonLdOffers(
  html: string,
  pageUrl: string,
  options: { category?: string; observedAt?: string } = {},
): JsonLdResult {
  const records: StructuredSaleOffer[] = [];
  const productUrls = new Set<string>();
  const warningCounts = new Map<string, number>();
  const warn = (message: string) => warningCounts.set(message, (warningCounts.get(message) ?? 0) + 1);
  const observedAt = options.observedAt ?? new Date().toISOString();
  const now = Date.parse(observedAt);
  if (!Number.isFinite(now)) throw new Error('observedAt must be a valid timestamp');
  const nodes: JsonObject[] = [];
  let visited = 0;
  function walk(value: unknown, depth = 0): void {
    if (++visited > 20000 || depth > 32) return;
    if (Array.isArray(value)) { for (const child of value) walk(child, depth + 1); return; }
    const node = object(value);
    if (!node) return;
    nodes.push(node);
    for (const child of Object.values(node)) walk(child, depth + 1);
  }
  let scripts = 0;
  for (const match of html.matchAll(/<script\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (htmlAttributes(match[1]).type?.toLowerCase() !== 'application/ld+json') continue;
    if (++scripts > 64 || match[2].length > 1_000_000) { warn('Structured data exceeded the parsing limit'); continue; }
    try { walk(JSON.parse(match[2].replace(/^\uFEFF/, ''))); }
    catch { warn('Malformed JSON-LD was ignored'); }
  }
  if (visited > 20000) warn('Structured data exceeded the node limit');
  const byId = new Map<string, JsonObject>();
  for (const node of nodes) {
    if (text(node['@id']) && Object.keys(node).length > 1) byId.set(node['@id'] as string, node);
  }
  const resolve = (value: unknown): JsonObject | undefined => {
    const node = object(value);
    return node && text(node['@id']) && Object.keys(node).length === 1
      ? byId.get(node['@id'] as string) : node;
  };
  const addUrl = (value: unknown) => {
    const url = httpsUrl(value, pageUrl);
    if (url) productUrls.add(url);
  };
  for (const node of nodes) {
    if (hasType(node, 'ItemList')) {
      for (const raw of list(node.itemListElement)) {
        const item = resolve(raw);
        const target = item && (resolve(item.item) ?? item);
        addUrl(typeof raw === 'string' ? raw : typeof item?.item === 'string' ? item.item : target?.url ?? target?.['@id']);
      }
    }
    if (!hasType(node, 'Product')) continue;
    addUrl(node.url);
    const rawOffers = list(node.offers);
    const offers = rawOffers.map(resolve).filter((offer): offer is JsonObject => !!offer);
    for (const offer of offers) addUrl(offer.url);
    if (rawOffers.length !== 1 || offers.length !== 1 || !hasType(offers[0], 'Offer')) {
      warn('Product omitted: missing, aggregate, or multiple variant offers'); continue;
    }
    const offer = offers[0];
    const rawSpecs = list(offer.priceSpecification);
    const specs = rawSpecs.map(resolve).filter((spec): spec is JsonObject => !!spec);
    if (specs.length !== rawSpecs.length || specs.some(spec => !hasType(spec, 'UnitPriceSpecification') && !hasType(spec, 'PriceSpecification'))) {
      warn('Product omitted: unsupported price specification'); continue;
    }
    const allPrices = [offer, ...specs];
    if (allPrices.some(price => ['lowPrice', 'highPrice', 'minPrice', 'maxPrice'].some(key => price[key] != null))) {
      warn('Product omitted: price range cannot identify a comparable variant'); continue;
    }
    if (allPrices.some(price => ['validForMemberTier', 'eligibleQuantity', 'eligibleTransactionVolume', 'eligibleCustomerType'].some(key => price[key] != null))) {
      warn('Product omitted: member or conditional price'); continue;
    }
    if (!allPrices.every(price => inDateWindow(price, now))) {
      warn('Product omitted: expired, future, or invalid offer dates'); continue;
    }
    const originals = specs.filter(spec => ['StrikethroughPrice', 'ListPrice', 'RegularPrice'].includes(schemaName(spec.priceType) ?? ''));
    const activeSpecs = specs.filter(spec => spec.priceType == null && spec.validForMemberTier == null);
    if (originals.length !== 1 || (offer.price == null && activeSpecs.length !== 1)) {
      warn('Product omitted: explicit comparable regular and sale prices are required'); continue;
    }
    const current = offer.price == null ? activeSpecs[0] : offer;
    const original = originals[0];
    const originalPrice = amount(original.price);
    const salePrice = amount(current.price);
    const currency = text(current.priceCurrency ?? offer.priceCurrency);
    const originalCurrency = text(original.priceCurrency ?? offer.priceCurrency);
    if (!originalPrice || !salePrice || salePrice >= originalPrice || !currency || !/^[A-Z]{3}$/.test(currency) || currency !== originalCurrency) {
      warn('Product omitted: invalid prices, currencies, or no verified discount'); continue;
    }
    // Conflicting active specifications are not safe to flatten into one advertised price.
    if (activeSpecs.some(spec => amount(spec.price) !== salePrice || (spec.priceCurrency ?? offer.priceCurrency) !== currency)) {
      warn('Product omitted: conflicting active prices'); continue;
    }
    const availability = schemaName(offer.availability);
    if (!['InStock', 'OutOfStock', 'SoldOut', 'Discontinued'].includes(availability ?? '')) {
      warn('Product omitted: explicit current stock availability is required'); continue;
    }
    const retailerUrl = httpsUrl(offer.url ?? node.url, pageUrl);
    const name = text(node.name);
    if (!name || !retailerUrl) { warn('Product omitted: name or explicit product URL is missing'); continue; }
    const sourceId = node.sku ?? node.productID;
    const externalProductId = (typeof sourceId === 'number' && Number.isFinite(sourceId) ? String(sourceId) : text(sourceId))
      ?? `url:${createHash('sha256').update(retailerUrl).digest('hex')}`;
    const images = list(node.image).map(value => {
      const img = object(value);
      return httpsUrl(img ? img.contentUrl ?? img.url : value, pageUrl);
    }).filter((value): value is string => !!value).slice(0, 10);
    const size = text(node.size) ?? text(object(node.size)?.name);
    const color = text(node.color);
    const inStock = availability === 'InStock';
    records.push({
      externalProductId, name, brand: text(object(node.brand)?.name) ?? text(node.brand) ?? '',
      category: text(node.category) ?? options.category ?? '', originalPrice, salePrice, currency,
      retailerUrl, images: [...new Set(images)], inStock, observedAt,
      ...(size ? { sizes: [{ size, available: inStock }] } : {}), ...(color ? { colors: [color] } : {}),
    });
  }
  if (!nodes.some(node => hasType(node, 'Product'))) warn('No Product structured data found on page');
  return {
    records,
    productUrls: [...productUrls].slice(0, 500),
    warnings: [...warningCounts].map(([message, count]) => `${message}${count > 1 ? ` (${count})` : ''}`),
  };
}
