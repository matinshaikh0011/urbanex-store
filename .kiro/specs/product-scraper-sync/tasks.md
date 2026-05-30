# Implementation Plan: Advanced Product Scraper and Manual Sync System

## Overview

Implement a provider-based product scraper and manual sync system for the Urbanex admin dashboard. The work is split into five logical groups: database schema changes, backend infrastructure (provider architecture + shared utilities), backend API endpoints, frontend scraper wizard page, and admin dashboard integration. Each group builds on the previous, ending with the fully wired UI.

---

## Tasks

- [x] 1. Database schema migrations and Prisma client update
  - [x] 1.1 Extend `Product` model and add `BrandMapping` model in `backend/prisma/schema.prisma`
    - Add nullable fields `source String?`, `sourceId String?`, `lastSync DateTime?`, and `sourceUrl String?` to the `Product` model
    - Add `@@unique([source, sourceId])` composite constraint to `Product`
    - Add `brandMappings BrandMapping[]` reverse relation to the `Brand` model
    - Create the new `BrandMapping` model with fields: `id`, `provider`, `supplierBrandName`, `brandId`, `brand` relation, `createdAt`, and `@@unique([provider, supplierBrandName])`
    - _Requirements: 9.1, 9.2, 9.3, 9.6, 9.7, 5.7_

  - [x] 1.2 Add `ImportHistory` model in `backend/prisma/schema.prisma`
    - Create the `ImportHistory` model with fields: `id`, `source`, `sourceUrl`, `importedAt`, `totalScraped`, `successCount`, `failureCount`, `skippedCount`, `updatedCount`, `log Json?`, `createdAt`
    - _Requirements: 11.1, 11.2_

  - [x] 1.3 Run Prisma migrations and regenerate client
    - Run `npx prisma migrate dev --name add_product_source_tracking` from `backend/` to apply schema changes from task 1.1
    - Run `npx prisma migrate dev --name add_import_history` from `backend/` to apply schema changes from task 1.2
    - Run `npx prisma generate` to regenerate the Prisma client
    - _Requirements: 9.6, 9.7, 11.2_

