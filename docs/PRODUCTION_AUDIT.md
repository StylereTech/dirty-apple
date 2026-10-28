# dirtyApple production audit and repairs

Audit date: October 27, 2026 (America/Chicago). Repository: `StylereTech/dirty-apple`. Starting commit: `881885f6e00674c438604457ea7b8cf2bd7832c6`. Work branch: `fix/production-inventory-audit`.

## Outcome and limits

This change repairs reproducible repository defects and adds a reviewed retailer-offer ingestion workflow. It prepares a testable release candidate. It does not certify the live site as production ready: the configured legacy API returned 404, live database/deployment access was not available, and retailer feed accounts are not connected.

No production catalog was erased, no real customer charge was made, and no live data import was published during this audit. Existing production inventory could not be enumerated through the broken API; the new admin tools provide the organization workflow once the deployment is connected.

## Findings addressed

| Severity | Finding in starting code | Repair |
| --- | --- | --- |
| Critical | Catalog mutations, scrape controls and customer order queries lacked authentication. | Constant-time administrator-token authentication; guest orders require an unguessable order token and matching browser session; admin order/payment mutations restricted. |
| Critical | Missing cart-session headers caused all visitors to use the shared `default` cart. | Browser UUID sessions, hashed persistent MongoDB carts, no anonymous shared fallback, optimistic concurrency. |
| Critical | Checkout accepted customer-supplied prices and could recreate orders on confirmation. | Server-loaded product prices, integer quantities and size/stock checks, durable idempotency keys, stored order snapshots, exact Stripe proof verification. |
| Critical | Unsigned webhooks were accepted and JSON parsing broke valid signature verification. | Required signature verification over original bytes; canonical and legacy webhook paths mounted before JSON middleware. |
| High | Success/retry/refund/cancellation handling could corrupt payment state or mislead customers. | Idempotent transitions, partial-refund handling, private order confirmation, processing recovery, guarded cart cleanup and pending-payment cancellation. |
| High | API started in a fictitious mock mode after database failure and reported healthy. | Fail-closed startup, required production configuration and indexes, truthful readiness checks and unavailable responses. |
| High | Frontend hardcoded a Railway backend that returned 404. | Configured server-side API proxy, required production `API_URL`, explicit retryable errors instead of silent empty inventories. |
| High | Scrapers returned empty successful results, fake stock or zero prices; Bloomingdale's was null and MR PORTER absent. | Bounded source collector, explicit JSON-LD offer parsing, retailer configuration and validated feed import. Empty/unverifiable collection fails visibly. |
| High | Retrying imports could duplicate products or overwrite editorial decisions. | Stable retailer/product/variant identities, unique indexes, reviewed drafts and concurrency-aware refreshes. |
| High | Discount logic could confuse source sale price with original price and add markup above the reference price. | Separate explicit regular/current prices, computed markdown, USD validation and no markup on external offers. |
| High | Old/unknown inventory could be advertised indefinitely. | Source observation timestamps and a shared freshness/publication filter on every public product route. |
| High | Demo seed script deleted the entire catalog and published fabricated example products. | Local demo-database-only opt-in, scoped demo cleanup and draft/demo markers; known legacy demo imagery hidden and non-purchasable. |
| High | Original dependencies included critical and high advisories. | Compatible package updates, patched transitive query/glob dependencies and removal of unused vulnerable UUID package. |
| Medium | Product error payloads could be interpreted as products; failed add/checkout calls could claim success. | Explicit status validation, cancellation of stale requests, loading/error/unavailable states and payment confirmation recovery. |
| Medium | Search/URL filters did not reset correctly; collections lacked usable pagination; category casing mismatched. | Shared validated catalog queries, literal search regexes, pagination limits/stable sorting, normalized categories and URL filter synchronization. |
| Medium | Admin products only showed public active records and orders were a placeholder. | Authenticated drafts/active/sold-out/delisted inventory, category/audience/status editing, JSON preview/import, job history and private order list. |
| Medium | Newsletter/placeholder contact links and delivery/authentication/returns claims exceeded implemented behavior. | Removed false submission success and unsupported claims; optional configured support address and accurate retailer purchase flow. |
| Medium | CI covered only frontend, used a different Node version and an obsolete lint command. | Backend/frontend matrix for type checks, tests, builds and dependency audits on Node 22; accurately named typecheck script. |

## Inventory behavior delivered

The admin flow supports source selection, JSON upload/paste, validation preview, draft import, category/audience organization, publication and delisting. It retains regular and sale prices, explicit source stock, images, variant identity, source URL, timestamp, optional final-sale information and promotion text.

