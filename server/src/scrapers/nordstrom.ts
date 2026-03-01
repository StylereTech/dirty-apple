import { BaseScraper } from './base';
import { IProduct } from '../models/Product';

export class NordstromScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.nordstrom.com';

  async scrapeProducts(category: string, page: number = 1): Promise<IProduct[]> {
    console.log(`[NordstromScraper] Scraping ${category} page ${page}`);
    return [];
  }

  async scrapeProduct(url: string): Promise<IProduct> {
    console.log(`[NordstromScraper] Scraping product: ${url}`);
    throw new Error('Not implemented - scraper stub');
  }

  async checkStock(productId: string): Promise<boolean> {
    console.log(`[NordstromScraper] Checking stock for: ${productId}`);
    return true;
  }

  async getPrice(productId: string): Promise<number> {
    console.log(`[NordstromScraper] Getting price for: ${productId}`);
    return 0;
  }
}
