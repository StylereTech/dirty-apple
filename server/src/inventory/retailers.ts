export const RETAILERS = {
  saks: { id: 'saks', name: 'Saks Fifth Avenue', hosts: ['www.saksfifthavenue.com', 'saksfifthavenue.com'], saleUrls: ['https://www.saksfifthavenue.com/c/men/sale', 'https://www.saksfifthavenue.com/c/women/sale'] },
  nordstrom: { id: 'nordstrom', name: 'Nordstrom', hosts: ['www.nordstrom.com', 'nordstrom.com'], saleUrls: ['https://www.nordstrom.com/browse/sale'] },
  bloomingdales: { id: 'bloomingdales', name: "Bloomingdale's", hosts: ['www.bloomingdales.com', 'bloomingdales.com'], saleUrls: ['https://www.bloomingdales.com/shop/sale?id=3977'] },
  mrporter: { id: 'mrporter', name: 'MR PORTER', hosts: ['www.mrporter.com', 'mrporter.com'], saleUrls: ['https://www.mrporter.com/en-us/mens/sale'] },
  neiman: { id: 'neiman', name: 'Neiman Marcus', hosts: ['www.neimanmarcus.com', 'neimanmarcus.com'], saleUrls: [] },
  farfetch: { id: 'farfetch', name: 'Farfetch', hosts: ['www.farfetch.com', 'farfetch.com'], saleUrls: [] },
} as const;

export type RetailerId = keyof typeof RETAILERS;

export function isRetailerId(value: unknown): value is RetailerId {
  return typeof value === 'string' && Object.hasOwn(RETAILERS, value);
}

export function retailerProductUrl(value: unknown, retailer: RetailerId): string {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('retailerUrl must be a URL');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !(RETAILERS[retailer].hosts as readonly string[]).includes(url.hostname)) {
    throw new Error('retailerUrl must use HTTPS on the selected retailer website');
  }
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|gclid$|fbclid$)/i.test(key)) url.searchParams.delete(key);
  }
  return url.toString();
}
