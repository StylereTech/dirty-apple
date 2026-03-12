# Dirty Apple AI Bulk Inventory Upload (MVP + Phase 2)

## 1) Feature Spec

### Problem
Vendor onboarding friction is high when inventory must be entered manually. Dirty Apple needs a fast, reliable path to convert heterogeneous CSVs into compliant marketplace listings.

### Goal
Allow authorized vendors to upload a CSV and generate draft listings in bulk, while preserving marketplace quality through strict validation and policy enforcement.

### Success metrics
- Time-to-first-listing reduced from hours to minutes.
- % of uploaded rows imported as drafts (valid row rate).
- Vendor activation uplift for new vendor accounts.
- Reduction in admin moderation back-and-forth due to cleaner data.

### Non-goals (MVP)
- No direct auto-publish from import.
- No Shopify/WooCommerce ingestion in MVP.
- No destructive overwrite of existing listings without explicit vendor confirmation.

---

## 2) Backend Architecture

### High-level components
1. **Import API** (Express route)
   - Accepts CSV upload.
   - Authenticates vendor + verifies authorization state.
   - Creates an `ImportJob` record.

2. **CSV Parser Service**
   - Streams CSV rows into normalized raw row objects.
   - Captures parse issues (invalid encoding, malformed rows).

3. **Mapping Engine**
   - Rule-based header matcher (exact/synonym/fuzzy).
   - Optional AI mapper for ambiguous headers.
   - Produces column-to-field mapping confidence scores.

4. **Validation & Normalization Engine**
   - Required-field checks.
   - Type and business-rule enforcement.
   - Normalizes values (price format, brand casing, category mapping, size canonicalization).

5. **Draft Listing Writer**
   - Creates `Product` entries in `draft` state for valid rows.
   - Stores import provenance per row.

6. **Error Reporter**
   - Stores row-level warnings/errors.
   - Generates downloadable error CSV.

7. **Policy Guard Layer**
   - Listing cap checks.
   - Vendor status/authorization checks.
   - Duplicate SKU conflict handling.

### Suggested backend flow
`POST /vendor/imports` → create upload + inferred mapping preview  
`POST /vendor/imports/:id/mapping/confirm` → persist mapping  
`POST /vendor/imports/:id/validate` → validate + optional AI enrichment suggestions  
`POST /vendor/imports/:id/commit` → create draft products from valid rows  
`GET /vendor/imports/:id` → status/summary  
`GET /vendor/imports/:id/errors.csv` → downloadable row-level issues

---

## 3) CSV Parsing and Validation Flow

### Parsing
1. Receive CSV file and detect delimiter/encoding.
2. Parse headers and first N rows for preview.
3. Normalize headers (trim, lowercase, symbol cleanup).
4. Maintain row index to preserve deterministic error reporting.

### Validation stages
1. **Schema presence checks**
   - Required mapped fields exist: title, description, price, sku, inventoryQty, imageUrl, category, brand, variant/size (if applicable).
2. **Data type checks**
   - price numeric >= 0.
   - inventory quantity integer >= 0.
   - URLs parse as valid http/https.
3. **Business rules**
   - category allowed in Dirty Apple taxonomy.
   - prohibited content terms.
   - duplicate SKU detection (within file and against vendor catalog).
   - listing cap availability before commit.
4. **Normalization**
   - currency/price formatting.
   - brand/title case cleanup.
   - category alias resolution.
   - size token standardization.
5. **Outcome classification**
   - `valid`: importable.
   - `warning`: importable but flagged.
   - `blocking_error`: cannot import until fixed.

---

## 4) AI Mapping + Enrichment Design

### AI usage principles
- AI is **assistive** and never the source of truth.
- Rules and deterministic validators remain authoritative.

### AI-assisted mapping
Inputs:
- Header names.
- Sample row values.
- Dirty Apple canonical field dictionary.

Outputs:
- Suggested mapping with confidence.
- Reasons (e.g., “column values look like currency”).
- Ambiguity flags requiring manual confirmation.

### AI-assisted enrichment (optional toggle)
- Title cleanup (format consistency).
- Description cleanup.
- Brand/category suggestion where unmapped/unknown.
- Tag suggestion.

### Guardrails
- No AI-only pass that bypasses validators.
- Enrichment stored as suggested value + original value.
- Vendor can accept/reject batch suggestions.

---

## 5) Vendor UI Flow

### A. Upload
- Drag/drop or file picker.
- Display file name, size, detected row count.

### B. Mapping screen
- Show detected headers and suggested Dirty Apple fields.
- Confidence badges.
- Manual override dropdown per column.
- Save mapping template option.

