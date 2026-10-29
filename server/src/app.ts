import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import productRoutes from './routes/products';
import cartRoutes from './routes/cart';
import checkoutRoutes from './routes/checkout';
import orderRoutes from './routes/orders';
import scrapeRoutes from './routes/scrape';
import inventoryRoutes from './routes/inventory';
import inventoryCronRoutes from './routes/inventory-cron';
import webhookRoutes, { stripeWebhookHandler } from './routes/webhooks';
import { initializeDatabase, isDatabaseReady as databaseIsReady } from './database';

function databaseErrorDiagnostic(error: unknown): Array<Record<string, string | number>> {
  const diagnostics: Array<Record<string, string | number>> = [];
  const pending: unknown[] = [error];
  const seen = new Set<object>();
  while (pending.length && diagnostics.length < 3) {
    const current = pending.shift();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);
    const record = current as Record<string, unknown>;
    const diagnostic: Record<string, string | number> = {};
    if (typeof record.name === 'string') diagnostic.name = record.name;
    if (typeof record.code === 'string' || typeof record.code === 'number') diagnostic.code = record.code;
    if (typeof record.codeName === 'string') diagnostic.codeName = record.codeName;
    if (Object.keys(diagnostic).length) diagnostics.push(diagnostic);
    pending.push(record.cause, record.error);
  }
  return diagnostics;
}

export function createApp(options: { isDatabaseReady?: () => boolean; initializeDatabase?: () => Promise<void> } = {}) {
  const app = express();
  const isDatabaseReady = options.isDatabaseReady || (() => mongoose.connection.readyState === 1);
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    // Scheduled work includes cold database startup in its overall function deadline.
    res.locals.requestStartedAt = Date.now();
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(cors({
    origin(origin, callback) {
      const configured = (process.env.CORS_ORIGINS || process.env.APP_URL || '').split(',').map(value => value.trim()).filter(Boolean);
      const local = process.env.NODE_ENV !== 'production' && origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (!origin || configured.includes(origin) || local) return callback(null, true);
      return callback(Object.assign(new Error('Origin is not permitted'), { status: 403 }));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id', 'X-Order-Token', 'Idempotency-Key'],
    maxAge: 600,
  }));
  const initialize = options.initializeDatabase;
  if (initialize) {
    app.use((req, res, next) => {
      // Leave the request stream untouched; Stripe signature verification needs raw bytes.
      void Promise.resolve().then(initialize).then(() => next(), error => {
        console.error('Database initialization failed', databaseErrorDiagnostic(error));
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Retry-After', '5');
        if (req.path === '/api/health') {
          return res.status(503).json({ status: 'unavailable', database: 'unavailable' });
        }
        res.status(503).json({ error: 'Service is temporarily unavailable' });
      });
    });
  }
  app.get('/api/health', (_req, res) => {
    const ready = isDatabaseReady();
    res.setHeader('Cache-Control', 'no-store');
    res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable', database: ready ? 'connected' : 'disconnected' });
  });
  app.use('/api', (_req, res, next) => {
    if (!isDatabaseReady()) return res.status(503).json({ error: 'Service is temporarily unavailable' });
    next();
  });
  app.use('/api/webhooks', webhookRoutes);
  // Compatibility for installations that configured the earlier checkout webhook URL.
  app.post('/api/checkout/webhook', express.raw({ type: 'application/json', limit: '1mb' }), stripeWebhookHandler);
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/products', productRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/checkout', checkoutRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/scrape', scrapeRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/internal/inventory', inventoryCronRoutes);
  app.use((_req, res) => { res.status(404).json({ error: 'Route not found' }); });
  const errors: express.ErrorRequestHandler = (error, _req, res, _next) => {
    const status = error.status === 413 ? 413 : error.status === 403 ? 403 : error.status === 400 ? 400 : 500;
    res.status(status).json({ error: status === 413 ? 'Request is too large' : status === 403 ? 'Origin is not permitted' : status === 400 ? 'Invalid JSON request' : 'Unexpected server error' });
  };
  app.use(errors);
  return app;
}

// Vercel detects src/app.ts before src/index.ts. Its default export must include
// database startup; importing the app must not open a port or start an interval.
export default createApp({ initializeDatabase, isDatabaseReady: databaseIsReady });