- [x] 2. Backend shared utilities and provider architecture
  - [x] 2.1 Install backend dependencies
    - Run `npm install axios cheerio` from the `backend/` directory
    - Verify both packages appear in `backend/package.json` dependencies
    - _Requirements: 2.1_

  - [x] 2.2 Create `backend/src/productUtils.js` with shared validation and build helpers
    - Implement `validateProductData(data)` — validates `name`, `slug` (regex `/^[a-z0-9-]+$/`), `price` (positive number), `brandId` (positive integer), `category` (valid slug), and the `source`/`sourceId` co-presence rule
    - Implement `buildProductData(data)` — normalises types and returns a Prisma-compatible data object including the new `source`, `sourceId`, `lastSync`, and `sourceUrl` fields
    - Export both functions as named exports
    - _Requirements: 10.3_

  - [x] 2.3 Refactor existing `POST /api/products` and `PUT /api/products/:id` in `backend/src/index.js` to use `productUtils.js`
    - Import `validateProductData` and `buildProductData` from `./productUtils.js`
    - Replace inline validation and data construction in both endpoints with calls to these shared functions
    - Ensure existing behaviour is preserved (same request/response shapes)
    - _Requirements: 10.3_

  - [x]* 2.4 Write unit tests for `validateProductData` and `buildProductData`
    - Test that `validateProductData` rejects missing name, invalid slug, non-positive price, missing brandId, invalid category, and mismatched source/sourceId
    - Test that `buildProductData` correctly coerces types, applies null defaults, and includes all new fields
    - _Requirements: 10.3, 9.4_

  - [x] 2.5 Create the provider registry at `backend/src/scrapers/index.js`
    - Import all four providers (cartpe, selloship, shopify, woocommerce)
    - Export `getProvider(key)` — returns the provider or throws with a message identifying the unsupported key and listing available keys
    - Export `detectProvider(url)` — returns `'cartpe'` for URLs matching `/cartpe\.in/i`, `'selloship'` for `/selloship\.com/i`, or `null` otherwise
    - Export the `providers` map as the default export
    - _Requirements: 1.1, 1.2_

  - [x] 2.6 Create stub providers for Selloship, Shopify, and WooCommerce
    - Create `backend/src/scrapers/selloshipProvider.js`, `shopifyProvider.js`, and `woocommerceProvider.js`
    - Each stub exports a default object with `name`, `displayName`, `supportedScopes: []`, and three methods (`scrape`, `syncProduct`, `extractBrand`) that each throw `new Error('<Provider> provider is not yet implemented')`
    - _Requirements: 1.4_

  - [x] 2.7 Create `backend/src/scrapers/cartpeProvider.js` — core scraping logic
    - Define constants: `BASE`, `LOADMORE_URL`, `WEB_TOKEN`, `UA`
    - Implement `idFromUrl(url)` — extracts sourceId using the pattern `-((?:npi|lpi)?\d{6,})-urbanex\.html`
    - Implement `sleep(ms)` — delays with ±20% jitter
    - Implement `parseDetail(html, url)` using cheerio — extracts `name`, `price`, `originalPrice`, `images` (max 20, deduplicated), `sizes`, `inStock`, `sourceId`
    - Implement `collectProductUrls(options)` — POSTs to `LOADMORE_URL` with incrementing offset (24 per page), deduplicates by sourceId, stops when a page returns 0 new links
    - Implement `extractBrand(productData)` — uses the `BRAND_KEYWORDS` regex table from the existing `backend/src/scraper.js`
    - Implement the CartPe category mapping table (watch/clothing/shoes/glasses/bags/etc.) as a helper function
    - _Requirements: 1.3, 2.1, 2.2, 2.3, 1.5_

  - [x] 2.8 Implement `scrape(url, scope, options)` and `syncProduct(sourceId, sourceUrl)` on the CartPe provider
    - `scrape`: dispatches to `collectProductUrls` + detail fetching for `full`/`category` scope, or direct detail fetch for `product` scope; applies `delayMs` (default 500ms, clamped 100–10000ms) between requests; on individual product failure logs and skips; on initial URL failure throws immediately
    - `syncProduct`: fetches the product detail page using `sourceUrl` (or reconstructed URL from `sourceId`); returns a `SyncResult` with `notFound: true` on 404, otherwise returns current price/stock/name/images
    - _Requirements: 1.3, 1.5, 2.1, 2.2, 2.4, 2.5, 2.6, 12.2_

  - [x]* 2.9 Write unit tests for CartPe provider utilities
    - Test `idFromUrl` with npi-prefixed, lpi-prefixed, and bare numeric IDs, and with non-matching URLs
    - Test `sleep` completes within the expected jitter range
    - Test the category mapping function covers all table entries and falls back to `clothing`
    - Test `extractBrand` returns correct brand names for known keyword patterns
    - _Requirements: 2.3, 1.3_

- [x] 3. Checkpoint — verify backend foundation
  - Ensure all unit tests pass, the Prisma client generates without errors, and the provider registry resolves correctly. Ask the user if any questions arise.

