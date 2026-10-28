import express from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { PriceHistory } from '../models/PriceHistory';
import { requireAdmin } from '../middleware/requireAdmin';
import { catalogueQuery, publicProductFilter } from '../lib/catalog';
import { normalizeCategory } from '../inventory/normalize';

const router = express.Router();

async function list(req: express.Request, res: express.Response, collection?: string) {
  let query;
  try { query = catalogueQuery(req.query, collection); }
  catch (error) { return res.status(400).json({ error: (error as Error).message }); }
  try {
    const { filter, sort, page, limit } = query;
    const [total, products, brands, categories, retailers] = await Promise.all([
      Product.countDocuments(filter), Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Product.distinct('brand', publicProductFilter()), Product.distinct('category', publicProductFilter()), Product.distinct('retailerId', publicProductFilter()),
    ]);
    return res.json({ products, total, page, totalPages: Math.ceil(total / limit), brands, categories, retailers });
  } catch (error) {
    console.error('Catalog query failed', error);
    return res.status(503).json({ error: 'Product inventory is temporarily unavailable' });
  }
}

router.get('/', (req, res) => { void list(req, res); });
router.get('/collections/:slug', (req, res) => { void list(req, res, req.params.slug.toLowerCase()); });
router.get('/featured', async (_req, res) => {
  try { res.json(await Product.find({ $and: [publicProductFilter(), { featured: true }] }).sort({ updatedAt: -1, _id: 1 }).limit(8).lean()); }
  catch { res.status(503).json({ error: 'Featured inventory is temporarily unavailable' }); }
});
router.get('/deals', async (_req, res) => {
  try { res.json(await Product.find({ $and: [publicProductFilter(), { discount: { $gte: 30 }, isOnSale: true }] }).sort({ discount: -1, _id: 1 }).limit(8).lean()); }
  catch { res.status(503).json({ error: 'Deals are temporarily unavailable' }); }
});

async function detail(res: express.Response, identifier: { slug: string } | { _id: string }) {
  try {
    const product = await Product.findOne({ $and: [publicProductFilter(), identifier] }).lean();
    if (!product) return res.status(404).json({ error: 'Product not found or offer no longer current' });
    const [priceHistory, related] = await Promise.all([
      PriceHistory.find({ product: product._id }).sort({ recordedAt: -1 }).limit(30).lean(),
      Product.find({ $and: [publicProductFilter(), { _id: { $ne: product._id }, $or: [{ brand: product.brand }, { category: product.category }] }] }).sort({ _id: 1 }).limit(4).lean(),
    ]);
    return res.json({ ...product, priceHistory, related });
  } catch { return res.status(503).json({ error: 'Product details are temporarily unavailable' }); }
}

router.get('/slug/:slug', (req, res) => { void detail(res, { slug: req.params.slug }); });
router.get('/:id', (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ error: 'Invalid product ID' });
  void detail(res, { _id: req.params.id });
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ error: 'Product object required' });
    if (req.body.purchaseMode === 'external') return res.status(400).json({ error: 'Use /api/inventory/import for retailer offers' });
    const fields = ['name', 'slug', 'brand', 'description', 'originalPrice', 'ourPrice', 'images', 'sizes', 'colors', 'retailerSource', 'retailerUrl', 'inStock', 'featured', 'sku', 'tags', 'collectionSlug', 'gender'];
    const input = Object.fromEntries(fields.filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]]));
    const original = Number(input.originalPrice), sale = Number(input.ourPrice);
    if (!Number.isFinite(original) || !Number.isFinite(sale) || original <= 0 || sale <= 0) return res.status(400).json({ error: 'Positive prices are required' });
    const product = await Product.create({ ...input, category: normalizeCategory(req.body.category), discount: Math.max(0, Math.floor((1 - sale / original) * 100)), isOnSale: sale < original, status: 'draft', sourceType: 'manual', purchaseMode: 'direct' });
    return res.status(201).json(product);
  } catch { return res.status(400).json({ error: 'Invalid product or duplicate SKU/slug' }); }
});

router.put('/:id', requireAdmin, (_req, res) => res.status(409).json({ error: 'Use PATCH /api/inventory/products/:id for reviewed inventory changes' }));
router.delete('/:id', requireAdmin, async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ error: 'Invalid product ID' });
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { $set: { status: 'delisted' } }, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    return res.json({ success: true, status: 'delisted' });
  } catch { return res.status(503).json({ error: 'Unable to delist product' }); }
});

export default router;