### C. Validation screen
- Summary cards: valid rows, warnings, blocking errors.
- Row table with inline error reasons.
- Filter by issue type.
- Download errors CSV.

### D. Enrichment review (optional)
- Show before/after suggestions.
- Apply selected suggestions in bulk.

### E. Commit to drafts
- Explicit CTA: “Create Draft Listings”.
- Display projected listing cap usage.
- Confirmation modal for potential updates/conflicts.

### F. Import summary
- Count created drafts, skipped rows, errored rows.
- Link to drafts list and import history.

---

## 6) Error Handling Model

### Error classes
- `FILE_PARSE_ERROR`: malformed CSV/encoding/delimiter.
- `MAPPING_ERROR`: required field unmapped.
- `ROW_VALIDATION_ERROR`: row-level blocking issue.
- `ROW_WARNING`: row-level non-blocking issue.
- `POLICY_ERROR`: listing cap exceeded / unauthorized vendor.
- `CONFLICT_ERROR`: duplicate SKU/update conflict.

### Response structure (example)
```json
{
  "importId": "imp_123",
  "status": "validated",
  "summary": {
    "totalRows": 120,
    "validRows": 94,
    "warningRows": 14,
    "errorRows": 12
  },
  "rowIssues": [
    {
      "row": 18,
      "severity": "error",
      "code": "INVALID_PRICE",
      "field": "price",
      "message": "Price must be a non-negative number"
    }
  ]
}
```

### Operational behavior
- Fail fast for file-level fatal parse errors.
- Continue row-level validation even when some rows fail.
- Persist all issue diagnostics for auditability.

---

## 7) Data Model Changes

### New collections (recommended)
1. **ImportJob**
   - `_id`, `vendorId`, `status`, `sourceFile`, `mapping`, `summary`, `createdAt`, `completedAt`.
2. **ImportRowResult**
   - `importJobId`, `rowNumber`, `rawData`, `normalizedData`, `issues[]`, `resolvedState`.
3. **ImportTemplate** (optional MVP, useful early)
   - `vendorId`, `name`, `mapping`, `createdAt`, `lastUsedAt`.

### Product model extension
- `importMetadata` object:
  - `importJobId`
  - `sourceRow`
  - `importVersion`

### Vendor model extension (if missing)
- `authorizationState` (`pending`, `approved`, `suspended`)
- `listingCap` (integer)
- `listingCount` (derived or stored)

---

## 8) MVP vs Phase 2 Scope

### MVP (build now)
- CSV upload.
- Auto column mapping (rules-first).
- Manual mapping override.
- Deterministic row validation.
- Draft listing creation for valid rows.
- Row-level error reporting + downloadable error CSV.
- Listing cap and vendor authorization enforcement.
- Import summary + history.

### Phase 2
- AI mapping fallback for low-confidence columns.
- AI title/description cleanup suggestions.
- Category inference + confidence display.
- Re-import update mode (upsert with explicit user confirmation).
- Duplicate detection enhancements.

### Phase 3
- Shopify/WooCommerce connectors.
- Google Sheets import.
- ERP mapping presets.
- Native image ingestion pipeline (fetch/verify/store assets).

---

## 9) Final Implementation Plan

### Sprint 1: Foundation
- Add `ImportJob` and `ImportRowResult` models.
- Build upload endpoint and streaming CSV parser.
- Implement rule-based mapping + mapping UI contract.
- Add validation engine with required fields + core business rules.

### Sprint 2: Commit pipeline + UX wiring
- Implement commit endpoint for draft product creation.
- Add policy guards for vendor state and listing caps.
- Build row issue reporting and error CSV export endpoint.
- Add import summary endpoint.

### Sprint 3: Hardening
- Add idempotency keys for commit.
- Add retry-safe job states.
- Add import history pagination.
- Add observability (timings, row validation metrics, error code frequencies).

### Sprint 4: AI assist (Phase 2 start)
- Introduce AI mapping suggestion service behind feature flag.
- Add enrichment suggestion payloads and vendor accept/reject workflow.
- Maintain strict validator gate before draft creation.

### Rollout strategy
1. Internal admin-only beta with sample datasets.
2. 5–10 vendors in controlled beta.
3. General availability after quality and moderation metrics meet thresholds.

### Acceptance criteria (MVP)
- Vendor can import a CSV and produce draft listings in one workflow.
- All blocking errors are row-specific and downloadable.
- Invalid rows never create live listings.
- Listing caps and authorization rules are always enforced.
- Import summaries are persisted and viewable in history.