- [x] 4. Backend API endpoints
  - [x] 4.1 Add `POST /api/admin/scraper/scan` to `backend/src/index.js`
    - Validate `url` (required, parseable), `scope` (required, one of `full`/`category`/`product`), and optional `provider` (must exist in registry if provided; auto-detected via `detectProvider` if omitted — 400 if detection fails)
    - Call `provider.scrape(url, scope, { delayMs })`
    - For each ScrapedProduct run duplicate detection: check `source+sourceId` → `already-imported`; then `slug` → `slug-duplicate`; then case-insensitive name → `possible-duplicate`; else `new`
    - Pre-populate `suggestedCategory` and `suggestedSubcategory` using the CartPe category mapping
    - Return `{ provider, products, stats }` on success; 400 on validation failure; 502 if initial URL is unreachable
    - _Requirements: 13.1, 13.2, 2.1, 3.1, 3.2, 3.3, 3.4, 3.5, 6.1_

  - [x] 4.2 Add `POST /api/admin/scraper/import` to `backend/src/index.js`
    - Validate: `products` non-empty array (400 if not), `source` and `sourceUrl` present (400 if not), `imageMode` defaults to `'cloudinary'`
    - Phase 1 — pre-validation: call `validateProductData` on each product; partition into `validProducts`, `failedProducts`, `skippedProducts` (brandId === `'no-brand'`)
    - Phase 2 — image handling (outside transaction): for `cloudinary` mode download each image and POST to Cloudinary REST API; on failure fall back to supplier URL and log; for `supplier-url` mode keep URLs as-is
    - Phase 3 — `prisma.$transaction()`: for each valid product upsert by `source+sourceId` (update if exists, create otherwise); set `lastSync = new Date()`
    - Phase 4 — create `ImportHistory` record outside the transaction (even if transaction threw)
    - Return `{ successCount, updatedCount, failureCount, skippedCount, historyId, log }`
    - _Requirements: 10.1, 10.2, 10.4, 10.5, 10.6, 10.8, 10.9, 10.10, 10.11, 8.1, 8.2, 8.3, 8.4, 13.3_

  - [x] 4.3 Add `POST /api/admin/scraper/sync/:id` to `backend/src/index.js`
    - Look up product by integer id (404 if not found); 400 if `product.source` is null
    - Call `provider.syncProduct(product.sourceId, product.sourceUrl)`
    - If `result.notFound`: set `inStock = false`, update `lastSync`
    - Otherwise: update `price`, `originalPrice`, `inStock`, `lastSync`; optionally update `name`, `description`, `images` if `req.body.syncName/syncDescription/syncImages` flags are set
    - Return updated product object
    - _Requirements: 13.1, 12.2, 12.3, 12.4_

  - [x] 4.4 Add history and brand-mapping endpoints to `backend/src/index.js`
    - `GET /api/admin/scraper/history` — paginated list (`page`, `limit` params; max 100); excludes `log` field from list response
    - `GET /api/admin/scraper/history/:id` — single record with full `log`; 404 if not found
    - `DELETE /api/admin/scraper/history/:id` — deletes record; 404 if not found
    - `GET /api/admin/scraper/brand-mappings` — all records, optional `?provider=` filter, includes `brand` relation
    - `POST /api/admin/scraper/brand-mappings` — upsert on `[provider, supplierBrandName]`; 400 if any required field missing; returns 201
    - _Requirements: 13.1, 11.3, 11.4, 5.7_

  - [x]* 4.5 Write integration tests for scraper API endpoints
    - Test `POST /api/admin/scraper/scan` returns 400 for missing URL, missing scope, and unknown provider
    - Test `POST /api/admin/scraper/import` returns 400 for empty products array and missing source
    - Test `POST /api/admin/scraper/sync/:id` returns 404 for unknown id and 400 for product with no source
    - Test all endpoints return 401 without a valid auth cookie
    - _Requirements: 13.2, 13.3, 13.4_

- [x] 5. Checkpoint — verify all backend endpoints
  - Ensure all API endpoints respond correctly to valid and invalid inputs, and that the import flow creates `ImportHistory` records. Ask the user if any questions arise.

- [x] 6. Frontend scraper page — foundation and types
  - [x] 6.1 Create `frontend/src/app/admin/scraper/page.tsx` with page scaffold and shared utilities
    - Create the file with `'use client'` directive
    - Copy `useToast` hook and `api` helper verbatim from `frontend/src/app/admin/page.tsx`
    - Define all TypeScript interfaces: `ScrapedProduct`, `PricingMode`, `PricingRule`, `ScraperState`, `ImportHistory`
    - Implement `calculatePrice(sourcePrice, rule, rounding, manualOverride?)` pricing engine function
    - Implement `similarity(a, b)` Levenshtein-based fuzzy match function for brand resolution
    - Initialise `ScraperPage` component with `useState<ScraperState>` and `activeTab` state
    - _Requirements: 14.2, 14.4, 7.2, 7.3, 7.4, 15.1_

  - [x] 6.2 Create `frontend/src/app/admin/scraper/page.module.css`
    - Add stepper styles: `.stepper`, `.stepItem`, `.stepActive`, `.stepDone`
    - Add duplicate badge styles: `.badgeNew`, `.badgeDuplicate`, `.badgeSlugDuplicate`, `.badgePossible`
    - Add price preview styles: `.pricePreview`, `.priceOriginal`
    - Add sync status styles: `.statusConnected`, `.statusNotFound`
    - Add `.inlineWarning` style
    - Import and extend the existing admin design tokens (dark theme, Oswald font, red accent)
    - _Requirements: 14.2_

