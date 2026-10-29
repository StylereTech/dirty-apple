# MR PORTER observed sale-offer draft

This file contains **normalized import inputs** from one real, publicly accessible MR PORTER product page. It is a reviewable sample, not an inventory-completeness claim or a production import.

## Source and observation

- Canonical product: [AURALEE Wool-Canvas Blouson Jacket](https://www.mrporter.com/en-us/mens/product/auralee/clothing/blousons/wool-canvas-blouson-jacket/46376663162971221).
- Robots source: [MR PORTER robots.txt](https://www.mrporter.com/robots.txt).
- Product request started at **2026-10-28T04:12:26.319708+00:00** (October 27, 2026, 11:12:26 p.m. America/Chicago). Each record preserves this observation timestamp; it has not been replaced with an import or file-creation time.
- User agent: `DirtyAppleBot/1.0`. Robots and product requests both returned HTTP 200. The robot rules permitted this product path for that user agent. Ordinary public requests used the environment's normal transport, a 20-second timeout and a 2 MiB response cap.
- The product response was 597,974 bytes and contained one JSON-LD script. The current `extractJsonLdOffers` implementation returned three records, zero warnings; all three passed `normalizeOffer`.

## Observed variants

| Source SKU / externalProductId | Size | Color | Reference price | Sale price | Discount | Observed stock |
|---|---|---|---:|---:|---:|---|
| `0400668268178` | 3 | Beige | USD 1,220.00 | USD 732.00 | 40% | In stock |
| `0400668267256` | 4 | Beige | USD 1,220.00 | USD 732.00 | 40% | Out of stock |
| `0400668268383` | 5 | Beige | USD 1,220.00 | USD 732.00 | 40% | Out of stock |

These are three variants of **one product**, with **one in-stock sale offer** at observation. Each source SKU already identifies its size variant. `externalProductId` preserves that exact SKU, including its leading zero, and `variantId` is explicitly empty to retain the same stable identities as the crawler. A later refresh through the parser therefore targets the same offers instead of creating duplicates under a different parent/variant identity scheme.

`category: clothing` is supported by the observed canonical `/clothing/blousons/` URL. `gender: men` is supported both by its `/mens/` path and the source ProductGroup's explicit `PeopleAudience.suggestedGender: male`. The six image URLs, colors, sizes, availability and comparable USD prices come from the source's structured product data. No product description or raw HTML is committed.

## Preview and review

From the repository root, run the existing importer in its default preview mode:

```bash
cd server
npm run inventory:import -- --retailer mrporter --file ../data/retailer-offer-drafts-2026-10-27/mrporter.json
```

The intended result at the observation date is three valid records and one in-stock sale offer. Preview does not connect to or write a production database. No production import, product publication or real purchase was performed for this sample.

Refresh prices, stock, images and source access before use. Public external offers must be within the configured `OFFER_MAX_AGE_HOURS` freshness window (default 24 hours) and pass review before publication; importing the old file must not reset the observation time. The import validator also rejects observations older than seven days, so this dated evidence sample will intentionally stop passing a current-date preview without a real source refresh. Do not relabel old facts with a new timestamp to make them pass.

No affiliate account is connected by this sample, and there is no affiliate tracking URL. Any eventual published link goes to the canonical retailer product page; payment, shipping and returns for an external offer occur with the retailer. This check validates only the single linked product page and does not establish complete MR PORTER sale coverage or the production collector's network configuration.
