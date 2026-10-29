import express from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { processNextScrapeJob } from '../inventory/worker';

export const INVENTORY_JOB_BUDGET_MS = 240_000;
const INVOCATION_WORK_CUTOFF_MS = 260_000;

/** Cron only drains the persisted admin queue; it does not invent or expand sources. */
export function createInventoryCronRouter(processJob = processNextScrapeJob) {
  const router = express.Router();
  router.all('/run', async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    // Express otherwise invokes a GET handler for HEAD, which must not start work.
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.length < 32 || /[\r\n]/.test(secret)) {
      return res.status(503).json({ error: 'Inventory scheduler is not configured' });
    }
    const actual = createHash('sha256').update(req.get('Authorization') ?? '').digest();
    const expected = createHash('sha256').update(`Bearer ${secret}`).digest();
    if (!timingSafeEqual(actual, expected)) return res.status(401).json({ error: 'Unauthorized' });
    if (process.env.INVENTORY_CRON_ENABLED !== 'true') {
      return res.status(503).json({ error: 'Inventory scheduler is disabled' });
    }
    // Cold-start connection and index initialization share the function's 300s
    // lifetime. Keep 40s for an in-flight bounded DB operation and finalization.
    const startedAt = res.locals.requestStartedAt;
    const elapsed = typeof startedAt === 'number' && Number.isFinite(startedAt)
      ? Math.max(0, Date.now() - startedAt) : 0;
    const budgetMs = Math.min(INVENTORY_JOB_BUDGET_MS, INVOCATION_WORK_CUTOFF_MS - elapsed);
    if (budgetMs < 1_000) {
      return res.status(503).json({ error: 'Inventory startup exceeded the execution budget; retry later' });
    }
    try {
      // Await the complete operation so a serverless response never abandons work.
      const processed = await processJob({ budgetMs });
      return res.json({ status: 'ok', processed });
    } catch {
      return res.status(503).json({ error: 'Inventory queue is temporarily unavailable' });
    }
  });
  return router;
}

export default createInventoryCronRouter();