- [x] 7. Frontend scraper wizard — step components
  - [x] 7.1 Implement `ScannerStep` (Step 1)
    - URL text input (full width), scope dropdown (`full`/`category`/`product`), optional delay input
    - "SCAN" button calls `POST /api/admin/scraper/scan`; shows progress bar during scan (hidden otherwise)
    - On success: advances to step 2, populates `scannedProducts` in state
    - On error: shows toast with error message
    - _Requirements: 2.1, 14.3, 14.5_

  - [x] 7.2 Implement `PreviewStep` (Step 2)
    - Table columns: checkbox, thumbnail, name, source price, MRP, detected brand name, duplicate status badge, description (150 char truncated)
    - Duplicate badge colours: `new` → green, `already-imported` → red, `slug-duplicate` → orange, `possible-duplicate` → yellow
    - Bulk controls: "SELECT ALL", "DESELECT ALL", "SELECT NEW ONLY" (selects only `duplicateStatus === 'new'`)
    - "PROCEED TO BRAND MAPPING" button disabled when `selectedIds.size === 0`
    - Empty state message when no products are available
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 3.6_

  - [x] 7.3 Implement `BrandMappingStep` (Step 3)
    - Show only unique `brandName` values from selected products
    - Auto-resolve via exact case-insensitive match against brands from `GET /api/brands`
    - Auto-resolve via stored mappings from `GET /api/admin/scraper/brand-mappings?provider=<provider>`
    - For unresolved brands: show fuzzy match candidates (≥70% similarity, max 10, ranked) as radio buttons
    - "Create New Brand" option opens confirmation dialog requiring name + slug before calling `POST /api/brands`; persists mapping via `POST /api/admin/scraper/brand-mappings`
    - "Skip all with this brand" option; products with unresolved brands placed in pending-unresolved state
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 7.4 Implement `CategoryStep` (Step 4)
    - Bulk apply row: category dropdown + subcategory dropdown + "APPLY TO ALL SELECTED" button (disabled when no products selected)
    - Per-product rows: product name, current category, category dropdown, subcategory dropdown
    - Valid categories: `sneakers`, `watches`, `luxury-watches`, `glasses`, `handbags`, `clothing`, `ua-batch`
    - Subcategory options driven by selected category (from `catalog.js` subcategories export via `GET /api/subcategories`)
    - Pre-populate from `suggestedCategory`/`suggestedSubcategory` on each ScrapedProduct
    - Block progression if any selected product has no category assigned; display error listing affected products
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 7.5 Implement `BrandAssignmentStep` (Step 5)
    - Table: product name, detected brand name, brand assignment control (searchable dropdown of all brands from `GET /api/brands`)
    - Pre-populate from `brandResolutions` (Step 3 results)
    - Bulk apply: brand dropdown + "APPLY TO ALL SELECTED" button (disabled when no products selected)
    - "No Brand" option with inline warning: "This product will be skipped during import"
    - "Create New Brand" option with confirmation dialog (name + slug required before creation)
    - Block progression if any selected product has neither a brand nor explicit "No Brand"; display error listing affected products
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10_

  - [x] 7.6 Implement `ImportSettingsStep` (Step 6)
    - Pricing mode selector: Fixed Markup | Percentage Markup | Combined | Manual Override
    - Fixed markup: `₹` input (0–999999); Percentage markup: `%` input (0–1000); Combined: both inputs
    - Rounding selector: None | ₹49 | ₹99 | ₹100
    - Image mode selector: Cloudinary (default) | Supplier URL
    - Live price preview table: product name, source price, calculated sale price — recalculates within 500ms of rule change using `useEffect` with 300ms debounce
    - Per-product manual price override input (shown when mode is Manual or source price is 0)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 7.7 Implement `ImportStep` (Step 7)
    - Summary table: products to import, brands, categories, calculated prices
    - "CONFIRM IMPORT" button calls `POST /api/admin/scraper/import` with all selected products as a single JSON array; shows progress bar during import
    - Results summary after completion: X created, X updated, X skipped, X failed
    - Failed products listed with error reasons
    - "VIEW HISTORY" link switches to History tab
    - _Requirements: 10.1, 14.3, 14.5_

