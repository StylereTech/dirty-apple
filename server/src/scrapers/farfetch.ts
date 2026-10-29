import { BaseScraper } from './base';

export class FarfetchScraper extends BaseScraper {
  protected readonly retailer = 'farfetch' as const;
}
