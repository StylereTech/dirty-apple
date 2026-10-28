import express from 'express';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Product } from '../models/Product';
import { ScrapeJob } from '../models/ScrapeJob';
import { requireAdmin } from '../middleware/requireAdmin';
import { RETAILERS, isRetailerId } from '../inventory/retailers';
import { previewOffers, CATEGORIES, GENDERS } from '../inventory/normalize';
import { importOffers } from '../inventory/importer';
import { queryNumber, queryString, escapeRegex, freshnessCutoff } from '../lib/catalog';

const router = express.Router();
router.use(requireAdmin);
const statuses = ['draft', 'active', 'sold_out', 'delisted'];

router.get('/retailers', (_req, res) => res.json({ retailers: Object.values(RETAILERS).map(retailer => ({ ...retailer, feedImport: true, collectionMode: 'bounded-public-jsonld', feedConnected: false })) }));

router.get('/products', async (req, res) => {
  try {
    const page = queryNumber(req.query.page, 'page', 1, 1, 100_000);
    const limit = queryNumber(req.query.limit, 'limit', 25, 1, 100);
    const filter: Record<string, unknown> = {};
    const status = queryString(req.query.status, 'status', 20);
    if (status && !statuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (status) filter.status = status;
    const retailer = queryString(req.query.retailer, 'retailer', 30);
    if (retailer && !isRetailerId(retailer)) return res.status(400).json({ error: 'Invalid retailer' });
    if (retailer) filter.retailerId = retailer;
    const search = queryString(req.query.search, 'search');
    if (search) filter.$or = ['name', 'brand', 'sku'].map(key => ({ [key]: { $regex: escapeRegex(search), $options: 'i' } }));
    const staleFilter = queryString(req.query.stale, 'stale', 5);
    if (staleFilter && !['true', 'false'].includes(staleFilter)) return res.status(400).json({ error: 'Invalid stale filter' });
    if (staleFilter === 'true') {
      filter.purchaseMode = 'external';
      filter.$and = [{ $or: [{ lastVerifiedAt: { $lt: freshnessCutoff() } }, { lastVerifiedAt: { $exists: false } }] }];
    }
    const [products, total, counts, stale] = await Promise.all([
      Product.find(filter).sort({ updatedAt: -1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(filter), Product.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Product.countDocuments({ purchaseMode: 'external', $or: [{ lastVerifiedAt: { $lt: freshnessCutoff() } }, { lastVerifiedAt: { $exists: false } }] }),
    ]);
    return res.json({ products, total, page, totalPages: Math.ceil(total / limit), counts, stale });
  } catch (error) {
    if (error instanceof Error && /must be|Invalid/.test(error.message)) return res.status(400).json({ error: error.message });
    return res.status(503).json({ error: 'Inventory is temporarily unavailable' });
  }
});

router.patch('/products/:id', async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ error: 'Invalid product ID' });
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'Inventory changes must be an object' });
    const allowed = ['status', 'category', 'gender', 'featured', 'collectionSlug', 'tags'];
    if (Object.keys(body).some(key => !allowed.includes(key))) return res.status(400).json({ error: 'Only category, gender, status, featured, collectionSlug and tags may be edited here' });
    if (body.status !== undefined && !statuses.includes(body.status)) return res.status(400).json({ error: 'Invalid status' });
    if (body.category !== undefined && !CATEGORIES.includes(body.category)) return res.status(400).json({ error: 'Invalid category' });
    if (body.gender !== undefined && !GENDERS.includes(body.gender)) return res.status(400).json({ error: 'Invalid gender' });
    if (body.featured !== undefined && typeof body.featured !== 'boolean') return res.status(400).json({ error: 'featured must be a boolean' });
    if (body.collectionSlug !== undefined && (typeof body.collectionSlug !== 'string' || !/^[a-z0-9-]{0,100}$/.test(body.collectionSlug))) return res.status(400).json({ error: 'Invalid collection slug' });
    if (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.length > 30 || body.tags.some((tag: unknown) => typeof tag !== 'string' || tag.length > 80))) return res.status(400).json({ error: 'Invalid tags' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    Object.assign(product, body);
    if (product.status === 'active') {
      if (product.sourceType === 'demo' || product.images.some(url => /picsum\.photos/i.test(url))) return res.status(400).json({ error: 'Demo inventory cannot be published' });
      if (!product.images.length || product.category === 'other') return res.status(400).json({ error: 'Add a product image and organize its category before publishing' });
      if (product.purchaseMode === 'external' && (!product.lastVerifiedAt || product.lastVerifiedAt < freshnessCutoff() || !product.inStock || !product.isOnSale || product.ourPrice >= product.originalPrice)) {
        return res.status(400).json({ error: 'Refresh this offer first: only current, in-stock sale offers can be published' });
      }
    }
    await product.save();
    return res.json(product);
  } catch { return res.status(400).json({ error: 'Unable to update inventory' }); }
});

router.post('/import', async (req, res) => {
  const { retailer, records, dryRun = true } = req.body || {};
  if (!isRetailerId(retailer) || typeof dryRun !== 'boolean') return res.status(400).json({ error: 'Valid retailer and boolean dryRun are required' });
  let preview;
  try { preview = previewOffers(records, retailer); }
  catch (error) { return res.status(400).json({ error: (error as Error).message }); }
  if (dryRun) return res.json({ ...preview, dryRun: true });
  if (preview.errors.length) return res.status(422).json({ ...preview, offers: undefined, committed: false, error: 'Resolve invalid rows before importing; no changes were saved' });
  let jobId: string | undefined;
  try {
    jobId = randomUUID();
    await ScrapeJob.create({ jobId, retailer, sourceType: 'feed', status: 'running', startedAt: new Date(), productsFound: records.length });
    const result = await importOffers(records, retailer);
    await ScrapeJob.updateOne({ jobId }, { $set: { status: result.failures.length ? 'failed' : 'completed', completedAt: new Date(), productsSaved: result.created + result.updated, errorMessages: result.failures.map(entry => entry.error) } });
    return res.status(result.failures.length ? 207 : 200).json({ ...result, jobId });
  } catch {
    if (jobId) await ScrapeJob.updateOne({ jobId }, { $set: { status: 'failed', completedAt: new Date(), errorMessages: ['Import interrupted; retry after checking inventory'] } }).catch(() => undefined);
    return res.status(503).json({ error: 'Import could not complete; check job history and retry safely' });
  }
});

export default router;
