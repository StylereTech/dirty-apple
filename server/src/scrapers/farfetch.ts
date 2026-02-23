import { BaseScraper } from './base';
import { IProduct } from '../models/Product';

export class FarfetchScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.farfetch.com';

  async scrapeProducts(category: string, page: number = 1): Promise<IProduct[]> {
    console.log(`[FarfetchScraper] Scraping ${category} page ${page}`);
    // Stub: In production, use Playwright with proxy rotation
    // Farfetch has strong anti-bot protection — prefer affiliate API (Awin)
    return [];
  }

  async scrapeProduct(url: string): Promise<IProduct> {
    console.log(`[FarfetchScraper] Scraping product: ${url}`);
    throw new Error('Not implemented - use Awin affiliate feed');
  }

  async checkStock(productId: string): Promise<boolean> {
    console.log(`[FarfetchScraper] Checking stock for: ${productId}`);
    return true;
  }

  async getPrice(productId: string): Promise<number> {
    console.log(`[FarfetchScraper] Getting price for: ${productId}`);
    return 0;
  }
}
