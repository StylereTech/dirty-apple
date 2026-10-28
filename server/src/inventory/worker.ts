import { randomUUID } from 'node:crypto';
import { ScrapeJob } from '../models/ScrapeJob';
import { collectRetailerOffers } from './crawler';
import { importOffers, ImportInterruptedError } from './importer';
import { isRetailerId } from './retailers';

export interface ScrapeJobOptions {
  budgetMs?: number;
  signal?: AbortSignal;
}

interface WorkerDependencies {
  collect: typeof collectRetailerOffers;
  import: typeof importOffers;
  now: () => Date;
}

/** Claims one durable job. Tests inject source work, never a production database. */
export function createScrapeJobProcessor(overrides: Partial<WorkerDependencies> = {}) {
  const dependencies = { collect: collectRetailerOffers, import: importOffers, now: () => new Date(), ...overrides };
  return async function processJob(options: ScrapeJobOptions = {}): Promise<boolean> {
    const budgetMs = options.budgetMs ?? 240_000;
    if (!Number.isInteger(budgetMs) || budgetMs < 1 || budgetMs > 240_000) throw new Error('Invalid inventory execution budget');
    options.signal?.throwIfAborted();
    const signal = AbortSignal.any([AbortSignal.timeout(budgetMs), ...(options.signal ? [options.signal] : [])]);
    const now = dependencies.now();
    // Failed invocations remain inspectable. A new bounded job can retry the same
    // identities without republishing drafts or duplicating already saved offers.
    await ScrapeJob.updateMany({ status: 'running', sourceType: 'scrape', leaseExpiresAt: { $lt: now } }, {
      $set: { status: 'failed', completedAt: now, errorMessages: ['Worker lease expired; retry this bounded collection'] },
      $unset: { activeRetailer: '', leaseExpiresAt: '', leaseToken: '' },
    }, { maxTimeMS: 5_000 });
    signal.throwIfAborted();
    const leaseToken = randomUUID();
    const job = await ScrapeJob.findOneAndUpdate({ status: 'pending', sourceType: 'scrape' }, {
      $set: { status: 'running', startedAt: now, leaseToken, leaseExpiresAt: new Date(now.getTime() + budgetMs + 60_000) },
    }, { new: true, sort: { createdAt: 1 }, maxTimeMS: 5_000 });
    if (!job) return false;
    let productsFound = 0;
    let pagesVisited = 0;
    let truncated = false;
    const finish = (values: Record<string, unknown>) => ScrapeJob.updateOne({
      jobId: job.jobId, status: 'running', leaseToken,
      leaseExpiresAt: { $gt: dependencies.now() },
    }, {
      $set: { ...values, productsFound, pagesVisited, truncated, completedAt: dependencies.now() },
      $unset: { activeRetailer: '', leaseExpiresAt: '', leaseToken: '' },
    }, { maxTimeMS: 5_000 });
    try {
      signal.throwIfAborted();
      if (!isRetailerId(job.retailer)) throw new Error('Unknown retailer');
      const result = await dependencies.collect(job.retailer, { url: job.url, category: job.category, maxPages: job.maxPages, signal });
      signal.throwIfAborted();
      productsFound = result.records.length;
      pagesVisited = result.pagesVisited;
      truncated = result.truncated;
      if (!result.records.length) throw new Error('No verifiable sale offers found; use an approved product feed for this retailer');
      if (result.records.length > 500) throw new Error('Collection exceeds batch limit; use a smaller page limit');
      const ownsLease = await ScrapeJob.exists({
        jobId: job.jobId, status: 'running', leaseToken, leaseExpiresAt: { $gt: dependencies.now() },
      }).maxTimeMS(5_000);
      if (!ownsLease) throw new Error('Job lease is no longer owned; collection discarded');
      signal.throwIfAborted();
      const imported = await dependencies.import(result.records, job.retailer, 'scrape', { signal });
      const errors = [...result.warnings, ...('warnings' in imported ? imported.warnings ?? [] : []), ...imported.errors.map(error => `Row ${error.row}: ${error.error}`), ...imported.failures.map(error => error.error)];
      await finish({
        status: imported.errors.length || imported.failures.length ? 'failed' : 'completed',
        productsSaved: imported.created + imported.updated, errorMessages: errors.slice(0, 100),
      });
    } catch (error) {
      await finish({
        status: 'failed',
        ...(error instanceof ImportInterruptedError ? { productsSaved: error.created + error.updated } : {}),
        errorMessages: [signal.aborted
          ? 'Collection execution budget ended; retry this bounded job. Already committed updates are retained and retry safely.'
          : (error instanceof Error ? error.message : 'Collection failed').slice(0, 1000)],
      });
    }
    return true;
  };
}

export const processNextScrapeJob = createScrapeJobProcessor();

export function startScrapeWorker(): () => void {
  let running = false;
  const controller = new AbortController();
  const tick = async () => {
    if (running || controller.signal.aborted) return;
    running = true;
    try { await processNextScrapeJob({ signal: controller.signal }); }
    catch { console.error('Inventory worker unavailable'); }
    finally { running = false; }
  };
  const timer = setInterval(() => { void tick(); }, 5_000);
  timer.unref();
  void tick();
  return () => { clearInterval(timer); controller.abort(); };
}
