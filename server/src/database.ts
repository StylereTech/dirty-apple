import mongoose from 'mongoose';
import { Cart } from './models/Cart';
import { Order } from './models/Order';
import { Product } from './models/Product';
import { ScrapeJob } from './models/ScrapeJob';
import { PriceHistory } from './models/PriceHistory';

// A function instance shares this pool across concurrent and subsequent requests.
// Keep the pool small because Vercel may run several instances at once.
export const databaseConnectionOptions: mongoose.ConnectOptions = {
  bufferCommands: false,
  autoCreate: false,
  autoIndex: false,
  maxPoolSize: 10,
  minPoolSize: 0,
  maxIdleTimeMS: 60000,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  waitQueueTimeoutMS: 10000,
  socketTimeoutMS: 15000,
  timeoutMS: 15000,
};

mongoose.set('bufferCommands', false);

export function databaseUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  const production = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  if (production && !uri) throw new Error('MONGODB_URI is required in production');
  if (production && !(process.env.CORS_ORIGINS?.trim() || process.env.APP_URL?.trim())) {
    throw new Error('CORS_ORIGINS or APP_URL is required in production');
  }
  return uri || 'mongodb://127.0.0.1:27017/dirty-apple';
}

interface DatabaseDependencies {
  readyState: () => number;
  connect: () => Promise<unknown>;
  initializeIndexes: () => Promise<unknown>;
  now?: () => number;
  retryDelayMs?: number;
}

/** One pending startup per process, including index creation, with retry after failure. */
export function createDatabaseInitializer(dependencies: DatabaseDependencies) {
  const now = dependencies.now || Date.now;
  const retryDelayMs = dependencies.retryDelayMs ?? 5000;
  let inFlight: Promise<void> | undefined;
  let indexesReady = false;
  let connectedOnce = false;
  let retryAt = 0;
  let lastError: unknown;

  const isReady = () => indexesReady && dependencies.readyState() === 1;
  const initialize = (): Promise<void> => {
    if (isReady()) return Promise.resolve();
    if (inFlight) return inFlight;
    if (now() < retryAt) return Promise.reject(lastError);

    // Assign the promise before the first await so cold requests cannot open extra pools.
    inFlight = Promise.resolve().then(async () => {
      if (dependencies.readyState() !== 1) {
        if (connectedOnce) {
          // The MongoDB driver reconnects its existing pool after transient network loss.
          // Opening another client here would leak connections under concurrent traffic.
          throw new Error('Database connection is temporarily unavailable');
        }
        await dependencies.connect();
      }
      connectedOnce = true;
      await dependencies.initializeIndexes();
      if (dependencies.readyState() !== 1) throw new Error('Database connection is temporarily unavailable');
      indexesReady = true;
    }).catch(error => {
      lastError = error;
      retryAt = now() + retryDelayMs;
      throw error;
    }).finally(() => { inFlight = undefined; });

    return inFlight;
  };

  return { initialize, isReady };
}

export async function initializeModelIndexes() {
  // Model.init() caches a rejected promise forever. Use the public, repeatable
  // additive operations so a transient index failure can recover on a later request.
  // Neither operation drops collections, indexes, or existing documents.
  const results = await Promise.allSettled([Cart, Order, Product, ScrapeJob, PriceHistory].map(async model => {
    await model.createCollection();
    await model.createIndexes();
  }));
  const failure = results.find(result => result.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
}

const database = createDatabaseInitializer({
  readyState: () => mongoose.connection.readyState,
  connect: () => mongoose.connect(databaseUri(), databaseConnectionOptions),
  initializeIndexes: initializeModelIndexes,
});

export function initializeDatabase(): Promise<void> {
  // Validate even when another module already opened the default connection.
  try { databaseUri(); } catch (error) { return Promise.reject(error); }
  return database.initialize();
}

export const isDatabaseReady = database.isReady;
