import { BaseScraper } from './base';

export class NeimanScraper extends BaseScraper {
  protected readonly retailer = 'neiman' as const;
}
