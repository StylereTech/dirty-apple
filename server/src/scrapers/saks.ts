import { BaseScraper } from './base';
import { IProduct } from '../models/Product';

export class SaksScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.saksfifthavenue.com';

  async scrapeProducts(category: string, page: number = 1): Promise<IProduct[]> {
    // Stub implementation - returns mock data
    console.log(`[SaksScraper] Scraping ${category} page ${page}`);
    return [];
  }

  async scrapeProduct(url: string): Promise<IProduct> {
    // Stub implementation
    console.log(`[SaksScraper] Scraping product: ${url}`);
    throw new Error('Not implemented - scraper stub');
  }

  async checkStock(productId: string): Promise<boolean> {
    // Stub implementation
    console.log(`[SaksScraper] Checking stock for: ${productId}`);
    return true;
  }

  async getPrice(productId: string): Promise<number> {
    // Stub implementation
    console.log(`[SaksScraper] Getting price for: ${productId}`);
    return 0;
  }
}
