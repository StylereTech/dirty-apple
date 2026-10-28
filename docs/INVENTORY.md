# Retailer inventory operations

This guide describes implemented behavior. A supported retailer ID means the import system recognizes the source; it does not assert an approved feed connection or complete live coverage.

## Source strategy

| Retailer | ID | Verified official route | Collection status |
| --- | --- | --- | --- |
| Saks Fifth Avenue | `saks` | [Rakuten Advertising relationship](https://rakutenadvertising.com/resources/case-study-saks-and-collective-voice/) | Normalized feed import supported; bounded public JSON-LD adapter requires live validation. Feed entitlement is unverified. |
| Nordstrom | `nordstrom` | [Publisher application through Impact](https://www.nordstrom.com/browse/affiliate-program) | Normalized feed import supported; catalog access depends on approved account. |
| Bloomingdale's | `bloomingdales` | [Rakuten / Linkshare program](https://www.bloomingdales.com/b/about-us/affiliate-program-network-partner/) | Normalized feed import supported; product catalog approval required. |
| MR PORTER | `mrporter` | [Automated product feed and Partnerize application](https://www.mrporter.com/en-us/content/affiliates/) | Strong first feed candidate; no credentials or feed URL are configured by this change. |
| Neiman Marcus | `neiman` | Existing repository source | Normalized feed import supported; explicit public URL needed for collection. No feed connection verified. |
| Farfetch | `farfetch` | Existing repository source | Normalized feed import supported; explicit public URL needed for collection. No feed connection verified. |

Official source pages were checked during the October 27, 2026 audit (America/Chicago). Feed availability, program approval and refresh terms must be confirmed in the actual publisher account. [Rakuten Product Search](https://developers.rakutenadvertising.com/guides/product_search) is a paginated search API with a documented 5,000-result limit; that is not a complete-catalog export. [Rakuten Product Catalog](https://pubhelp.rakutenadvertising.com/hc/en-us/articles/10623933503373-Product-Links) and [Impact catalog downloads](https://help.impact.com/partner/what-would-you-like-to-learn-about/platform-features/marketing-content/product-marketplace-and-catalogs/download-product-catalogs-as-a-partner) are more suitable for large inventories when approved.

## Normalized offer contract

The current importer accepts normalized JSON. It does not guess vendor-specific CSV/XML mappings or access private network feeds. Map each provider's approved export into the following fields. A network's ability to provide a catalog does not prove that a particular advertiser/account has catalog access.

| Field | Required | Meaning |
| --- | --- | --- |
| `externalProductId` | Yes | Stable retailer product ID, not the item name. |
| `variantId` | When needed | Stable source variant ID when color/size pricing differs. |
| `name`, `brand` | Yes | Source product name and brand. |
| `category` | Recommended | Explicit source taxonomy; normalized to bags, shoes, clothing, accessories or kids. Unknown values become `other` and need review. |
| `gender` | Optional | `women`, `men`, `unisex` or `kids`, based on source information. |
| `originalPrice` | Yes | Explicit comparable regular price for the same offer, numeric USD amount. |
| `salePrice` | Yes | Current unconditional price for that same variant, numeric USD amount. |
| `currency` | Yes | Exactly `USD`; no implicit conversion. |
| `retailerUrl` | Yes | HTTPS product URL on the selected retailer's allowlisted host. |
| `images` | Yes | 1–12 public HTTPS product-image URLs from the source. Demo imagery is rejected. |
| `inStock` | Yes | Boolean based on observed availability. Missing stock is not assumed available. |
| `sizes` | Optional | Objects with `size` and explicit boolean `available`, only for variants at the represented price. |
| `colors` | Optional | Explicit color labels for this offer. |
| `observedAt` | Yes | ISO timestamp with timezone from the source observation. Accepted only within the last 7 days, with at most one minute of clock skew. |
| `description` | Optional | Source-supplied description the feed permits using. |
| `finalSale` | Optional | Boolean; shown on the product detail. |
| `promotion` | Optional | Additional offer conditions displayed separately; never applied silently to the base sale price. |

An item merely appearing on a sale page is insufficient evidence of a discount. Do not import a price range as one exact price, reuse the cheapest color's discount for all variants, subtract a gift-card reward, or present a coupon/member price as universally available. Conditional prices are rejected. New full-price or unavailable offers are skipped; updates to existing offers still record those conditions so they can leave the public catalog.

Example shape (replace all placeholders with verified source values; this is deliberately not a ready-to-publish product):

```json
{
  "externalProductId": "REPLACE_WITH_RETAILER_ID",
  "variantId": "REPLACE_WITH_VARIANT_ID_IF_NEEDED",
  "name": "REPLACE_WITH_PRODUCT_NAME",
  "brand": "REPLACE_WITH_BRAND",
  "category": "clothing",
  "gender": "men",
  "originalPrice": 200,
  "salePrice": 120,
  "currency": "USD",
  "retailerUrl": "https://www.mrporter.com/REPLACE_WITH_PRODUCT_PATH",
  "images": ["https://retailer-cdn.example/REPLACE_WITH_IMAGE"],
  "inStock": true,
  "sizes": [{ "size": "M", "available": true }],
  "observedAt": "REPLACE_WITH_SOURCE_ISO_TIMESTAMP"
}
```

## Review and publish

Open `/admin`, enter the server-configured administrator token, and choose **Imports**. Select the retailer, upload/paste the JSON array, then **Validate & preview**. Invalid rows prevent the batch from committing. **Import to inventory** creates drafts and refreshes existing identities.

In **Inventory**, filter by retailer/status or search name, brand or SKU. Set category and audience, inspect the source and price timestamp, and choose **Published**. Publishing an external offer requires fresh verification, a valid category, imagery, stock and an actual discount. Categories can be organized without manufacturing missing product facts.

Repeated imports identify an offer by retailer, source product and variant. Unique indexes enforce this identity. Refreshes preserve editorial publication decisions. A manually delisted product is not automatically re-published. The importer never deletes an entire retailer's catalog because a source returns a partial result or fails.

External listings use `purchaseMode: external`. Their price is the source offer price; no markup is added. They link to the retailer, and are rejected by dirtyApple cart and checkout. Affiliate link generation/commission reporting is not connected by this change; plain canonical retailer links remain usable.

## Freshness

`OFFER_MAX_AGE_HOURS` defaults to 24 and accepts 1–168. The public list, featured, deals, collection, ID and slug endpoints all apply the freshness rule. Stale external offers become invisible even when their stored editorial status remains active. Refresh failures never advance `lastVerifiedAt`.

Explicit full-price or sold-out feed refreshes remove offers immediately. The strict HTML collector omits non-discounted or ambiguous records; offers missing from its bounded sample remain subject to freshness expiry, not automatic catalog deletion.

Use the source's observation timestamp, not the time an old export was uploaded. Obtain and ingest source updates at a suitable cadence before public launch. The collection worker consumes queued jobs; its execution schedule does not create an automatic full-catalog feed subscription.

## Collection jobs

`POST /api/scrape` requires admin authentication and accepts:

```json
{ "retailer": "mrporter", "maxPages": 5 }
```

Optional `url` must belong to that retailer. Optional `category` is appropriate only for a source page limited to that category. `maxPages` is 1–10. Jobs persist in MongoDB, and a worker atomically claims one pending job per invocation. One active job per retailer is enforced by an index. Interrupted running jobs eventually fail visibly when their lease expires; they are not labeled completed.

The crawler uses an identifiable user agent, respects robots rules, validates DNS and redirects, restricts hosts, enforces request/body/time limits and request spacing, and stops on challenges, throttling or access failures. It extracts explicit Product/Offer JSON-LD. An empty or unverifiable response is a failure, not a successful scrape. It records warnings and partial coverage when a page budget is reached.

The public adapters have fixture coverage. Actual retailer markup compatibility must be verified against production source responses before relying on them. They do not promise all sale items, variants, pagination or stock coverage. Prefer complete approved feeds for large catalogs.

### Vercel execution

The API's Vercel project uses `GET /api/internal/inventory/run` to drain **one already queued job**. It does not enqueue sources, expand collection scope, publish new drafts, or operate as a feed subscription. The standalone process can still use `SCRAPE_WORKER_ENABLED=true`; no interval worker starts in a Vercel invocation.

Set the following server-only variables on the API project:

| Variable | Purpose |
| --- | --- |
| `CRON_SECRET` | Random secret of at least 32 characters, separate from `ADMIN_API_TOKEN`. Vercel supplies it in `Authorization: Bearer …` for cron requests. Missing/short secrets fail closed. |
| `INVENTORY_CRON_ENABLED` | Must be exactly `true` after the target MongoDB database and queue have been verified. Otherwise authenticated cron calls return 503 and do no work. |
| `SCRAPE_WORKER_ENABLED` | Set `false` on Vercel; use the awaited scheduler route instead. |

Only GET can start work; HEAD and other methods return 405. Unauthenticated requests return 401, responses are never cached, and database errors do not expose connection strings. The HTTP response is sent only after the worker finishes. `processed: false` means no queued job was available. `processed: true` means a job was claimed; inspect its persisted status and errors to determine whether the source collection succeeded.

Each invocation has at most a 240-second work budget inside a 300-second function limit. Connection and index startup time is included: work stops no later than 260 seconds after request entry, reserving 40 seconds for a bounded in-flight database operation and finalization. If startup leaves less than one second of work time, the endpoint returns 503 before claiming a job. The collector itself stops within 150 seconds. Imports stop between bounded database operations when the budget expires, retaining confirmed save counts. The lease includes an additional 60 seconds for finalization. A unique claim token prevents a late invocation from overwriting a recovered job, and lease ownership is checked again before any import begins. The next invocation marks expired running leases failed and releases the retailer lock. Retry through a new bounded queue job; there is no automatic replay of failed source requests. Stable offer identities and existing publication guards make already committed writes safe to refresh again.

The conservative schedule is `0 11 * * *` (11:00 UTC daily; 6 a.m. Dallas during daylight saving time and 5 a.m. during standard time). This respects a once-daily scheduler allowance while the hosting plan is verified. **One queued job per day is not a production catalog-refresh plan**, particularly with the default 24-hour freshness cutoff. Before relying on ongoing listings, connect approved feeds and set a cadence supported by the account and retailer terms that refreshes every active source before expiry. No promises of complete retailer inventory follow from this schedule. A queued job can be run sooner through the API project's authenticated Vercel Cron Jobs controls.

Official platform references: [securing and managing cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [cron usage limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), and [function duration limits](https://vercel.com/docs/functions/limitations).

## Bulk CLI

```bash
npm --prefix server run inventory:import -- --retailer mrporter --file /absolute/path/offers.json
npm --prefix server run inventory:import -- --retailer mrporter --file /absolute/path/offers.json --commit
```

Preview validates the entire file without connecting to MongoDB. `--commit` requires `MONGODB_URI`, initializes unique indexes, and processes up to 50,000 offers in batches of 500. Duplicate identities across batches are rejected. A database error can cause partial completion; the summary identifies failures, and the import can be retried idempotently. No automatic global deletion/reconciliation is performed.

## API reference

All endpoints below require `Authorization: Bearer <ADMIN_API_TOKEN>`:

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/inventory/retailers` | Supported source configuration, without claiming feed connectivity. |
| GET | `/api/inventory/products` | Paginated inventory including drafts/delisted items and status/staleness counts. |
| PATCH | `/api/inventory/products/:id` | Validated editorial category, gender, status, featured, collection and tags changes. |
| POST | `/api/inventory/import` | `{retailer, records, dryRun}`; defaults to preview. |
| POST | `/api/scrape` | Persist a bounded public collection job; returns 202. |
| GET | `/api/scrape/jobs` | Paginated import/collection history. |
| GET | `/api/scrape/jobs/:jobId` | Job state, counts and warnings/errors. |

The former synchronous `/api/scrape/run` route directs callers to the durable queue. Product deletion now delists records so references and history survive.