New external offers are reviewed drafts. Repeated imports refresh the same identity rather than inventing new products. Manual delisting is preserved. Stale or unavailable offers disappear from public lists and product details. Failures never advance freshness timestamps or erase a retailer catalog. Product deletion is a reversible delist operation.

External products link to the retailer and cannot be charged through dirtyApple. The normalized bulk CLI validates up to 50,000 records and processes committed imports in bounded batches. It is not a vendor-specific raw feed adapter; actual export mapping requires the approved feed schema.

Public collection jobs are durable MongoDB records with atomic claims, per-retailer exclusivity, bounded page/time/body limits and explicit failure results. The collector observes robots rules, uses an identifying user agent and validates hosts, redirects and resolved public IP addresses. It does not bypass access challenges. Coverage is recorded as partial when limited; no complete-catalog claim is made.

## Live observations

- The repository's configured `https://dirty-apple-api-production.up.railway.app/api/health` and `/api/products?limit=1` both returned HTTP 404 during read-only checks.
- An ordinary public HTTP read of [this MR PORTER AURALEE product](https://www.mrporter.com/en-us/mens/product/auralee/clothing/blousons/wool-canvas-blouson-jacket/46376663162971221) was allowed by its retrieved robots rules. Raw HTML contained explicit structured prices and variants. The parser extracted and normalized three records, with one size in stock and two out of stock. This verifies one product page, not a complete source catalog.
- Nordstrom's `/browse/sale` and Bloomingdale's `/shop/sale?id=3977` returned accessible HTML in bounded reads. Their landing-page JSON-LD did not yield Product records for the parser. Product-detail discovery or approved feeds are still required.
- The production collector's direct DNS-pinned request failed locally with an environment DNS error before HTTP. The separate normal-transport HTML probe validates parsing, not deployed crawler network connectivity.
- Official MR PORTER documentation offers an automated affiliate product feed; Nordstrom links publisher applications to Impact; Bloomingdale's points to Rakuten/Linkshare. Saks' Rakuten relationship is documented, but dirtyApple's actual approvals/feed entitlements remain unverified. See [source evidence](INVENTORY.md#source-strategy).

## Verification

The final local backend run passed **58 test entries**, including ten isolated MongoDB integration cases, with zero failures/skips. The frontend passed **28 tests across seven files**. The TypeScript backend build and Next.js production build passed. Both npm dependency audits reported **zero known vulnerabilities** after lockfile updates. `git diff --check` passed. These checks ran on Node 24.22.1 in this workspace; CI is configured for Node 22 and its result is recorded separately in the pull request.

The [real-source MR PORTER draft batch](../data/retailer-offer-drafts-2026-10-27/mrporter.json) passed the CLI preview: 3 records, 1 in-stock sale offer, 0 invalid records, no database writes. See its [source notes](../data/retailer-offer-drafts-2026-10-27/README.md) for provenance and expiry.

Checks cover frontend error/cart/checkout flows, backend authorization/payment/webhook regression, catalog input validation, collector fixtures and isolated MongoDB inventory integration. Offline Stripe mocks and local MongoDB tests do not prove live payment delivery, production database availability or source-account access.

The current tracked tree was also scanned for common live Stripe-key, AWS access-key and private-key patterns without printing credential values. No matches were found in that narrow scan. It is not a full historical secret audit.

## Remaining release gates

1. **Restore/connect the production API and database.** Supply the actual working backend/deployment connection and frontend origin, then configure `API_URL`, MongoDB and administrator access. The old 404 endpoint cannot be fixed by frontend fallback logic.
2. **Inspect and organize real production inventory.** Its current contents are unknown because the API was unavailable. Review legacy duplicates before creating unique indexes and do not run destructive seed scripts against production.
3. **Connect retailer data access.** Confirm approved feed accounts, map real exports, establish refresh cadence and validate product images, prices, availability and coverage. One successfully parsed product does not establish all-sale coverage.
4. **Run staging end-to-end checks.** Exercise imported drafts through publish, browse, filtering, source links, stale expiry and failed refreshes on the real deployment network.
5. **Keep direct checkout disabled until fulfillment is ready.** Taxes, stock reservation, order emails and operational fulfillment/refund handling remain business/runtime work. The code's simple shipping and zero-tax quotation is not a complete production tax implementation.
6. **Configure operational hosting.** Public domain/HTTPS, backups, runtime logs, failure alerts, source refresh monitoring and access management need verification in the host environment.

See [deployment steps](DEPLOYMENT.md) and [inventory operations](INVENTORY.md). These gates are explicit remaining work, not claims that the site is already launched or its entire retailer catalog is live.
