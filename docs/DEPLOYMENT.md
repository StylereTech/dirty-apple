# Deployment and production gates

## Service configuration

Keep database, Stripe and administrator secrets in the deployment environment. Do not commit populated `.env` files or place secrets in `NEXT_PUBLIC_*` variables.

| Service | Variable | Required behavior |
| --- | --- | --- |
| API | `NODE_ENV=production` | Enables production configuration checks. |
| API | `MONGODB_URI` | Working MongoDB connection; startup fails if missing/unavailable. |
| API | `APP_URL` or `CORS_ORIGINS` | Exact trusted frontend origin(s); comma-separated for multiple origins. |
| API | `ADMIN_API_TOKEN` | Unique secret at least 32 characters; required for inventory, imports, order administration. |
| API | `PORT` | Host-assigned port or 4000. |
| API | `SCRAPE_WORKER_ENABLED` | Standalone process only. Set `false` on Vercel; no interval starts in a Vercel function. |
| API | `CRON_SECRET` | Separate server-only secret of at least 32 characters; Vercel supplies it in the scheduled request's bearer header. |
| API | `INVENTORY_CRON_ENABLED` | Defaults off. Enable only after the database, queue, and source operating plan have been verified. |
| API | `OFFER_MAX_AGE_HOURS` | Defaults 24; allowed range 1–168. |
| API | `DIRECT_CHECKOUT_ENABLED` | Defaults off. Leave off for retailer-link launch. |
| API | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Required only for explicitly enabled direct checkout. |
| Frontend | `API_URL` | Working backend origin, including scheme. Set HTTPS in production. Same-origin API proxy uses this server variable. |
| Frontend | `NEXT_PUBLIC_API_URL` | Optional direct browser-to-backend override; leave empty to use the proxy. |
| Frontend | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Required only for direct checkout. |
| Frontend | `NEXT_PUBLIC_SUPPORT_EMAIL` | Optional real support address; no invented fallback. |

Generate an admin token with a cryptographically secure password manager or a local random-byte generator. The `/admin` form keeps it only in tab memory. For a larger operations team, replace the single shared administrator credential with named accounts and an audit trail before giving broad staff access.

## Existing database rollout

1. Take a database backup and use a staging database for the first migration/verification.
2. Inspect existing products, orders and carts before building indexes. Resolve duplicate product SKU/slug, source identity, checkout identity or Stripe payment ID records deliberately. Do not bulk-delete catalog data to make startup succeed.
3. Start the new API. It waits for MongoDB and Cart, Order, Product, ScrapeJob and PriceHistory indexes before accepting database requests. An index conflict intentionally blocks readiness. Index creation is additive and preserves existing records and custom indexes.
4. Confirm `/api/health` returns 200 with `database: connected`; disconnect/reconnect checks should show 503 while unavailable.
5. Configure frontend `API_URL` to that working service. Test public catalog and admin authentication through the deployed frontend proxy.
6. Inspect legacy inventory. Public queries hide demo-marked products and known `picsum.photos` seed images. Organize legitimate catalog records through admin; no production cleanup is automatically executed.

The application uses one server-only `MONGODB_URI` and shared models for the inventory, price history, cart, order and collection-job flow. Inspect the actual account before merging any additional databases; the repository does not define a multi-database migration. Retain the existing dirtyApple database unless an identified data migration is required.

The audit observed HTTP 404 at the repository's former hardcoded Railway API health and catalog URLs. That old fallback was removed. Vercel can host both the frontend and Express API; Railway is optional. A configured database connection is still required for the API to become ready.

## Retailer-link launch

Connect at least one approved source, ingest a current export, review/publish real offers, and verify retailer links and image behavior on mobile and desktop. Establish a recurring feed-refresh job within the source's allowed cadence, alert on failures and stale inventory, and measure actual coverage. The queue worker processes jobs but does not subscribe to affiliate feeds automatically.

Test that an invalid import cannot publish anything, repeated imports do not duplicate offers, old/unavailable offers disappear, and partial source failures do not remove the entire catalog. Validate operations against a representative retailer dataset before claiming complete coverage.

Configure the actual public domain, HTTPS, database backups, runtime logs and readiness monitoring in the hosting provider. Verify current retailer image/data usage rights through the approved source terms. Supplier-provided feeds should include usable images and destination links.

## Direct checkout

Direct checkout stays disabled by default because the existing repository does not implement verified fulfillment operations, inventory reservation, complete tax handling or order emails. The repairs make the code fail closed; they do not supply those business operations.

Before enabling `DIRECT_CHECKOUT_ENABLED=true`:

