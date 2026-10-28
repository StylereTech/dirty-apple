import express from 'express';
import { randomUUID } from 'node:crypto';
import { ScrapeJob } from '../models/ScrapeJob';
import { requireAdmin } from '../middleware/requireAdmin';
import { isRetailerId, RETAILERS, retailerProductUrl } from '../inventory/retailers';
import { queryNumber, queryString } from '../lib/catalog';

const router = express.Router();
router.use(requireAdmin);

router.get('/jobs', async (req, res) => {
  try {
    const page = queryNumber(req.query.page, 'page', 1, 1, 100_000);
    const limit = queryNumber(req.query.limit, 'limit', 20, 1, 100);
    const status = queryString(req.query.status, 'status', 20);
    if (status && !['pending', 'running', 'completed', 'failed'].includes(status)) return res.status(400).json({ error: 'Invalid job status' });
    const filter = status ? { status } : {};
    const [total, jobs] = await Promise.all([ScrapeJob.countDocuments(filter), ScrapeJob.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()]);
    return res.json({ jobs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof Error && /Invalid|must be/.test(error.message)) return res.status(400).json({ error: error.message });
    return res.status(503).json({ error: 'Unable to load import jobs' });
  }
});

router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await ScrapeJob.findOne({ jobId: req.params.id }).lean();
    if (!job) return res.status(404).json({ error: 'Job not found' });
    return res.json(job);
  } catch { return res.status(503).json({ error: 'Unable to load job' }); }
});

router.post('/', async (req, res) => {
  const { retailer, category, url, maxPages = 5 } = req.body || {};
  if (!isRetailerId(retailer)) return res.status(400).json({ error: 'Select a supported retailer' });
  if (category !== undefined && (typeof category !== 'string' || category.length > 80)) return res.status(400).json({ error: 'Invalid category' });
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 10) return res.status(400).json({ error: 'maxPages must be between 1 and 10' });
  let target: string | undefined;
  try {
    target = url === undefined || url === '' ? undefined : retailerProductUrl(url, retailer);
    if (!target && !RETAILERS[retailer].saleUrls.length) throw new Error('Provide a public retailer product or sale URL');
  } catch (error) { return res.status(400).json({ error: (error as Error).message }); }
  try {
    const jobId = randomUUID();
    await ScrapeJob.create({ jobId, retailer, activeRetailer: retailer, category, url: target, maxPages, sourceType: 'scrape', status: 'pending' });
    return res.status(202).json({ jobId, status: 'pending', message: 'Collection queued. Verified sale offers are saved as drafts for review.' });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return res.status(409).json({ error: 'This retailer already has a queued or running collection' });
    return res.status(503).json({ error: 'Unable to queue collection' });
  }
});

router.post('/run', (_req, res) => res.status(409).json({ error: 'Use POST /api/scrape and poll its persisted job; synchronous collection is disabled' }));
export default router;
