import { ScrapeJob } from '../models/ScrapeJob';
import { collectRetailerOffers } from './crawler';
import { importOffers } from './importer';
import { isRetailerId } from './retailers';

export async function processNextScrapeJob(): Promise<boolean> {
  const now = new Date();
  // Interrupted work is visible as failed, never mislabeled as a successful empty import.
  await ScrapeJob.updateMany({ status: 'running', sourceType: 'scrape', leaseExpiresAt: { $lt: now } }, {
    $set: { status: 'failed', completedAt: now, errorMessages: ['Worker lease expired; retry this bounded collection'] },
    $unset: { activeRetailer: '', leaseExpiresAt: '' },
  });
  const job = await ScrapeJob.findOneAndUpdate({ status: 'pending', sourceType: 'scrape' }, {
    $set: { status: 'running', startedAt: now, leaseExpiresAt: new Date(now.getTime() + 15 * 60_000) },
  }, { new: true, sort: { createdAt: 1 } });
  if (!job) return false;
  try {
    if (!isRetailerId(job.retailer)) throw new Error('Unknown retailer');
    const result = await collectRetailerOffers(job.retailer, { url: job.url, category: job.category, maxPages: job.maxPages, signal: AbortSignal.timeout(10 * 60_000) });
    if (!result.records.length) throw new Error('No verifiable sale offers found; use an approved product feed for this retailer');
    if (result.records.length > 500) throw new Error('Collection exceeds batch limit; use a smaller page limit');
    const imported = await importOffers(result.records, job.retailer, 'scrape');
    const errors = [...result.warnings, ...('warnings' in imported ? imported.warnings ?? [] : []), ...imported.errors.map(error => `Row ${error.row}: ${error.error}`), ...imported.failures.map(error => error.error)];
    await ScrapeJob.updateOne({ jobId: job.jobId }, {
      $set: { status: imported.errors.length || imported.failures.length ? 'failed' : 'completed', productsFound: result.records.length, productsSaved: imported.created + imported.updated, pagesVisited: result.pagesVisited, truncated: result.truncated, completedAt: new Date(), errorMessages: errors.slice(0, 100) },
      $unset: { activeRetailer: '', leaseExpiresAt: '' },
    });
  } catch (error) {
    await ScrapeJob.updateOne({ jobId: job.jobId }, {
      $set: { status: 'failed', completedAt: new Date(), errorMessages: [(error instanceof Error ? error.message : 'Collection failed').slice(0, 1000)] },
      $unset: { activeRetailer: '', leaseExpiresAt: '' },
    });
  }
  return true;
}

export function startScrapeWorker(): () => void {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await processNextScrapeJob(); }
    catch (error) { console.error('Inventory worker unavailable', error); }
    finally { running = false; }
  };
  const timer = setInterval(() => { void tick(); }, 5_000);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
