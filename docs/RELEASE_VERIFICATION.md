# Release verification

Run these checks against the exact deployment under review before moving the public domain. The automated smoke script only issues GET requests; it does not create orders, alter carts, import products, start collection jobs, or charge payments.

```bash
node scripts/verify-release.mjs --frontend https://FRONTEND_ORIGIN --api https://API_ORIGIN
```

Both origins must identify the intended dirtyApple release. They must use HTTPS except for explicitly selected localhost servers. The script fails if the production catalog is empty. `--allow-empty` checks infrastructure during staging only and is not evidence that inventory is launch ready.

For protected deployments, supply the approved frontend and API automation bypass secrets through `VERCEL_AUTOMATION_BYPASS_SECRET` and `VERCEL_API_AUTOMATION_BYPASS_SECRET`, respectively. The script never follows redirects with those credentials. Do not pass secrets in command arguments or commit them. Optional `LIVE_ADMIN_TOKEN` adds authenticated inventory reads without fetching customer orders. Match `OFFER_MAX_AGE_HOURS` to the API configuration when it differs from the 24-hour default.

The JSON report includes check outcomes and aggregate product counts, without credentials, customer data or fetched response bodies. It confirms:

- Frontend page responses and the original logo, hero, category and editorial assets.
- Database readiness through the direct API and the frontend's same-origin proxy.
- Matching catalog IDs/prices between the two endpoints when `--api` is supplied.
- Active, non-demo public products and current, in-stock discounted external offers.
- Product detail availability, invalid query handling and genuine missing-route responses.
- Rejection of unauthenticated inventory, job and order administration.
- Private empty carts for two newly generated visitor sessions, without creating cart documents.

The script validates a maximum of 100 public records. It does not certify an entire retailer catalog. Counts and catalog parity assume no simultaneous publishing operation during the check.

## Live browser checks

Use a desktop and mobile viewport on the exact tested build. Retain the original storefront design. Inspect the browser console and failed network requests while checking the home page, shop filters, a category collection, a published product and the administrator login. A page returning HTTP 200 is not sufficient evidence that its browser JavaScript and API requests work.

For a real current external offer, verify the displayed regular/sale prices and selected variant against the retailer, then follow the retailer destination. It must remain a retailer purchase flow. Check that unavailable or expired offers disappear and that the refreshed offer keeps its editorial publication state. Use a reviewed permitted source; no fabricated inventory or relabeled stale timestamps.

Inspect the existing MongoDB deployment before adding unique indexes or combining data. This application uses a single `MONGODB_URI` and shared Mongoose models for products, price history, carts, orders and collection jobs. Multiple collections already participate in one inventory flow. There is no repository-defined multi-database merge. If the account contains other databases, identify the dirtyApple-owned records and resolve identity conflicts deliberately, with backups, before any migration.

Keep direct checkout disabled for the retailer-link release. Enabling it requires separately verified fulfillment, inventory reservation, tax handling, support and Stripe test-mode payment/webhook/refund checks.

## Domain cutover

After the exact production build passes API, data and browser checks, update the intended domain's web records in GoDaddy to Vercel's currently supplied values. Preserve email, verification and unrelated DNS records. Verify the public apex and `www` behavior, the HTTPS certificate, canonical redirects and the same API/inventory checks through the final domain. Record the deployment commit, domain, timestamp and any unresolved failures in the release report.
