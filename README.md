# dirtyApple

A fashion sale discovery storefront with a reviewed retailer-offer catalog, inventory administration, and a separately gated direct-checkout path.

## Current status

The repository contains the storefront, Express API, MongoDB models, validated feed import, bounded public-page collector, and tests. Production requires a working API/database deployment and verified retailer data access. Import support does not mean an affiliate feed is connected or a retailer's complete catalog has been collected.

See [production audit](docs/PRODUCTION_AUDIT.md), [inventory operations](docs/INVENTORY.md), and [deployment guide](docs/DEPLOYMENT.md).

## Development

Use Node.js 22.13+ (Node 22 in CI/containers) and MongoDB.

```bash
cd server
npm ci
cp .env.example .env
# Configure MONGODB_URI and a unique ADMIN_API_TOKEN of at least 32 characters.
npm run dev
```

In another terminal:

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Visit `http://localhost:3000`, then `/admin` to organize inventory. The administrator token stays in tab memory. It is never a `NEXT_PUBLIC_*` variable.

## Verification

```bash
npm --prefix server test
npm --prefix server run test:integration
npm --prefix server run build
npm --prefix frontend run test:run
npm --prefix frontend run typecheck
npm --prefix frontend run build
npm --prefix server audit --audit-level=high
npm --prefix frontend audit --audit-level=high
```

The database integration test starts disposable local MongoDB through `mongodb-memory-server`; first execution downloads a MongoDB test binary. Tests do not use production database credentials or send Stripe charges.

## Inventory

1. Obtain a retailer's approved product feed, or queue a bounded public collection in `/admin`.
2. Map source columns to the [normalized offer contract](docs/INVENTORY.md#normalized-offer-contract).
3. Validate and preview; import new offers as drafts.
4. Review category, audience, source price, availability, imagery and source URL, then publish.
5. Refresh source data regularly. External listings with stale verification, unavailable stock, or no active discount are excluded from public catalog endpoints.

CLI preview (does not write to MongoDB):

```bash
npm --prefix server run inventory:import -- --retailer mrporter --file /absolute/path/offers.json
```

Add `--commit` only after reviewing the preview. It imports drafts and safely refreshes existing records, in batches of 500. This command requires `MONGODB_URI`.

## Purchases

External retailer offers send customers to the retailer. Dirty Apple does not charge for those purchases. Direct checkout is disabled by default. Enable it only after the operational requirements in [deployment](docs/DEPLOYMENT.md#direct-checkout) are fulfilled.

## Deployment

- Frontend: Next.js 16, React 18, Tailwind CSS. Set server-side `API_URL` to the working API origin; `/api/*` is proxied without caching. Missing production configuration produces a clear 503.
- Backend: Express, TypeScript, Mongoose and Stripe. Set `MONGODB_URI`, `APP_URL`/`CORS_ORIGINS` and `ADMIN_API_TOKEN`.
- Railway and Vercel build settings use committed lockfiles.

```bash
docker build -f Dockerfile.backend -t dirty-apple-server .
docker run --env-file server/.env -p 4000:4000 dirty-apple-server
```

The API starts only after MongoDB and required unique indexes are ready. `/api/health` reflects database readiness. See the deployment guide before applying changes to an existing database.

## Historical design documents

`ARCHITECTURE.md` and `AI_BULK_INVENTORY_UPLOAD_SPEC.md` are planning documents. Implemented runtime behavior is described by the guides above. The older charge-then-affiliate-redirect flow is not supported.
