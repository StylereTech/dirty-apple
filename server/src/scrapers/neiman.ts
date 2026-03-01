import { BaseScraper } from './base';
import { IProduct } from '../models/Product';

export class NeimanScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.neimanmarcus.com';

  async scrapeProducts(category: string, page: number = 1): Promise<IProduct[]> {
    console.log(`[NeimanScraper] Scraping ${category} page ${page}`);
    return [];
  }

  async scrapeProduct(url: string): Promise<IProduct> {
    console.log(`[NeimanScraper] Scraping product: ${url}`);
    throw new Error('Not implemented - scraper stub');
  }

  async checkStock(productId: string): Promise<boolean> {
    console.log(`[NeimanScraper] Checking stock for: ${productId}`);
    return true;
  }

  async getPrice(productId: string): Promise<number> {
    console.log(`[NeimanScraper] Getting price for: ${productId}`);
    return 0;
  }
}
