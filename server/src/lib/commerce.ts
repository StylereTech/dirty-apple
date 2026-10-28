import { Product } from '../models/Product';

export class CommerceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function quantity(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > 10) {
    throw new CommerceError('Quantity must be an integer between 1 and 10');
  }
  return Number(value);
}

export function moneyInCents(value: number): number {
  if (!Number.isFinite(value) || value <= 0 || value > 999999.99) {
    throw new CommerceError('Product price is unavailable', 409);
  }
  const cents = Math.round(value * 100);
  if (cents < 1) throw new CommerceError('Product price is unavailable', 409);
  return cents;
}

export function validateProduct(product: any, size: unknown) {
  if (!product || product.status !== 'active' || !product.inStock) {
    throw new CommerceError('This product is no longer available', 409);
  }
  const demoImage = product.images?.some((image: unknown) => {
    if (typeof image !== 'string') return false;
    try {
      const hostname = new URL(image).hostname.toLowerCase();
      return hostname === 'picsum.photos' || hostname.endsWith('.picsum.photos');
    } catch { return false; }
  });
  // Old seed records predate sourceType; their placeholder image host identifies them.
  if (product.sourceType === 'demo' || demoImage) {
    throw new CommerceError('Demonstration products cannot be purchased', 409);
  }
  if (product.purchaseMode === 'external') {
    throw new CommerceError('Complete this purchase on the retailer website', 409);
  }
  if (product.currency && product.currency !== 'USD') {
    throw new CommerceError('This product currency is not supported for checkout', 409);
  }
  const selectedSize = typeof size === 'string' ? size.trim() : '';
  if (selectedSize.length > 80) throw new CommerceError('Invalid size');
  if (product.sizes?.length && !product.sizes.some((entry: any) => entry.size === selectedSize && entry.available)) {
    throw new CommerceError('Select an available size', 409);
  }
  return selectedSize || 'One Size';
}

export function normalizeItems(input: unknown): Array<{ productId: string; quantity: number; size: string }> {
  if (!Array.isArray(input) || input.length === 0 || input.length > 50) {
    throw new CommerceError('Cart must contain between 1 and 50 items');
  }
  const items = new Map<string, { productId: string; quantity: number; size: string }>();
  for (const item of input) {
    if (!item || typeof item.productId !== 'string' || !/^[0-9a-f]{24}$/i.test(item.productId)) {
      throw new CommerceError('Invalid product ID');
    }
    if (typeof item.size !== 'string' || item.size.length > 80) throw new CommerceError('Invalid size');
    const normalized = { productId: item.productId.toLowerCase(), quantity: quantity(item.quantity), size: item.size.trim() || 'One Size' };
    const key = `${normalized.productId}:${normalized.size}`;
    const existing = items.get(key);
    if (existing) existing.quantity = quantity(existing.quantity + normalized.quantity);
    else items.set(key, normalized);
  }
  return [...items.values()].sort((a, b) => `${a.productId}:${a.size}`.localeCompare(`${b.productId}:${b.size}`));
}

export async function priceItems(items: ReturnType<typeof normalizeItems>) {
  const products = await Product.find({ _id: { $in: items.map(item => item.productId) } }).lean();
  const byId = new Map(products.map(product => [String(product._id), product]));
  let subtotalCents = 0;
  const priced = items.map(item => {
    const product = byId.get(item.productId);
    const size = validateProduct(product, item.size);
    const priceCents = moneyInCents(product!.ourPrice);
    subtotalCents += priceCents * item.quantity;
    return {
      product: product!._id, quantity: item.quantity, price: priceCents / 100,
      originalPrice: product!.originalPrice, name: product!.name, brand: product!.brand,
      image: product!.images?.[0] || '', size, spread: 0,
    };
  });
  const shippingCents = subtotalCents > 50000 ? 0 : 1500;
  if (subtotalCents + shippingCents > 99999999) throw new CommerceError('Order exceeds the maximum supported amount');
  return { items: priced, subtotal: subtotalCents / 100, shipping: shippingCents / 100, tax: 0, total: (subtotalCents + shippingCents) / 100 };
}

const requiredText = (value: unknown, label: string, max = 200) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new CommerceError(`${label} is required`);
  return value.trim();
};

export function normalizeCustomer(input: any) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CommerceError('Customer details are required');
  const email = requiredText(input.email, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CommerceError('Invalid email address');
  const country = typeof input.country === 'string' ? input.country.toUpperCase() : 'US';
  if (country !== 'US') throw new CommerceError('Direct checkout currently supports US addresses only');
  return {
    firstName: requiredText(input.firstName, 'First name', 100),
    lastName: requiredText(input.lastName, 'Last name', 100), email,
    phone: typeof input.phone === 'string' ? input.phone.trim().slice(0, 40) : '',
    address: {
      street: requiredText(input.address, 'Street address'), city: requiredText(input.city, 'City', 100),
      state: requiredText(input.state, 'State', 100), zip: requiredText(input.zip, 'ZIP code', 20), country,
    },
  };
}
