import { collectRetailerOffers } from '../inventory/crawler';
import { normalizeOffer, NormalizedOffer } from '../inventory/normalize';
import { RetailerId, retailerProductUrl } from '../inventory/retailers';

/** Compatibility adapter: never returns fabricated stock, zero prices, or an empty success. */
export abstract class BaseScraper {
  protected abstract readonly retailer: RetailerId;

  async scrapeProducts(category = '', page = 1): Promise<NormalizedOffer[]> {
    if (page !== 1) throw new Error('Use the bounded collector page limit, not guessed page URLs');
    const result = await collectRetailerOffers(this.retailer, { category, maxPages: 5 });
    return result.records.map(record => normalizeOffer(record, this.retailer, 'scrape'));
  }

  async scrapeProduct(url: string): Promise<NormalizedOffer> {
    const canonical = retailerProductUrl(url, this.retailer);
    const result = await collectRetailerOffers(this.retailer, { url: canonical, maxPages: 1 });
    const products = result.records.map(record => normalizeOffer(record, this.retailer, 'scrape'));
    const product = products.find(value => value.retailerUrl === canonical);
    if (!product) throw new Error('The requested product has no verifiable sale offer');
    return product;
  }

  async checkStock(productUrl: string): Promise<boolean> { return (await this.scrapeProduct(productUrl)).inStock; }
  async getPrice(productUrl: string): Promise<number> { return (await this.scrapeProduct(productUrl)).ourPrice; }
}
