export interface Product {
  _id: string;
  name: string;
  slug?: string;
  brand: string;
  category: string;
  description?: string;
  originalPrice: number;
  ourPrice: number;
  discount: number;
  images: string[];
  sizes?: { size: string; available: boolean }[];
  retailerSource: string;
  retailerUrl?: string;
  affiliateUrl?: string;
  currency?: string;
  inStock?: boolean;
  featured?: boolean;
  purchaseMode?: 'external' | 'direct';
  lastVerifiedAt?: string;
  finalSale?: boolean;
  promotion?: string;
  related?: Product[];
}

export interface ProductPage {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
  brands?: string[];
  categories?: string[];
}

export interface CartItem {
  _id: string;
  productId: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  size: string;
  unavailable?: boolean;
}

export interface CartData { items: CartItem[]; subtotal: number; count: number }

export const money = (amount: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
export const shippingFor = (subtotal: number) => subtotal === 0 || subtotal > 500 ? 0 : 15;

export function retailerLink(product: Product): string | undefined {
  for (const value of [product.affiliateUrl, product.retailerUrl]) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
    } catch { /* Ignore malformed links. */ }
  }
  return undefined;
}