- [x] 8. Frontend persistent tabs — History and Sync
  - [x] 8.1 Implement `HistoryTab`
    - Table: date, source, imported, updated, skipped, failed, actions
    - "VIEW LOG" action opens modal with full log JSON array
    - "RE-IMPORT" action pre-fills scanner URL and switches to wizard tab at step 1
    - "DELETE" action shows confirm dialog then calls `DELETE /api/admin/scraper/history/:id`
    - Loads from `GET /api/admin/scraper/history`
    - _Requirements: 11.3, 11.4_

  - [x] 8.2 Implement `SyncTab`
    - Load all products from `GET /api/products`; filter client-side for `source !== null`
    - Table columns: thumbnail, name, source, sourceId, last sync date, status, actions
    - Status: `Connected` (green) | `Source Not Found` (red)
    - "SYNC NOW" action calls `POST /api/admin/scraper/sync/:id`; shows loading state; updates row on success
    - "DISCONNECT" action shows confirm dialog then calls `PUT /api/products/:id` with `source: null, sourceId: null, lastSync: null`
    - _Requirements: 12.1, 12.2, 12.4, 12.5_

- [x] 9. Admin dashboard integration
  - [x] 9.1 Add "Product Scraper" nav item to `frontend/src/app/admin/page.tsx` sidebar
    - Add `href` field to the `NAV` array type and add the scraper entry: `{ id: 'scraper', icon: '🕷', label: 'Product Scraper', href: '/admin/scraper' }`
    - Update the nav render logic to render `<a href={n.href}>` for items with `href`, and the existing `<button>` for section items
    - _Requirements: 14.1_

  - [x] 9.2 Add source tracking fields to `Product` interface and Products table in `frontend/src/app/admin/page.tsx`
    - Add `source?: string | null`, `sourceId?: string | null`, `lastSync?: string | null` to the `Product` interface
    - Add a `Source` column header to the Products table
    - Add the corresponding table cell: show `<span>` badge with `{p.source} · {p.sourceId}` when `p.source` is non-null, otherwise `—`
    - _Requirements: 12.1_

- [x] 10. Final checkpoint — end-to-end verification
  - Ensure all tests pass, the scraper page renders correctly, the sidebar link navigates to `/admin/scraper`, and the full import workflow (scan → preview → brand mapping → category → brand assignment → settings → import) completes without errors. Ask the user if any questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The design uses no pseudocode — all backend code is JavaScript (ESM), all frontend code is TypeScript/React
- The design has no Correctness Properties section, so property-based tests are not applicable; unit and integration tests are used instead
- Checkpoints ensure incremental validation at key milestones
- The existing `backend/src/scraper.js` prototype is left untouched; `cartpeProvider.js` supersedes it

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.5", "2.6"] },
    { "id": 3, "tasks": ["2.3", "2.7"] },
    { "id": 4, "tasks": ["2.4", "2.8"] },
    { "id": 5, "tasks": ["2.9", "4.1", "4.2", "4.3", "4.4"] },
    { "id": 6, "tasks": ["4.5", "6.1", "6.2"] },
    { "id": 7, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "8.1", "8.2"] },
    { "id": 8, "tasks": ["9.1", "9.2"] }
  ]
}
```
