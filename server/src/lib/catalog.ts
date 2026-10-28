import { FilterQuery } from 'mongoose';
import { IProduct } from '../models/Product';

export function freshnessCutoff(now = new Date()): Date {
  const configured = Number(process.env.OFFER_MAX_AGE_HOURS || 24);
  const hours = Number.isFinite(configured) && configured >= 1 && configured <= 168 ? configured : 24;
  return new Date(now.getTime() - hours * 3_600_000);
}

export function publicProductFilter(now = new Date()): FilterQuery<IProduct> {
  return {
    status: 'active', sourceType: { $ne: 'demo' },
    'images.0': { $regex: '^https://', $options: 'i' },
    images: { $not: { $elemMatch: { $regex: '^https?://picsum\\.photos(?:/|$)', $options: 'i' } } },
    ourPrice: { $gt: 0 },
    $or: [
      { purchaseMode: { $ne: 'external' } },
      {
        purchaseMode: 'external', currency: 'USD', inStock: true, isOnSale: true,
        originalPrice: { $gt: 0 }, $expr: { $lt: ['$ourPrice', '$originalPrice'] },
        lastVerifiedAt: { $gte: freshnessCutoff(now), $lte: new Date(now.getTime() + 60_000) },
      },
    ],
  };
}

export function queryString(value: unknown, field: string, max = 200): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > max) throw new Error(`${field} must be a string of at most ${max} characters`);
  return value.trim() || undefined;
}

export function queryNumber(value: unknown, field: string, fallback: number, min: number, max: number, integer = true): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value)) throw new Error(`Invalid ${field}`);
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isSafeInteger(number))) throw new Error(`Invalid ${field}`);
  return number;
}

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function catalogueQuery(query: Record<string, unknown>, collectionSlug?: string) {
  const filter: FilterQuery<IProduct> = {};
  const collectionFilter: FilterQuery<IProduct> = {};
  const brand = queryString(query.brand, 'brand', 1000);
  if (brand) filter.brand = { $in: brand.split(',').map(value => value.trim()).filter(Boolean).slice(0, 30) };
  const category = queryString(query.category, 'category', 80);
  if (category) filter.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' };
  const retailer = queryString(query.retailer, 'retailer', 50);
  if (retailer) filter.retailerId = retailer;
  const gender = queryString(query.gender, 'gender', 20);
  if (gender) {
    if (!['women', 'men', 'unisex', 'kids'].includes(gender)) throw new Error('Invalid gender');
    filter.gender = { $in: gender === 'women' || gender === 'men' ? [gender, 'unisex'] : [gender] };
  }
  const collection = collectionSlug || queryString(query.collection, 'collection', 100);
  if (collection) {
    if (['bags', 'shoes', 'clothing', 'accessories', 'kids'].includes(collection.toLowerCase())) collectionFilter.category = { $regex: `^${collection}$`, $options: 'i' };
    else if (collection === 'sale') collectionFilter.isOnSale = true;
    else if (['featured', 'editors-picks'].includes(collection)) collectionFilter.featured = true;
    else if (collection === 'trending') collectionFilter.discount = { $gte: 30 };
    else if (collection !== 'new-arrivals') collectionFilter.collectionSlug = collection;
  }
  if (query.priceMin !== undefined || query.priceMax !== undefined) {
    const min = queryNumber(query.priceMin, 'priceMin', 0, 0, 1_000_000, false);
    const max = queryNumber(query.priceMax, 'priceMax', 1_000_000, 0, 1_000_000, false);
    if (min > max) throw new Error('priceMin cannot exceed priceMax');
    filter.ourPrice = { $gte: min, $lte: max };
  }
  if (query.minDiscount !== undefined) filter.discount = { $gte: queryNumber(query.minDiscount, 'minDiscount', 0, 0, 100) };
  for (const key of ['featured', 'onSale', 'inStock'] as const) {
    const value = queryString(query[key], key, 5);
    if (value && !['true', 'false'].includes(value)) throw new Error(`Invalid ${key}`);
    if (value) filter[key === 'onSale' ? 'isOnSale' : key] = value === 'true';
  }
  const search = queryString(query.search, 'search');
  if (search) filter.$or = ['name', 'brand', 'description', 'tags'].map(key => ({ [key]: { $regex: escapeRegex(search), $options: 'i' } }));
  const sorts: Record<string, Record<string, 1 | -1>> = {
    'price-low': { ourPrice: 1, _id: 1 }, 'price-high': { ourPrice: -1, _id: 1 },
    discount: { discount: -1, _id: 1 }, newest: { createdAt: -1, _id: 1 }, name: { name: 1, _id: 1 },
  };
  const sort = queryString(query.sort, 'sort', 30) || (collection === 'new-arrivals' ? 'newest' : 'price-low');
  if (!Object.hasOwn(sorts, sort)) throw new Error('Invalid sort');
  return {
    filter: { $and: [publicProductFilter(), filter, collectionFilter] } as FilterQuery<IProduct>, sort: sorts[sort],
    page: queryNumber(query.page, 'page', 1, 1, 100_000), limit: queryNumber(query.limit, 'limit', 12, 1, 100),
  };
}
