import { Product } from '../models/Product';
import { collectRetailerOffers } from '../inventory/crawler';
import { importOffers } from '../inventory/importer';
import { isRetailerId } from '../inventory/retailers';

/** Explicit, bounded refresh; failures leave timestamps unchanged so stale offers expire. */
export async function runPriceMonitor(limit = 20) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Refresh limit must be 1–100');
  const products = await Product.find({ purchaseMode: 'external', status: 'active' }).sort({ lastVerifiedAt: 1 }).limit(limit).lean();
  const result = { checked: 0, refreshed: 0, errors: [] as string[] };
  for (const product of products) {
    result.checked++;
    if (!isRetailerId(product.retailerId)) { result.errors.push(`${product.sku}: retailer is not configured`); continue; }
    try {
      const collected = await collectRetailerOffers(product.retailerId, { url: product.retailerUrl, maxPages: 1 });
      const imported = await importOffers(collected.records, product.retailerId, 'scrape');
      result.refreshed += imported.updated;
      result.errors.push(...imported.errors.map(error => error.error), ...imported.failures.map(error => error.error));
    } catch (error) { result.errors.push(`${product.sku}: ${error instanceof Error ? error.message : 'Refresh unavailable'}`); }
  }
  return result;
}
