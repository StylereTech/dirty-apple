import { createHash } from 'node:crypto';
import { RETAILERS, RetailerId, retailerProductUrl } from './retailers';

export const CATEGORIES = ['bags', 'shoes', 'clothing', 'accessories', 'kids', 'other'] as const;
export const GENDERS = ['women', 'men', 'unisex', 'kids'] as const;

export function normalizeCategory(value: unknown): string {
  if (typeof value !== 'string') return 'other';
  const category = value.toLowerCase().trim();
  if (/\b(kids?|children|baby|girls?|boys?)\b/.test(category)) return 'kids';
  if (/\b(bags?|handbags?|totes?|backpacks?|clutches|crossbody)\b/.test(category)) return 'bags';
  if (/\b(shoes?|footwear|boots?|sneakers?|sandals?|loafers?|pumps?|heels?)\b/.test(category)) return 'shoes';
  if (/\b(accessories|jewel(?:ry|lery)|watches|belts?|scarves|hats?|sunglasses|wallets?|ties)\b/.test(category)) return 'accessories';
  if (/\b(clothing|apparel|dresses|dress|shirts?|trousers|pants|jeans|coats?|jackets?|sweaters?|knitwear|skirts?|tops?|shorts|suits?|swimwear)\b/.test(category)) return 'clothing';
  return 'other';
}