1. Supply genuine direct inventory and a fulfillment process, including stock/reservation behavior, cancellation, refunds and support.
2. Implement/verify taxes and shipping rules. The current quotation retains the repository's simple shipping rule and zero tax; do not treat that as completed tax configuration.
3. Configure matching Stripe keys and the exact webhook endpoint `/api/webhooks/stripe`. The legacy `/api/checkout/webhook` path is also supported. Subscribe to implemented payment-intent success/failure and charge-refund events.
4. Run Stripe test-mode end-to-end payment, webhook, confirmation-retry and refund checks against staging. Offline SDK mocks do not verify real webhook delivery.
5. Confirm customer access tokens and browser sessions work through the proxy, and no order PII is publicly readable.

External retailer offers always complete purchase with the retailer and never enter dirtyApple Stripe checkout. There is no charge-then-affiliate-redirect flow.

## Builds and CI

CI verifies frontend and backend separately on Node 22: locked dependency installation, type checks, tests, production builds and high-severity dependency audits. Database integration tests use disposable local MongoDB and never a production URI. First test execution needs access to download a MongoDB binary.

### Vercel API (current release target)

Use the `dirty-apple-api` project in the same Vercel team as the frontend. Set Root Directory to `server`, framework to `express`, Node.js to `22.x`, install command to `npm ci`, and build command to `npm run build`. Keep the framework's default output directory. The repository configuration is `server/vercel.json`.

Vercel detects `src/app.ts` before `src/index.ts`. The default application export therefore awaits cached MongoDB startup before serving database routes; importing it starts neither a TCP listener nor an interval worker. Concurrent cold requests share a bounded pool and the same pending initialization. Failed connections or index initialization return generic, uncached 503 responses and can retry after backoff. The raw request stream remains intact for Stripe signature verification.

Set `MONGODB_URI` only in the intended environment after verifying the existing dirtyApple cluster/database. Production credentials must not be copied into ordinary preview deployments. Use a separate staging database for mutation tests. A successfully built function that returns 503 for a missing connection is not a production-ready API.

The function limit is 300 seconds. The authenticated `GET /api/internal/inventory/run` endpoint drains at most one previously queued job and awaits completion. Its budget includes cold database initialization and reserves time for finalization. The checked-in daily schedule is a conservative infrastructure baseline, not a complete retailer refresh service. Establish a plan-compatible cadence or a reviewed external scheduler before relying on continuously fresh inventory; see [Inventory operations](INVENTORY.md).

Deploy an exact reviewed commit, verify the hosted entrypoint and build logs, and run [Release verification](RELEASE_VERIFICATION.md). Keep preview protection enabled. The frontend's server must be able to reach the API's selected production origin; a protected preview is not automatically a usable upstream. Change the frontend's server-only `API_URL` after that origin is verified, then test the exact production build before changing the public domain.

### Railway API (optional existing configuration)

Use the existing API service with repository root `/`, configuration file `/railway.json`, builder `DOCKERFILE`, and Dockerfile path `Dockerfile.backend`. The Docker build needs the complete repository context because its copy instructions read `server/package*.json`, `server/tsconfig.json` and `server/src`.

The final image runs from `/app` and contains `dist/` plus its production dependencies. Its start command is `node dist/index.js`, matching `railway.json` and the image's default command. Remove any inherited `cd server` start command: the runtime image has no `server/` subdirectory. Keep the healthcheck at `/api/health` and let Railway supply `PORT`.

```bash
docker build -f Dockerfile.backend -t dirty-apple-server .
```

Container production dependencies are locked and the backend process runs as the unprivileged `node` user. Docker image execution itself still requires validation in the deployment environment.

### Vercel frontend

Set the Vercel project's Root Directory to `frontend`. Its configuration lives in `frontend/vercel.json`: install with `npm ci`, build with `npm run build`, and use the default Next.js output `.next`. Clear inherited command overrides that prefix `cd frontend`, since commands already run inside that directory. The obsolete repository-root `vercel.json` has been removed; it caused Vercel to run `cd frontend` a second time after selecting the frontend root.

Preserve the existing frontend design, logo and editorial assets while restoring hosting. Provider configuration repairs do not require changes to the storefront's visual layout.

## Rollback

Deploy this branch to staging before production. Keep the prior deployment and database snapshot available. Roll back application code without dropping new fields or indexes; first confirm old code cannot re-expose unsecured inventory/order endpoints or the former shared cart. Direct checkout should remain disabled during a rollback assessment. Do not roll back the database blindly after new orders/imports exist.
