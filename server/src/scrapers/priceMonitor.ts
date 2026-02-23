import { Product } from '../models/Product';
import { PriceHistory } from '../models/PriceHistory';
import { SaksScraper } from './saks';
import { NordstromScraper } from './nordstrom';
import { NeimanScraper } from './neiman';
import { FarfetchScraper } from './farfetch';
import { BaseScraper } from './base';

const scraperMap: Record<string, BaseScraper> = {
  'Saks': new SaksScraper(),
  'Nordstrom': new NordstromScraper(),
  'Neiman Marcus': new NeimanScraper(),
  'Farfetch': new FarfetchScraper(),
};

/**
 * Price monitoring job stub.
 * In production, schedule this via BullMQ every 6 hours.
 * 
 * Flow:
 * 1. Iterate all active products
 * 2. Check current price at source retailer
 * 3. Compare against last recorded price
 * 4. If price dropped >15%, flag as flash deal
 * 5. If price dropped >50%, flag as clearance
 * 6. Record new price in PriceHistory
 * 7. Update product pricing with markup rules
 */
export async function runPriceMonitor(): Promise<void> {
  console.log('[PriceMonitor] Starting price check run...');

  try {
    const products = await Product.find({ status: 'active' });
    console.log(`[PriceMonitor] Checking ${products.length} products`);

    let updated = 0;
    let flashDeals = 0;

    for (const product of products) {
      try {
        const scraper = scraperMap[product.retailerSource];
        if (!scraper) {
          console.warn(`[PriceMonitor] No scraper for: ${product.retailerSource}`);
          continue;
        }

        // Stub: In production, this would actually scrape the price
        const currentPrice = await scraper.getPrice(product.sku);
        if (currentPrice <= 0) continue; // Scraper not implemented yet

        // Get last recorded price
        const lastRecord = await PriceHistory.findOne({ product: product._id })
          .sort({ recordedAt: -1 });

        const previousPrice = lastRecord?.sourcePrice || product.originalPrice;
        const priceChange = previousPrice > 0 
          ? ((currentPrice - previousPrice) / previousPrice) * 100 
          : 0;

        const isFlashDeal = priceChange <= -15;
        const isClearance = priceChange <= -50;

        // Record price history
        await PriceHistory.create({
          product: product._id,
          sourcePrice: currentPrice,
          ourPrice: applyMarkup(currentPrice, product.brand, isFlashDeal),
          retailer: product.retailerSource,
          priceChange,
          isFlashDeal,
        });

        // Update product if price changed
        if (currentPrice !== previousPrice) {
          product.originalPrice = currentPrice;
          product.ourPrice = applyMarkup(currentPrice, product.brand, isFlashDeal);
          product.discount = Math.round(((product.originalPrice - product.ourPrice) / product.originalPrice) * 100);
          product.isOnSale = isFlashDeal;
          product.isClearance = isClearance;
          product.lastScraped = new Date();
          await product.save();
          updated++;
          if (isFlashDeal) flashDeals++;
        }
      } catch (err) {
        console.error(`[PriceMonitor] Error checking ${product.sku}:`, err);
      }
    }

    console.log(`[PriceMonitor] Complete. Updated: ${updated}, Flash deals: ${flashDeals}`);
  } catch (error) {
    console.error('[PriceMonitor] Fatal error:', error);
  }
}

/**
 * Apply markup rules per ARCHITECTURE.md pricing engine:
 * - Base: 25% on sale, 15% full price
 * - Brand premium: +10% on top brands
 * - Clearance: 35-40%
 * - Floor: never below source + 5%
 * - Ceiling: never above 90% of original
 */
function applyMarkup(sourcePrice: number, brand: string, isOnSale: boolean): number {
  const premiumBrands = ['Gucci', 'Prada', 'Louis Vuitton', 'Chanel', 'Hermès', 'Dior'];
  
  let markupPct = isOnSale ? 0.25 : 0.15;
  if (premiumBrands.includes(brand)) markupPct += 0.10;

  let price = sourcePrice * (1 + markupPct);
  
  // Floor: at least source + 5%
  const floor = sourcePrice * 1.05;
  if (price < floor) price = floor;

  return Math.round(price);
}
