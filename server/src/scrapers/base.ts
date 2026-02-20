import { IProduct } from '../models/Product';

export abstract class BaseScraper {
  abstract scrapeProducts(category: string, page: number): Promise<IProduct[]>;
  abstract scrapeProduct(url: string): Promise<IProduct>;
  abstract checkStock(productId: string): Promise<boolean>;
  abstract getPrice(productId: string): Promise<number>;

  protected async fetchPage(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    return response.text();
  }
}
