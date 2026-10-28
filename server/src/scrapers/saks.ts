import { BaseScraper } from './base';

export class SaksScraper extends BaseScraper {
  protected readonly retailer = 'saks' as const;
}
