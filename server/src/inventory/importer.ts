import { Product } from '../models/Product';
import { PriceHistory } from '../models/PriceHistory';
import { freshnessCutoff } from '../lib/catalog';
import { NormalizedOffer, previewOffers } from './normalize';
import { RetailerId } from './retailers';

/** Refreshing source data must never publish a draft or resurrect a manually delisted item. */
export function nextOfferStatus(offer: NormalizedOffer, existingStatus?: string): 'draft' | 'active' | 'sold_out' | 'delisted' {
  if (existingStatus === 'delisted') return 'delisted';
  if (!offer.inStock) return 'sold_out';
  if (!offer.isOnSale) return 'delisted';
  if (offer.category === 'other' || offer.lastVerifiedAt < freshnessCutoff()) return 'draft';
  return existingStatus === 'active' ? 'active' : 'draft';
}

export interface ImportOptions {
  /** A caller can stop between writes without losing already committed, idempotent offers. */
  signal?: AbortSignal;
}

export class ImportInterruptedError extends Error {
  constructor(public readonly created: number, public readonly updated: number, public readonly skipped: number) {
    super('Import execution was interrupted; committed offers can be retried safely');
    this.name = 'ImportInterruptedError';
  }
}

export async function importOffers(records: unknown[], retailer: RetailerId, sourceType: 'feed' | 'scrape' = 'feed', options: ImportOptions = {}) {
  options.signal?.throwIfAborted();
  const preview = previewOffers(records, retailer, sourceType);
  if (preview.errors.length) {
    return { ...preview, offers: undefined, committed: false, created: 0, updated: 0, skipped: 0, failures: [] };
  }
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const failures: { sku: string; error: string }[] = [];
  const warnings: string[] = [];
  const checkBudget = () => {
    if (options.signal?.aborted) throw new ImportInterruptedError(created, updated, skipped);
  };
  for (const offer of preview.offers) {
    checkBudget();
    try {
      const existing = await Product.findOne({ retailerId: retailer, externalProductId: offer.externalProductId, variantId: offer.variantId }, null, { maxTimeMS: 5_000 });
      checkBudget();
      if ((!existing && (!offer.inStock || !offer.isOnSale)) ||
          (existing?.lastVerifiedAt && existing.lastVerifiedAt > offer.lastVerifiedAt)) { skipped++; continue; }
      const oldPrice = existing?.ourPrice;
      // Feed refreshes update source facts without undoing inventory organization.
      const organizedOffer = {
        ...offer,
        category: existing && existing.category !== 'other' ? existing.category : offer.category,
        gender: existing?.gender ?? offer.gender,
      };
      const result = await Product.findOneAndUpdate(
        existing ? {
          _id: existing._id, sku: existing.sku, status: existing.status,
          ...(existing.updatedAt ? { updatedAt: existing.updatedAt } : {}),
          $or: [{ lastVerifiedAt: { $lte: offer.lastVerifiedAt } }, { lastVerifiedAt: { $exists: false } }],
        } : { retailerId: retailer, externalProductId: offer.externalProductId, variantId: offer.variantId },
        existing ? {
          $set: { ...organizedOffer, slug: existing?.slug || offer.slug, status: nextOfferStatus(organizedOffer, existing?.status) },
          ...(!offer.promotion ? { $unset: { promotion: '' } } : {}),
        } : { $setOnInsert: { ...organizedOffer, status: nextOfferStatus(organizedOffer), featured: false, createdAt: offer.lastScraped, updatedAt: offer.lastScraped } },
        { upsert: !existing, new: true, runValidators: true, includeResultMetadata: true, timestamps: !!existing, maxTimeMS: 5_000 },
      );
      const product = result.value;
      if (!product) { skipped++; continue; }
      if (!existing && !result.lastErrorObject?.upserted) { skipped++; continue; }
      if (result.lastErrorObject?.upserted) created++; else updated++;
      checkBudget();
      if (oldPrice !== offer.ourPrice) {
        try {
          await PriceHistory.create({
            product: product._id, sourcePrice: offer.ourPrice, ourPrice: offer.ourPrice, retailer: offer.retailerSource,
            recordedAt: offer.lastVerifiedAt, priceChange: oldPrice ? ((offer.ourPrice - oldPrice) / oldPrice) * 100 : 0,
            isFlashDeal: !!oldPrice && offer.ourPrice <= oldPrice * 0.85,
          });
        } catch { warnings.push(`Offer ${offer.sku} saved, but its price history could not be recorded`); }
      }
    } catch (error) {
      // A bounded worker must stop issuing writes, rather than counting a timeout as
      // an ordinary row failure and continuing through the rest of a large batch.
      checkBudget();
      const duplicate = (error as { code?: number }).code === 11000;
      failures.push({ sku: offer.sku, error: duplicate ? 'Concurrent or conflicting import; retry this offer' : 'Unable to save offer; check database availability' });
    }
  }
  return { total: preview.total, valid: preview.valid, saleOffers: preview.saleOffers, errors: [], committed: true, created, updated, skipped, failures, warnings };
}
