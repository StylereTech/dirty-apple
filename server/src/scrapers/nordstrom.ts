import { BaseScraper } from './base';
import { IProduct } from '../models/Product';

export class NordstromScraper extends BaseScraper {
  private readonly baseUrl = 'https://shop.nordstrom.com';

  async scrapeProducts(category: string, page: number = 1): Promise<IProduct[]> {
    // Stub implementation - returns mock data
    console.log(`[NordstromScraper] Scraping ${category} page ${page}`);
    return [];
  }

  async scrapeProduct(url: string): Promise<IProduct> {
    // Stub implementation
    console.log(`[NordstromScraper] Scraping product: ${url}`);
    throw new Error('Not implemented - scraper stub');
  }

  async checkStock(productId: string): Promise<boolean> {
    // Stub implementation
    console.log(`[NordstromScraper] Checking stock for: ${productId}`);
    return true;
  }

  async getPrice(productId: string): Promise<number> {
    // Stub implementation
    console.log(`[NordstromScraper] Getting price for: ${productId}`);
    return 0;
  }
}
