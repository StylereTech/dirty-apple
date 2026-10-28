import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app';
import { Cart } from './models/Cart';
import { Order } from './models/Order';
import { Product } from './models/Product';
import { ScrapeJob } from './models/ScrapeJob';
import { startScrapeWorker } from './inventory/worker';

export async function startServer() {
  const port = Number(process.env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) throw new Error('MONGODB_URI is required in production');
  if (process.env.NODE_ENV === 'production' && !(process.env.CORS_ORIGINS || process.env.APP_URL)) {
    throw new Error('CORS_ORIGINS or APP_URL is required in production');
  }
  mongoose.set('bufferCommands', false);
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dirty-apple', { serverSelectionTimeoutMS: 10000 });
  // Checkout/session uniqueness is a correctness requirement, not an optional optimization.
  await Promise.all([Cart.init(), Order.init(), Product.init(), ScrapeJob.init()]);
  const stopWorker = process.env.SCRAPE_WORKER_ENABLED === 'false' ? () => {} : startScrapeWorker();
  const server = app.listen(port, () => console.log(`Server listening on port ${port}`));
  const shutdown = () => {
    stopWorker();
    server.close(() => { void mongoose.disconnect().finally(() => process.exit(0)); });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  return server;
}

if (require.main === module) {
  startServer().catch((error: Error) => {
    console.error('Server startup failed:', error.name);
    process.exitCode = 1;
  });
}

export default app;
