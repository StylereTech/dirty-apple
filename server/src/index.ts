import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app';
import { initializeDatabase } from './database';
import { startScrapeWorker } from './inventory/worker';

export async function startServer() {
  const port = Number(process.env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  await initializeDatabase();
  const stopWorker = process.env.VERCEL === '1' || process.env.SCRAPE_WORKER_ENABLED === 'false' ? () => {} : startScrapeWorker();
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

if (require.main === module && process.env.VERCEL !== '1') {
  startServer().catch(async (error: Error) => {
    console.error('Server startup failed:', error.name);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
}

export default app;