function text(value: unknown, field: string, max = 300): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${field} is required (max ${max} characters)`);
  return value.trim();
}

function price(value: unknown, field: string): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '' ||
      (typeof value === 'string' && !/^\d+(?:\.\d{1,2})?$/.test(value))) throw new Error(`${field} must be a numeric amount without currency symbols`);
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) {
    throw new Error(`${field} must be positive with at most two decimal places`);
  }
  return Math.round(amount * 100) / 100;
}

function publicHttpsUrl(value: unknown): string {
  const raw = text(value, 'image URL', 2048);
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !url.hostname.includes('.') || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/i.test(url.hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname) || /\.(local|internal|test|invalid)$/i.test(url.hostname) ||
      url.hostname === 'picsum.photos') throw new Error('Images must be public HTTPS product images');
  return url.toString();
}

export interface NormalizedOffer {
  name: string; brand: string; category: string; gender?: string; description: string;
  originalPrice: number; ourPrice: number; discount: number; currency: 'USD';
  retailerId: RetailerId; retailerSource: string; externalProductId: string; variantId: string;
  retailerUrl: string; images: string[]; inStock: boolean;
  sizes: { size: string; available: boolean }[]; colors: string[];
  sku: string; slug: string; purchaseMode: 'external'; isOnSale: boolean;
  lastVerifiedAt: Date; lastScraped: Date; sourceType: 'feed' | 'scrape';
  finalSale: boolean; promotion?: string;
}

/** Accept an explicit comparable offer, never a category-page discount or a guessed price. */
export function normalizeOffer(input: unknown, retailer: RetailerId, sourceType: 'feed' | 'scrape' = 'feed', now = new Date()): NormalizedOffer {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Each record must be an object');
  const row = input as Record<string, unknown>;
  const externalProductId = text(row.externalProductId, 'externalProductId', 200);
  const variantId = row.variantId === undefined || row.variantId === '' ? '' : text(row.variantId, 'variantId', 200);
  const name = text(row.name, 'name');
  const brand = text(row.brand, 'brand', 150);
  const originalPrice = price(row.originalPrice, 'originalPrice');
  const ourPrice = price(row.salePrice, 'salePrice');
  if (row.currency !== 'USD') throw new Error('Only explicit USD offers are supported; do not convert currencies implicitly');
  if (typeof row.inStock !== 'boolean') throw new Error('inStock must be true or false, based on observed availability');
  if (typeof row.observedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(row.observedAt)) throw new Error('observedAt must be an ISO timestamp with timezone');
  const observed = new Date(row.observedAt);
  if (!Number.isFinite(observed.getTime()) || observed.getTime() > now.getTime() + 60_000 || observed.getTime() < now.getTime() - 7 * 86_400_000) {
    throw new Error('observedAt must be within the past 7 days and not in the future');
  }
  if (!Array.isArray(row.images) || row.images.length === 0 || row.images.length > 12) throw new Error('Provide 1–12 product image URLs');
  const images = [...new Set(row.images.map(publicHttpsUrl))];
  const sizes = row.sizes === undefined ? [] : row.sizes;
  if (!Array.isArray(sizes) || sizes.length > 100) throw new Error('sizes must be an array with at most 100 variants');
  const normalizedSizes = sizes.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object') throw new Error('Each size must include size and available');
    const variant = entry as Record<string, unknown>;
    if (typeof variant.available !== 'boolean') throw new Error('Each size needs explicit availability');
    return { size: text(variant.size, 'size', 40), available: variant.available };
  });
  if (new Set(normalizedSizes.map(entry => entry.size)).size !== normalizedSizes.length) throw new Error('Duplicate size labels');
  const colors = row.colors ?? [];
  if (!Array.isArray(colors) || colors.length > 50) throw new Error('colors must be an array');
  const gender = row.gender === undefined ? undefined : text(row.gender, 'gender', 20).toLowerCase();
  if (gender && !(GENDERS as readonly string[]).includes(gender)) throw new Error(`gender must be ${GENDERS.join(', ')}`);
  const conditionalFlags = ['conditionalPrice', 'membersOnly', 'memberOnly', 'requiresMembership', 'couponRequired', 'requiresCoupon', 'requiresCode', 'accountRequired', 'firstOrderOnly', 'subscriptionRequired'];
  for (const flag of conditionalFlags) {
    if (row[flag] !== undefined && typeof row[flag] !== 'boolean') throw new Error(`${flag} must be a boolean`);
    if (row[flag] === true) throw new Error('Conditional/member/coupon prices cannot be listed as the public sale price');
  }
  const conditions = ['validForMemberTier', 'eligibleCustomerType', 'eligibleQuantity', 'eligibleTransactionVolume', 'couponCode', 'promoCode', 'discountCode', 'minimumPurchase', 'minimumQuantity'];
  if (conditions.some(field => row[field] !== undefined && row[field] !== null && row[field] !== '')) {
    throw new Error('Conditional/member/coupon prices cannot be listed as the public sale price');
  }
  if (row.finalSale !== undefined && typeof row.finalSale !== 'boolean') throw new Error('finalSale must be a boolean');
  const identity = createHash('sha256').update(JSON.stringify([retailer, externalProductId, variantId])).digest('hex');
  const slugName = `${brand}-${name}`.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 140);
  return {
    name, brand, category: normalizeCategory(row.category), gender,
    description: row.description === undefined || row.description === '' ? '' : text(row.description, 'description', 10_000),
    originalPrice, ourPrice, discount: Math.max(0, Math.floor((1 - ourPrice / originalPrice) * 100 + 1e-9)), currency: 'USD',
    retailerId: retailer, retailerSource: RETAILERS[retailer].name, externalProductId, variantId,
    retailerUrl: retailerProductUrl(row.retailerUrl, retailer), images, inStock: row.inStock,
    sizes: normalizedSizes, colors: colors.map(color => text(color, 'color', 80)),
    sku: `${retailer}-${identity}`, slug: `${slugName}-${identity.slice(0, 16)}`,
    purchaseMode: 'external', isOnSale: ourPrice < originalPrice,
    lastVerifiedAt: observed, lastScraped: now, sourceType,
    finalSale: row.finalSale === true, promotion: row.promotion ? text(row.promotion, 'promotion', 500) : undefined,
  };
}

export function previewOffers(records: unknown[], retailer: RetailerId, sourceType: 'feed' | 'scrape' = 'feed', now = new Date()) {
  if (!Array.isArray(records) || records.length < 1 || records.length > 500) throw new Error('Provide between 1 and 500 records per import');
  const offers: NormalizedOffer[] = [];
  const errors: { row: number; error: string }[] = [];
  const seen = new Set<string>();
  records.forEach((record, index) => {
    try {
      const offer = normalizeOffer(record, retailer, sourceType, now);
      if (seen.has(offer.sku)) throw new Error('Duplicate retailer/product/variant identity within this batch');
      seen.add(offer.sku);
      offers.push(offer);
    } catch (error) { errors.push({ row: index + 1, error: error instanceof Error ? error.message : 'Invalid record' }); }
  });
  return { offers, errors, total: records.length, valid: offers.length, saleOffers: offers.filter(offer => offer.isOnSale && offer.inStock).length };
}
