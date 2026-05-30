# Technical Design Document
## Advanced Product Scraper and Manual Sync System — Urbanex

---

## 1. Architecture Overview

The scraper system is a self-contained subsystem that sits alongside the existing product management system. It does not replace or duplicate any existing product, brand, or order infrastructure. All scraped products are ultimately stored in the same `Product` table via the same Prisma model.

```
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js 14 — Vercel)                                     │
│                                                                     │
│  /admin/page.tsx          /admin/scraper/page.tsx                   │
│  (existing admin)         (new scraper page)                        │
│       │                          │                                  │
│       │ sidebar link             │ 7-step wizard UI                 │
│       └──────────────────────────┘                                  │
│                                  │                                  │
│                    fetch() with credentials: 'include'              │
└──────────────────────────────────┼──────────────────────────────────┘
                                   │ HTTPS (cookie auth)
┌──────────────────────────────────┼──────────────────────────────────┐
│  BACKEND (Express — port 3005)   │                                  │
│                                  ▼                                  │
│  adminAuth middleware (urbanex_admin_token cookie)                  │
│                                  │                                  │
│  ┌───────────────────────────────┴──────────────────────────────┐   │
│  │  Scraper Endpoints (backend/src/index.js)                    │   │
│  │  POST /api/admin/scraper/scan                                │   │
│  │  POST /api/admin/scraper/import                              │   │
│  │  POST /api/admin/scraper/sync/:id                            │   │
│  │  GET|DELETE /api/admin/scraper/history[/:id]                 │   │
│  │  GET|POST /api/admin/scraper/brand-mappings                  │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────────────────────┐   │
│  │  Provider Registry (backend/src/scrapers/index.js)           │   │
│  │  { cartpe: cartpeProvider, selloship: ..., shopify: ... }    │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────────────────────┐   │
│  │  cartpeProvider.js   selloshipProvider.js (stub)             │   │
│  │  shopifyProvider.js (stub)   woocommerceProvider.js (stub)   │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────────────────────┐   │
│  │  productUtils.js  (shared validation + build helpers)        │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────────────────────┐   │
│  │  PrismaClient → Neon PostgreSQL                              │   │
│  │  Product | Brand | BrandMapping | ImportHistory              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                         │
                         │ axios HTTP requests
                         ▼
              ┌──────────────────────┐
              │  urbanex.cartpe.in   │
              │  (supplier website)  │
              └──────────────────────┘
```

**Key design principle:** The scraper page calls only the new `/api/admin/scraper/*` endpoints. It never calls `POST /api/products` or `PUT /api/products/:id` directly. The import endpoint internally reuses `productUtils.js`, which is also used by the existing product endpoints — ensuring validation is never duplicated.


---

## 2. Database Schema Changes

### 2.1 Modified: `Product` model

Add three nullable fields and a composite unique constraint:

```prisma
model Product {
  id            Int       @id @default(autoincrement())
  name          String
  slug          String    @unique
  brand         Brand     @relation(fields: [brandId], references: [id])
  brandId       Int       @map("brand_id")
  description   String?
  price         Decimal   @db.Decimal(10, 2)
  originalPrice Decimal?  @map("original_price") @db.Decimal(10, 2)
  images        String[]
  sizes         Json
  colors        Json
  category      String?
  subcategory   String?
  inStock       Boolean   @default(true) @map("in_stock")
  isFeatured    Boolean   @default(false) @map("is_featured")
  orders        Order[]
  createdAt     DateTime  @default(now()) @map("created_at")

  // ── NEW: source tracking ──
  source        String?
  sourceId      String?
  lastSync      DateTime? @map("last_sync")

  @@unique([source, sourceId])
}
```

The `@@unique([source, sourceId])` constraint uses PostgreSQL's behaviour for nullable columns: two rows where both `source` and `sourceId` are `NULL` do **not** violate the constraint. All existing manually-created products (which have `NULL` for both) remain unaffected.

### 2.2 Modified: `Brand` model

Add the reverse relation for `BrandMapping`:

```prisma
model Brand {
  id            Int            @id @default(autoincrement())
  name          String         @unique
  slug          String         @unique
  logoUrl       String?        @map("logo_url")
  products      Product[]
  brandMappings BrandMapping[] // ← NEW
  createdAt     DateTime       @default(now()) @map("created_at")
}
```

### 2.3 New: `BrandMapping` model

```prisma
model BrandMapping {
  id                Int      @id @default(autoincrement())
  provider          String
  supplierBrandName String   @map("supplier_brand_name")
  brandId           Int      @map("brand_id")
  brand             Brand    @relation(fields: [brandId], references: [id])
  createdAt         DateTime @default(now()) @map("created_at")

  @@unique([provider, supplierBrandName])
}
```

`provider` is the registry key string (e.g., `"cartpe"`). The unique constraint ensures one mapping per supplier brand name per provider.

### 2.4 New: `ImportHistory` model

```prisma
model ImportHistory {
  id           Int      @id @default(autoincrement())
  source       String
  sourceUrl    String   @map("source_url")
  importedAt   DateTime @default(now()) @map("imported_at")
  totalScraped Int      @map("total_scraped")
  successCount Int      @map("success_count")
  failureCount Int      @map("failure_count")
  skippedCount Int      @map("skipped_count")
  updatedCount Int      @map("updated_count")
  log          Json?
  createdAt    DateTime @default(now()) @map("created_at")
}
```

The `log` field is a nullable JSON array. Each element has the shape:
```json
{ "sourceId": "npi549885570", "operation": "created" | "updated" | "skipped" | "failed", "errorMessage": "..." }
```
`errorMessage` is only present when `operation` is `"failed"`.

### 2.5 Migration sequence

Run these two migrations in order from the `backend/` directory:

```bash
npx prisma migrate dev --name add_product_source_tracking
# Adds source/sourceId/lastSync to Product + creates BrandMapping

npx prisma migrate dev --name add_import_history
# Creates ImportHistory

npx prisma generate
```

Never use `prisma db push` for schema changes in production.


---

## 3. Provider Architecture

### 3.1 File structure

```
backend/src/scrapers/
  index.js               — provider registry
  cartpeProvider.js      — live CartPe implementation
  selloshipProvider.js   — stub (throws "not implemented")
  shopifyProvider.js     — stub (throws "not implemented")
  woocommerceProvider.js — stub (throws "not implemented")
```

### 3.2 Provider registry — `backend/src/scrapers/index.js`

```js
import cartpeProvider from './cartpeProvider.js';
import selloshipProvider from './selloshipProvider.js';
import shopifyProvider from './shopifyProvider.js';
import woocommerceProvider from './woocommerceProvider.js';

const providers = {
  cartpe: cartpeProvider,
  selloship: selloshipProvider,
  shopify: shopifyProvider,
  woocommerce: woocommerceProvider,
};

/**
 * Returns the provider for the given key.
 * @param {string} key
 * @returns {Provider}
 * @throws {Error} if key is not registered
 */
export function getProvider(key) {
  const p = providers[key];
  if (!p) throw new Error(`Unsupported provider: "${key}". Available: ${Object.keys(providers).join(', ')}`);
  return p;
}

/**
 * Detects the provider key from a URL.
 * @param {string} url
 * @returns {string|null}
 */
export function detectProvider(url) {
  if (/cartpe\.in/i.test(url)) return 'cartpe';
  if (/selloship\.com/i.test(url)) return 'selloship';
  return null;
}

export default providers;
```

### 3.3 Standard provider interface

All providers export a default object conforming to this interface. All methods are `async`.

```js
{
  // Metadata
  name: String,           // e.g. "cartpe"
  displayName: String,    // e.g. "CartPe"
  supportedScopes: Array, // subset of ['full', 'category', 'product']

  /**
   * Scrapes products from the given URL.
   * @param {string} url         - The supplier URL to scrape
   * @param {string} scope       - 'full' | 'category' | 'product'
   * @param {object} options     - { delayMs?: number } (default 500)
   * @returns {Promise<ScrapedProduct[]>}
   */
  async scrape(url, scope, options = {}),

  /**
   * Fetches current data for a single product by its sourceId.
   * @param {string} sourceId    - e.g. "npi549885570"
   * @param {string} sourceUrl   - The original product page URL
   * @returns {Promise<SyncResult>}
   */
  async syncProduct(sourceId, sourceUrl),

  /**
   * Extracts a brand name string from a parsed product object.
   * @param {object} productData - Raw parsed product data
   * @returns {string|null}
   */
  extractBrand(productData),
}
```

### 3.4 `ScrapedProduct` shape

Returned by `provider.scrape()`. This is an in-memory object — never persisted directly.

```js
{
  name:          String,       // Product name
  sourcePrice:   Number,       // Supplier sale price → becomes originalPrice (MRP)
  originalPrice: Number|null,  // Supplier MRP if shown separately; null otherwise
  description:   String|null,
  images:        String[],     // Max 20 supplier image URLs
  brandName:     String|null,  // Detected brand string, or null
  productUrl:    String,       // Full supplier product page URL
  sourceId:      String,       // Extracted from URL, e.g. "npi549885570"
  cartpeCategory: String|null, // Raw supplier category string (CartPe only)
}
```

### 3.5 `SyncResult` shape

Returned by `provider.syncProduct()`:

```js
{
  price:         Number,
  originalPrice: Number|null,
  inStock:       Boolean,
  name:          String|null,       // optional — only if provider can re-fetch
  description:   String|null,       // optional
  images:        String[]|null,     // optional
  notFound:      Boolean,           // true if product 404'd at source
}
```

### 3.6 CartPe provider implementation — `backend/src/scrapers/cartpeProvider.js`

The existing `backend/src/scraper.js` contains a working prototype. The new provider wraps and extends this logic.

**Dependencies:** `axios` (HTTP), `cheerio` (HTML parsing). Both must be installed:
```bash
npm install axios cheerio
```
Puppeteer is NOT needed. CartPe's pagination uses a server-side AJAX endpoint that returns HTML fragments, callable directly via axios POST.

**Key implementation details:**

```js
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE = 'https://urbanex.cartpe.in';
const LOADMORE_URL = `${BASE}/allproductoadmore`;
const WEB_TOKEN = '7d7a244423cfeb4ada709faeaaa457dda9022be990fefe9918440cfbd4f0ed169d156e331c366d37018f06f98ae835b6df047cc72526d3a49e5d030d07652d9c';
const UA = 'Mozilla/5.0 (compatible; UrbanExSync/1.0)';

// Source ID extraction — handles npi/lpi prefixed and bare numeric IDs
function idFromUrl(url) {
  const m = url.match(/-((?:npi|lpi)?\d{6,})-urbanex\.html/i);
  return m ? m[1] : null;
}

// Delay helper with ±20% jitter around the configured delayMs
function sleep(ms) {
  const jitter = ms * 0.2;
  const actual = ms - jitter + Math.random() * jitter * 2;
  return new Promise(r => setTimeout(r, actual));
}
```

**`scrape(url, scope, options)`:**
- `scope === 'full'`: calls `collectProductUrls()` to page through all products via the Load More AJAX endpoint, then fetches each detail page
- `scope === 'category'`: same as full but passes the category URL as the Referer/filter
- `scope === 'product'`: fetches and parses a single product detail page directly
- Stops pagination when the Load More endpoint returns an HTML fragment with zero product links
- Applies `delayMs` (default 500ms, clamped to 100–10000ms) between requests
- On individual product fetch failure: logs the URL + error, skips the product, continues
- On initial URL unreachable: throws immediately

**`collectProductUrls(options)`** (internal):
```js
// POST to LOADMORE_URL with offset, incrementing by 24 per page
// Extracts hrefs matching /urbanex\.cartpe\.in\/.*-urbanex\.html/
// Deduplicates by sourceId
// Stops when a page returns 0 new product links
```

**`parseDetail(html, url)`** (internal, uses cheerio):
```js
// name: last breadcrumb <li><span> or <h1>
// prices: fa-rupee-sign elements; old-price span for MRP
// images: cdn.cartpe.in/images/gallery_md/ or gallery_lg/ URLs, deduplicated, max 20
// sizes: elements with class size_click
// inStock: absence of "out of stock" text
// sourceId: idFromUrl(url)
```

**`extractBrand(productData)`:**
Uses the `BRAND_KEYWORDS` regex table from the existing `scraper.js` (to be imported/copied into the provider). Returns the matched brand name string, or `null` if no match.

**CartPe category mapping table** (used in `scrape()` to pre-populate `cartpeCategory`):

| CartPe category string contains | Urbanex category | Urbanex subcategory |
|---|---|---|
| `watch` + `ladies`/`women` | `watches` | `womens-watches` |
| `watch` + `couple` | `watches` | `couple-watches` |
| `watch` + `luxury` | `watches` | `luxury-watches` |
| `watch` + `men` (or generic) | `watches` | `mens-watches` |
| `t-shirt`, `tshirt`, `t shirt` | `clothing` | `tshirts` |
| `track pant`, `track suit` | `clothing` | `track-pants` |
| `jean`, `denim` | `clothing` | `jeans` |
| `shirt` (not t-shirt) | `clothing` | `shirts` |
| `shoe`, `sneaker`, `footwear`, `loafer`, `flipflop`, `crocs`, `slide` | `sneakers` | `null` |
| `sunglass`, `glass`, `eyewear` | `glasses` | `null` |
| `bag`, `handbag`, `purse` | `handbags` | `null` |
| `perfume`, `fragrance` | `fragrance` | `null` |
| `sock` | `socks` | `null` |
| (no match) | `clothing` | `null` |

This mapping is used to pre-populate the Category Assignment step in the UI. Admins can override per product.

### 3.7 Stub providers

Each stub file exports the same interface shape but every method throws:

```js
// Example: backend/src/scrapers/selloshipProvider.js
const selloshipProvider = {
  name: 'selloship',
  displayName: 'Selloship',
  supportedScopes: [],
  async scrape() { throw new Error('Selloship provider is not yet implemented'); },
  async syncProduct() { throw new Error('Selloship provider is not yet implemented'); },
  extractBrand() { throw new Error('Selloship provider is not yet implemented'); },
};
export default selloshipProvider;
```


---

## 4. Shared Product Logic Extraction

### 4.1 `backend/src/productUtils.js`

This module extracts the create/update logic that is currently inline in `POST /api/products` and `PUT /api/products/:id`. Both those endpoints and the new import endpoint call these functions, ensuring validation is never duplicated (satisfies Req 10 C3).

```js
// backend/src/productUtils.js

/**
 * Validates a product data object.
 * Returns { valid: true } or { valid: false, error: string }.
 *
 * Rules:
 * - name: required, non-empty string
 * - slug: required, non-empty string matching /^[a-z0-9-]+$/
 * - price: required, positive number
 * - brandId: required, positive integer
 * - category: required, one of the valid category slugs
 * - If source is provided, sourceId must also be provided (and vice versa)
 *
 * @param {object} data
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateProductData(data) { ... }

/**
 * Builds the Prisma-compatible data object for create or update.
 * Normalises types (Decimal coercion, null coalescing, array defaults).
 *
 * @param {object} data  - Raw input (from request body or import payload)
 * @returns {object}     - Prisma data object
 */
export function buildProductData(data) {
  return {
    name:          data.name,
    slug:          data.slug,
    category:      data.category,
    subcategory:   data.subcategory || null,
    description:   data.description || null,
    price:         Number(data.price),
    originalPrice: data.originalPrice ? Number(data.originalPrice) : null,
    brandId:       Number(data.brandId),
    sizes:         data.sizes || {},
    colors:        data.colors || [],
    inStock:       data.inStock ?? true,
    isFeatured:    data.isFeatured ?? false,
    images:        data.images || [],
    source:        data.source || null,
    sourceId:      data.sourceId || null,
    lastSync:      data.lastSync || null,
  };
}
```

**Usage in existing endpoints** — `POST /api/products` becomes:
```js
app.post('/api/products', adminAuth, async (req, res) => {
  const validation = validateProductData(req.body);
  if (!validation.valid) return res.status(400).json({ error: validation.error });
  const product = await prisma.product.create({
    data: buildProductData(req.body),
    include: { brand: true },
  });
  res.status(201).json(product);
});
```

The same pattern applies to `PUT /api/products/:id`.


---

## 5. Backend Endpoints Design

All 8 new endpoints are added to `backend/src/index.js` and protected by the existing `adminAuth` middleware. They are grouped under the `/api/admin/scraper/` prefix.

### 5.1 `POST /api/admin/scraper/scan`

**Purpose:** Initiates a scrape and returns ScrapedProducts with duplicate detection results.

**Request body:**
```json
{
  "url":      "https://urbanex.cartpe.in/allproduct.html",
  "scope":    "full" | "category" | "product",
  "provider": "cartpe",        // optional — auto-detected from URL if omitted
  "delayMs":  500              // optional — default 500, range 100–10000
}
```

**Validation:**
- `url`: required, must be a non-empty string parseable as a URL → 400 if missing/invalid
- `scope`: required, must be one of `full`, `category`, `product` → 400 if missing/invalid
- `provider`: if provided, must exist in registry → 400 if unknown; if omitted, auto-detected via `detectProvider(url)` → 400 if detection fails

**Processing:**
1. Resolve provider (explicit or auto-detected)
2. Call `provider.scrape(url, scope, { delayMs })`
3. For each ScrapedProduct, run duplicate detection:
   - Check `prisma.product.findFirst({ where: { source: providerKey, sourceId: p.sourceId } })` → `already-imported`
   - If no match: check `prisma.product.findFirst({ where: { slug: generateSlug(p.name) } })` → `slug-duplicate`
   - If no match: check `prisma.product.findMany()` for case-insensitive name match → `possible-duplicate` (warning only)
   - If no match: `new`
4. Pre-populate category/subcategory using provider's category mapping

**Response `200`:**
```json
{
  "provider": "cartpe",
  "products": [
    {
      "name": "Nike Dunk Low Panda",
      "sourcePrice": 4500,
      "originalPrice": null,
      "description": "...",
      "images": ["https://cdn.cartpe.in/..."],
      "brandName": "Nike",
      "productUrl": "https://urbanex.cartpe.in/...",
      "sourceId": "npi549885570",
      "cartpeCategory": "Shoes",
      "suggestedCategory": "sneakers",
      "suggestedSubcategory": null,
      "duplicateStatus": "new" | "already-imported" | "slug-duplicate" | "possible-duplicate",
      "duplicateMatch": { "name": "...", "slug": "..." } | null
    }
  ],
  "stats": { "total": 48, "failed": 2, "failedUrls": ["https://..."] }
}
```

**Error responses:**
- `400` — missing/invalid url, scope, or provider
- `502` — initial supplier URL unreachable

---

### 5.2 `POST /api/admin/scraper/import`

**Purpose:** Executes a confirmed import of selected products.

**Request body:**
```json
{
  "source":    "cartpe",
  "sourceUrl": "https://urbanex.cartpe.in/allproduct.html",
  "imageMode": "cloudinary" | "supplier-url",
  "products": [
    {
      "name":         "Nike Dunk Low Panda",
      "sourceId":     "npi549885570",
      "productUrl":   "https://urbanex.cartpe.in/...",
      "sourcePrice":  4500,
      "price":        5499,
      "originalPrice": 4500,
      "description":  "...",
      "images":       ["https://cdn.cartpe.in/..."],
      "brandId":      5,
      "category":     "sneakers",
      "subcategory":  null,
      "sizes":        { "US": ["7","8","9","10"] },
      "colors":       [{ "name": "Black/White", "hex": "#000000" }],
      "inStock":      true,
      "isFeatured":   false,
      "slug":         "nike-dunk-low-panda-npi549885570"
    }
  ]
}
```

**Validation:**
- `products` array must be non-empty → 400 if empty or missing
- `source` and `sourceUrl` required → 400 if missing
- `imageMode` must be `cloudinary` or `supplier-url` → defaults to `cloudinary`

**Processing (4 phases — see Section 6 for full sequence):**

Phase 1 — Pre-validation: `validateProductData()` on each product. Collect failures.

Phase 2 — Image handling (outside transaction):
- `cloudinary` mode: download each image URL, POST to `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload` with `upload_preset` and `api_key`/`api_secret` (server-side signed upload). On failure: fall back to supplier URL, log the failure.
- `supplier-url` mode: use supplier URLs as-is.

Phase 3 — Transaction: `prisma.$transaction()` with upserts for all valid products.

Phase 4 — History: create `ImportHistory` record outside the transaction.

**Response `200`:**
```json
{
  "successCount": 42,
  "updatedCount": 3,
  "failureCount": 2,
  "skippedCount": 1,
  "historyId": 7,
  "log": [
    { "sourceId": "npi549885570", "operation": "created" },
    { "sourceId": "npi123456", "operation": "failed", "errorMessage": "brand required" }
  ]
}
```

**Error responses:**
- `400` — empty products array

---

### 5.3 `POST /api/admin/scraper/sync/:id`

**Purpose:** Re-syncs a single imported product from its source.

**Params:** `:id` — Urbanex Product `id` (integer)

**Processing:**
1. `prisma.product.findUnique({ where: { id } })` → 404 if not found
2. If `product.source` is null → 400 "Product has no source — cannot sync"
3. `getProvider(product.source)` → get provider
4. `provider.syncProduct(product.sourceId, product.sourceUrl)` — note: `sourceUrl` is stored on the product (added as a non-schema field in the import, or derived from `sourceId`)
5. If `result.notFound`: set `inStock = false`, update `lastSync`
6. Otherwise: update `price`, `originalPrice`, `inStock`, `lastSync = new Date()`
7. If optional fields enabled: also update `name`, `description`, `images`

**Response `200`:** Updated product object (same shape as `GET /api/products/:slug`).

**Error responses:**
- `400` — product has no source
- `404` — product not found

---

### 5.4 `GET /api/admin/scraper/history`

**Query params:** `page` (default 1), `limit` (default 20, max 100)

**Response `200`:**
```json
{
  "records": [ { "id": 7, "source": "cartpe", "sourceUrl": "...", "importedAt": "...", "totalScraped": 48, "successCount": 42, "updatedCount": 3, "failureCount": 2, "skippedCount": 1 } ],
  "total": 15,
  "page": 1,
  "limit": 20
}
```
Note: `log` field is excluded from the list response for performance.

---

### 5.5 `GET /api/admin/scraper/history/:id`

Returns a single `ImportHistory` record including the full `log` JSON array.

**Response `200`:** Full `ImportHistory` object.
**Error:** `404` if not found.

---

### 5.6 `DELETE /api/admin/scraper/history/:id`

Deletes a single `ImportHistory` record.

**Response `200`:** `{ "success": true }`
**Error:** `404` if not found.

---

### 5.7 `GET /api/admin/scraper/brand-mappings`

Returns all `BrandMapping` records, optionally filtered by `?provider=cartpe`.

**Response `200`:** Array of `BrandMapping` objects with `brand` relation included.

---

### 5.8 `POST /api/admin/scraper/brand-mappings`

Creates or updates a `BrandMapping` (upsert on `[provider, supplierBrandName]`).

**Request body:**
```json
{
  "provider":          "cartpe",
  "supplierBrandName": "Nike Inc.",
  "brandId":           5
}
```

**Response `201`:** Created/updated `BrandMapping` object.
**Error:** `400` if any required field is missing.


---

## 6. Import Flow Sequence

```
Frontend sends POST /api/admin/scraper/import
  │
  ▼
[1] Validate request
    - products array non-empty? → 400 if not
    - source and sourceUrl present? → 400 if not
    - imageMode valid? → default to 'cloudinary'
  │
  ▼
[2] Pre-validation loop (for each product)
    - validateProductData(product) → collect failures
    - Check brandId present (not null, not 'no-brand') → failure: "brand required"
    - Check price > 0 → failure: "price required"
    - Check category is valid slug → failure: "invalid category"
    - Partition into: validProducts[], failedProducts[]
    - Products with brandId === 'no-brand' → skippedProducts[]
  │
  ▼
[3] Image handling (OUTSIDE transaction — no network I/O inside tx)
    For each product in validProducts:
      For each image URL:
        if imageMode === 'cloudinary':
          - Download image bytes via axios
          - POST to Cloudinary REST API (signed upload)
          - On success: replace URL with Cloudinary secure_url
          - On failure: keep original supplier URL, add to imageFailureLog
        if imageMode === 'supplier-url':
          - Keep supplier URL as-is
    Result: validProducts now have resolved image arrays
  │
  ▼
[4] prisma.$transaction(async (tx) => {
      for each product in validProducts:
        existing = await tx.product.findFirst({
          where: { source: product.source, sourceId: product.sourceId }
        })
        if existing:
          await tx.product.update({
            where: { id: existing.id },
            data: { ...buildProductData(product), lastSync: new Date() }
          })
          → updatedCount++
        else:
          await tx.product.create({
            data: { ...buildProductData(product), lastSync: new Date() }
          })
          → successCount++
    })
    // If transaction throws: all DB writes are rolled back
  │
  ▼
[5] Build log array
    - One entry per product: { sourceId, operation, errorMessage? }
    - operations: 'created', 'updated', 'skipped', 'failed'
  │
  ▼
[6] Create ImportHistory record (OUTSIDE transaction)
    await prisma.importHistory.create({
      data: {
        source, sourceUrl,
        totalScraped: products.length,
        successCount, updatedCount, failureCount, skippedCount,
        log: logArray
      }
    })
  │
  ▼
[7] Return summary response
    { successCount, updatedCount, failureCount, skippedCount, historyId, log }
```

**Transaction failure handling:** If `prisma.$transaction()` throws, the catch block still creates the `ImportHistory` record with `successCount: 0`, `updatedCount: 0`, `failureCount: validProducts.length`, and a log entry for each product with `operation: 'failed'` and the transaction error message.

**Cloudinary server-side upload pattern** (mirrors the existing frontend upload but uses signed API):
```js
// backend — uses CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
const formData = new FormData();
formData.append('file', imageBuffer, { filename: 'product.jpg' });
formData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);
// For signed uploads, also append api_key and generate signature

const response = await axios.post(
  `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
  formData,
  { headers: formData.getHeaders() }
);
const cloudinaryUrl = response.data.secure_url;
```


---

## 7. Frontend Page Design

### 7.1 Files

```
frontend/src/app/admin/scraper/page.tsx        — main page component
frontend/src/app/admin/scraper/page.module.css — CSS module (extends admin design system)
```

The page is a standard Next.js App Router page. The existing `frontend/middleware.ts` already protects all `/admin/*` routes, so no additional auth setup is needed.

### 7.2 TypeScript types

```ts
// Mirrors the ScrapedProduct shape from the backend
interface ScrapedProduct {
  name: string;
  sourcePrice: number;
  originalPrice: number | null;
  description: string | null;
  images: string[];
  brandName: string | null;
  productUrl: string;
  sourceId: string;
  cartpeCategory: string | null;
  suggestedCategory: string | null;
  suggestedSubcategory: string | null;
  duplicateStatus: 'new' | 'already-imported' | 'slug-duplicate' | 'possible-duplicate';
  duplicateMatch: { name: string; slug: string } | null;
}

type PricingMode = 'fixed-markup' | 'percent-markup' | 'combined' | 'manual';

interface PricingRule {
  mode: PricingMode;
  fixedAmount: number;   // for fixed-markup and combined
  percentage: number;    // for percent-markup and combined
}

interface ScraperState {
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  url: string;
  scope: 'full' | 'category' | 'product';
  provider: string | null;
  scannedProducts: ScrapedProduct[];
  selectedIds: Set<string>;                                    // sourceIds
  brandResolutions: Map<string, number | 'skip'>;             // supplierBrandName → brandId | 'skip'
  categoryAssignments: Map<string, { category: string; subcategory: string | null }>; // sourceId → assignment
  brandAssignments: Map<string, number | 'no-brand'>;         // sourceId → brandId | 'no-brand'
  pricingRule: PricingRule;
  rounding: 'none' | '49' | '99' | '100';
  imageMode: 'cloudinary' | 'supplier-url';
  manualPrices: Map<string, number>;                          // sourceId → manual price override
}

interface ImportHistory {
  id: number;
  source: string;
  sourceUrl: string;
  importedAt: string;
  totalScraped: number;
  successCount: number;
  updatedCount: number;
  failureCount: number;
  skippedCount: number;
  log?: Array<{ sourceId: string; operation: string; errorMessage?: string }>;
}
```

### 7.3 State management

All state lives in `useState` at the page level and is passed down as props. No external state library is used — consistent with the existing admin page pattern.

```tsx
export default function ScraperPage() {
  const { toasts, show } = useToast();  // copied from admin/page.tsx
  const [state, setState] = useState<ScraperState>({
    step: 1,
    url: '',
    scope: 'full',
    provider: null,
    scannedProducts: [],
    selectedIds: new Set(),
    brandResolutions: new Map(),
    categoryAssignments: new Map(),
    brandAssignments: new Map(),
    pricingRule: { mode: 'fixed-markup', fixedAmount: 0, percentage: 0 },
    rounding: 'none',
    imageMode: 'cloudinary',
    manualPrices: new Map(),
  });
  const [activeTab, setActiveTab] = useState<'wizard' | 'history' | 'sync'>('wizard');
  // ...
}
```

### 7.4 Step components

Each step is a separate React component receiving `state`, `setState`, `show`, and `brands` as props.

#### Step 1 — `ScannerStep`
- URL text input (full width)
- Scope dropdown: `full` / `category` / `product`
- Optional delay input (ms)
- "SCAN" button → calls `POST /api/admin/scraper/scan`
- Progress bar (visible during scan, hidden otherwise)
- On success: advances to step 2, populates `scannedProducts`
- On error: shows toast with error message

#### Step 2 — `PreviewStep`
- Table columns: checkbox | thumbnail | name | source price | MRP | brand name | duplicate badge | description (150 char truncated)
- Duplicate badge colours: `new` → green, `already-imported` → red, `slug-duplicate` → orange, `possible-duplicate` → yellow
- Bulk controls: "SELECT ALL" | "DESELECT ALL" | "SELECT NEW ONLY"
- "SELECT NEW ONLY" selects only products with `duplicateStatus === 'new'`
- "PROCEED TO BRAND MAPPING" button — disabled when `selectedIds.size === 0`

#### Step 3 — `BrandMappingStep`
- Shows only unique `brandName` values from selected products
- For each unique brand name:
  - Auto-resolved (exact match or stored mapping): shows resolved brand name, no action needed
  - Unresolved: shows fuzzy match candidates (≥70% similarity) as radio buttons + "Create New Brand" + "Skip all with this brand"
  - "Create New Brand" opens a confirmation dialog requiring name + slug input before creation
- "PROCEED TO CATEGORY ASSIGNMENT" button

#### Step 4 — `CategoryStep`
- Bulk apply row: category dropdown + subcategory dropdown + "APPLY TO ALL SELECTED" button
- Per-product rows: product name | current category | category dropdown | subcategory dropdown
- Valid categories: `sneakers`, `watches`, `luxury-watches`, `glasses`, `handbags`, `clothing`, `ua-batch`
- Subcategory options depend on selected category (from `subcategories` export in `catalog.js`)
- Pre-populated from `suggestedCategory` / `suggestedSubcategory` on each ScrapedProduct
- Blocks progression if any selected product has no category assigned

#### Step 5 — `BrandAssignmentStep`
- Table: product name | detected brand | brand assignment control
- Brand assignment control: searchable dropdown of all brands from `GET /api/brands` + "No Brand" option + "Create New Brand" option
- Pre-populated from `brandResolutions` (Step 3 results)
- Bulk apply: brand dropdown + "APPLY TO ALL SELECTED" button
- "No Brand" shows inline warning: "This product will be skipped during import"
- Blocks progression if any selected product has neither a brand nor explicit "No Brand"

#### Step 6 — `ImportSettingsStep`
- Pricing mode selector: Fixed Markup | Percentage Markup | Combined | Manual Override
- Fixed markup: `₹` input (0–999999)
- Percentage markup: `%` input (0–1000)
- Combined: both inputs
- Rounding: None | ₹49 | ₹99 | ₹100
- Image mode: Cloudinary (default) | Supplier URL
- Live price preview table: product name | source price | calculated sale price (updates within 500ms of rule change)
- Manual override: per-product price input (shown when mode is Manual or when source price is 0)

#### Step 7 — `ImportStep`
- Summary table: products to import, brands, categories, calculated prices
- "CONFIRM IMPORT" button → calls `POST /api/admin/scraper/import`
- Progress bar during import
- Results summary after completion: X created, X updated, X skipped, X failed
- Failed products listed with error reasons
- "VIEW HISTORY" link → switches to History tab

### 7.5 Persistent tabs

Two tabs accessible at any time (outside the wizard stepper):

**History tab (`HistoryTab`):**
- Table: date | source | imported | updated | skipped | failed | actions
- Actions per row: "VIEW LOG" (modal with full log JSON), "RE-IMPORT" (pre-fills scanner URL), "DELETE" (confirm dialog)
- Loads from `GET /api/admin/scraper/history`

**Sync tab (`SyncTab`):**
- Table of all products where `source IS NOT NULL`
- Columns: thumbnail | name | source | sourceId | last sync | status | actions
- Status: `Connected` (green) | `Source Not Found` (red)
- Actions: "SYNC NOW" → calls `POST /api/admin/scraper/sync/:id`, "DISCONNECT" → confirm dialog → calls `PUT /api/products/:id` with `source: null, sourceId: null, lastSync: null`
- Loads from `GET /api/products` filtered client-side for `source !== null`

### 7.6 Reused patterns from `admin/page.tsx`

Copy these implementations verbatim (same pattern, same behaviour):

```ts
// useToast hook — identical to admin/page.tsx
function useToast() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'ok' | 'err' }[]>([]);
  const show = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

// api helper — identical to admin/page.tsx
async function api(path: string, opts?: RequestInit) {
  const res = await fetch(path, { credentials: 'include', ...opts });
  if (res.status === 401) { window.location.href = '/admin/login'; throw new Error('Unauthorized'); }
  return res;
}
```

### 7.7 CSS module — `page.module.css`

Imports the same design tokens as `admin/page.module.css`. Key additions for the scraper page:

```css
/* Stepper */
.stepper { display: flex; gap: 0; margin-bottom: 32px; overflow-x: auto; }
.stepItem { flex: 1; min-width: 80px; padding: 10px 8px; text-align: center; font-size: 11px;
            letter-spacing: 1px; text-transform: uppercase; color: #555; border-bottom: 2px solid #222; }
.stepActive { color: #CC0000; border-bottom-color: #CC0000; }
.stepDone { color: #22C55E; border-bottom-color: #22C55E; }

/* Duplicate badges */
.badgeNew { background: #22C55E; }
.badgeDuplicate { background: #CC0000; }
.badgeSlugDuplicate { background: #F97316; }
.badgePossible { background: #F5C400; color: #000; }

/* Price preview */
.pricePreview { font-family: 'Oswald', sans-serif; font-size: 16px; color: #CC0000; }
.priceOriginal { font-size: 12px; color: #666; text-decoration: line-through; }

/* Sync status */
.statusConnected { color: #22C55E; font-size: 12px; font-weight: 700; }
.statusNotFound { color: #CC0000; font-size: 12px; font-weight: 700; }

/* Warning inline */
.inlineWarning { color: #F5C400; font-size: 12px; margin-top: 4px; }
```

All other class names (`.shell`, `.sidebar`, `.btnPrimary`, `.table`, `.modal`, etc.) are reused from `admin/page.module.css` by importing that module alongside the scraper's own module.


---

## 8. Sidebar Integration

### 8.1 Change to `frontend/src/app/admin/page.tsx`

The existing `NAV` array uses section IDs that map to `setSection()` calls. The scraper entry is different — it navigates to a separate page. The nav item needs to be rendered as a link rather than a button.

**Current NAV array:**
```ts
const NAV = [
  { id: 'overview', icon: '📊', label: 'Overview' },
  { id: 'orders', icon: '📦', label: 'Orders' },
  { id: 'products', icon: '👟', label: 'Products' },
  { id: 'brands', icon: '🏷️', label: 'Brands' },
  { id: 'coupons', icon: '🎟️', label: 'Coupons' },
  { id: 'inventory', icon: '📈', label: 'Inventory' },
  { id: 'csv', icon: '📥', label: 'Import CSV' },
] as const;
```

**Updated NAV array** — add a `href` field to distinguish link items from section items:
```ts
const NAV = [
  { id: 'overview',  icon: '📊',  label: 'Overview' },
  { id: 'orders',    icon: '📦',  label: 'Orders' },
  { id: 'products',  icon: '👟',  label: 'Products' },
  { id: 'brands',    icon: '🏷️', label: 'Brands' },
  { id: 'coupons',   icon: '🎟️', label: 'Coupons' },
  { id: 'inventory', icon: '📈',  label: 'Inventory' },
  { id: 'csv',       icon: '📥',  label: 'Import CSV' },
  { id: 'scraper',   icon: '🕷',  label: 'Product Scraper', href: '/admin/scraper' },
] as const;
```

**Updated nav render logic:**
```tsx
{NAV.map(n => (
  'href' in n ? (
    <a key={n.id} href={n.href} className={styles.navItem}>
      <span>{n.icon}</span> {n.label}
    </a>
  ) : (
    <button key={n.id}
      className={`${styles.navItem} ${section === n.id ? styles.navActive : ''}`}
      onClick={() => { setSection(n.id as typeof section); setSidebarOpen(false); }}>
      <span>{n.icon}</span> {n.label}
    </button>
  )
))}
```

### 8.2 Source column in Products section

In `ProductsSection`, add a `Source` column to the products table for products with a non-null `source` field. This requires updating the `Product` interface in `admin/page.tsx`:

```ts
interface Product {
  // ... existing fields ...
  source?: string | null;
  sourceId?: string | null;
  lastSync?: string | null;
}
```

Table header addition:
```tsx
<th>Source</th>
```

Table cell addition (in the product row):
```tsx
<td>
  {p.source ? (
    <span className={styles.badge} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#aaa' }}>
      {p.source} · {p.sourceId}
    </span>
  ) : '—'}
</td>
```


---

## 9. NPM Packages to Install

### Backend only

Check if already present in `backend/package.json` before installing:

```bash
# From backend/ directory
npm install axios cheerio
```

- `axios` — HTTP client for calling CartPe's AJAX endpoint and Cloudinary REST API. Replaces the raw `https.request` calls in the existing `scraper.js`.
- `cheerio` — Server-side HTML parsing for product detail pages. Provides jQuery-like selectors for extracting name, price, images, sizes.

**Puppeteer is NOT installed.** CartPe's Load More pagination uses a server-side AJAX endpoint (`/allproductoadmore`) that returns HTML fragments. This endpoint is callable directly via axios POST without a headless browser. Puppeteer would only be added if a future provider requires JavaScript rendering.

### Frontend

No new packages required. The scraper page uses the same `fetch()` API already used throughout the admin page.

---

## 10. Migrations Sequence

Run in order from the `backend/` directory:

```bash
# Step 1: Add source tracking to Product + create BrandMapping
npx prisma migrate dev --name add_product_source_tracking

# Step 2: Create ImportHistory
npx prisma migrate dev --name add_import_history

# Step 3: Regenerate Prisma client
npx prisma generate
```

**Migration 1 (`add_product_source_tracking`) will generate SQL approximately:**
```sql
ALTER TABLE "Product" ADD COLUMN "source" TEXT;
ALTER TABLE "Product" ADD COLUMN "source_id" TEXT;
ALTER TABLE "Product" ADD COLUMN "last_sync" TIMESTAMP(3);
CREATE UNIQUE INDEX "Product_source_source_id_key" ON "Product"("source", "source_id");

CREATE TABLE "BrandMapping" (
  "id" SERIAL NOT NULL,
  "provider" TEXT NOT NULL,
  "supplier_brand_name" TEXT NOT NULL,
  "brand_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandMapping_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "BrandMapping" ADD CONSTRAINT "BrandMapping_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "BrandMapping_provider_supplier_brand_name_key"
  ON "BrandMapping"("provider", "supplier_brand_name");
```

**Migration 2 (`add_import_history`) will generate SQL approximately:**
```sql
CREATE TABLE "ImportHistory" (
  "id" SERIAL NOT NULL,
  "source" TEXT NOT NULL,
  "source_url" TEXT NOT NULL,
  "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "total_scraped" INTEGER NOT NULL,
  "success_count" INTEGER NOT NULL,
  "failure_count" INTEGER NOT NULL,
  "skipped_count" INTEGER NOT NULL,
  "updated_count" INTEGER NOT NULL,
  "log" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportHistory_pkey" PRIMARY KEY ("id")
);
```

The `@@unique([source, sourceId])` on `Product` uses PostgreSQL's standard behaviour for nullable unique indexes: multiple rows with `NULL` in both columns do not violate the constraint. All existing products (with `source = NULL, sourceId = NULL`) are unaffected.

---

## 11. Environment Variables

No new environment variables are required for the scraper itself.

The Cloudinary server-side upload (used during import) requires these backend variables, which should already be configured or need to be added to `backend/.env`:

| Variable | Purpose |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Cloud name for the Cloudinary REST API URL |
| `CLOUDINARY_API_KEY` | API key for signed uploads |
| `CLOUDINARY_API_SECRET` | API secret for generating upload signatures |
| `CLOUDINARY_UPLOAD_PRESET` | Upload preset name (can be unsigned for simplicity) |

These are distinct from the frontend variables (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`) already used in the admin product form for client-side uploads. The backend uses the same Cloudinary account but calls the API server-side during import.

**Note on upload mode:** If using an unsigned upload preset (simpler setup), only `CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_UPLOAD_PRESET` are needed. If using signed uploads (more secure), all four variables are required and the backend must generate an HMAC-SHA1 signature before each upload call.

---

## 12. Files Created / Modified Summary

### Created

| File | Purpose |
|---|---|
| `backend/src/scrapers/index.js` | Provider registry + `getProvider()` + `detectProvider()` |
| `backend/src/scrapers/cartpeProvider.js` | Live CartPe scraper implementation |
| `backend/src/scrapers/selloshipProvider.js` | Stub provider |
| `backend/src/scrapers/shopifyProvider.js` | Stub provider |
| `backend/src/scrapers/woocommerceProvider.js` | Stub provider |
| `backend/src/productUtils.js` | `validateProductData()` + `buildProductData()` |
| `frontend/src/app/admin/scraper/page.tsx` | 7-step scraper wizard page |
| `frontend/src/app/admin/scraper/page.module.css` | Scraper-specific CSS (extends admin design system) |
| `backend/prisma/migrations/[ts]_add_product_source_tracking/` | Migration 1 |
| `backend/prisma/migrations/[ts]_add_import_history/` | Migration 2 |

### Modified

| File | Change |
|---|---|
| `backend/prisma/schema.prisma` | Add `source`, `sourceId`, `lastSync` to `Product`; add `brandMappings` to `Brand`; add `BrandMapping` model; add `ImportHistory` model |
| `backend/src/index.js` | Add 8 new scraper endpoints; refactor `POST /api/products` and `PUT /api/products/:id` to use `productUtils.js` |
| `frontend/src/app/admin/page.tsx` | Add scraper nav item to sidebar; add `source`/`sourceId`/`lastSync` to `Product` interface; add Source column to Products table |

### Unchanged (explicitly)

- `backend/src/scraper.js` — The existing prototype scraper is left in place. The new `cartpeProvider.js` supersedes it for the API-driven workflow, but the old file can remain as a CLI tool or be deleted after migration.
- All existing product, brand, order, coupon, and auth endpoints — no behaviour changes.
- All existing frontend pages — no changes except `admin/page.tsx` sidebar and Products table.


---

## 13. Pricing Engine Design

The pricing engine runs entirely on the frontend during the Import Settings step. The calculated price is sent as the `price` field in the import request body — the backend does not recalculate pricing.

### 13.1 Calculation logic

```ts
function calculatePrice(
  sourcePrice: number,
  rule: PricingRule,
  rounding: 'none' | '49' | '99' | '100',
  manualOverride?: number
): number {
  if (manualOverride !== undefined) return manualOverride;
  if (sourcePrice === 0) return 0; // requires manual override — blocked in UI

  let price = sourcePrice;

  switch (rule.mode) {
    case 'fixed-markup':
      price = sourcePrice + rule.fixedAmount;
      break;
    case 'percent-markup':
      price = sourcePrice * (1 + rule.percentage / 100);
      break;
    case 'combined':
      price = (sourcePrice + rule.fixedAmount) * (1 + rule.percentage / 100);
      break;
    case 'manual':
      return manualOverride ?? 0; // UI enforces this is set
  }

  // Apply rounding
  switch (rounding) {
    case '49':  return Math.floor(price / 100) * 100 + 49;
    case '99':  return Math.floor(price / 100) * 100 + 99;
    case '100': return Math.round(price / 100) * 100;
    default:    return Math.round(price);
  }
}
```

The `sourcePrice` from the scraper maps to `originalPrice` (MRP / crossed-out price) on the Urbanex Product. The calculated `price` is the Urbanex sale price.

### 13.2 Live preview debounce

The price preview table recalculates within 500ms of any rule parameter change using `useEffect` with a debounce:

```ts
useEffect(() => {
  const timer = setTimeout(() => {
    // recalculate all preview prices
  }, 300); // 300ms debounce, well within the 500ms requirement
  return () => clearTimeout(timer);
}, [state.pricingRule, state.rounding]);
```

---

## 14. Duplicate Detection Detail

Duplicate detection runs server-side in `POST /api/admin/scraper/scan` after scraping. The priority order is:

1. **`already-imported`** (highest priority): `source === providerKey AND sourceId === p.sourceId` — exact match on the source tracking fields. This product was previously imported from this provider.

2. **`slug-duplicate`**: No source match, but `slug === generateSlug(p.name)` — a product with the same generated slug exists. Could be a manual entry of the same product.

3. **`possible-duplicate`** (warning only): No slug match, but a case-insensitive name comparison finds a product with the same name. Not a definitive match — surfaced as a warning.

4. **`new`**: No match found by any check.

When multiple match types apply, `already-imported` takes precedence. The `duplicateMatch` field in the response includes the matched product's `name` and `slug` for display in the UI.

The frontend PreviewStep displays these as colour-coded badges. The default selection behaviour of "SELECT NEW ONLY" selects only `new` products. Products with `already-imported` status default to `skip` resolution but can be changed to `update-existing` or `import-anyway` by the admin.

---

## 15. Brand Resolution Flow

Brand resolution happens in two places: server-side (stored mappings lookup) and client-side (fuzzy matching UI in Step 3).

### 15.1 Server-side (during scan)

The scan endpoint does not resolve brands — it returns the raw `brandName` string from the scraper. Brand resolution is a frontend concern during the wizard.

### 15.2 Client-side resolution order (Step 3 — BrandMappingStep)

For each unique `brandName` across selected products:

1. **Exact match**: Compare `brandName.toLowerCase()` against all brands from `GET /api/brands`. If found → auto-resolved, no UI prompt.

2. **Stored mapping**: Check `GET /api/admin/scraper/brand-mappings?provider=cartpe` for a record where `supplierBrandName === brandName`. If found → auto-resolved with the mapped `brandId`.

3. **Fuzzy match**: Compute similarity between `brandName` and each brand name using a simple algorithm (e.g., Levenshtein distance normalised to 0–1). Present candidates with similarity ≥ 0.70, ranked descending, max 10. Admin selects one, or chooses "Create New Brand" or "Skip".

4. **No match**: Only "Create New Brand" and "Skip" options shown.

### 15.3 Fuzzy matching implementation

```ts
// Simple Levenshtein-based similarity (0 to 1)
function similarity(a: string, b: string): number {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  return (longer.length - editDistance(longer, shorter)) / longer.length;
}
```

This runs entirely in the browser — no backend call needed for fuzzy matching.

### 15.4 Persisting resolutions

When an admin resolves a brand mapping, the frontend calls `POST /api/admin/scraper/brand-mappings` to persist the decision. Future scrapes from the same provider will auto-resolve the same brand name without prompting (step 2 above).


---

## 16. Sync System Design

### 16.1 `POST /api/admin/scraper/sync/:id` — full implementation detail

```js
app.post('/api/admin/scraper/sync/:id', adminAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid product id' });

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (!product.source) return res.status(400).json({ error: 'Product has no source — cannot sync' });

  const provider = getProvider(product.source);

  // sourceUrl is reconstructed from sourceId for CartPe, or stored separately
  // For CartPe: https://urbanex.cartpe.in/<slug>-<sourceId>-urbanex.html
  // The product URL is not stored in the current schema — we derive it from sourceId
  // or store it as a separate field. For the initial implementation, CartPe provider
  // reconstructs the URL from sourceId using the known URL pattern.
  const syncResult = await provider.syncProduct(product.sourceId, null);

  const updateData = {
    inStock:   syncResult.notFound ? false : syncResult.inStock,
    lastSync:  new Date(),
  };

  if (!syncResult.notFound) {
    updateData.price         = syncResult.price;
    updateData.originalPrice = syncResult.originalPrice;
  }

  // Optional fields — only update if provider returned them and admin has enabled sync
  const { syncName, syncDescription, syncImages } = req.body;
  if (syncName && syncResult.name)        updateData.name        = syncResult.name;
  if (syncDescription && syncResult.description) updateData.description = syncResult.description;
  if (syncImages && syncResult.images)    updateData.images      = syncResult.images;

  const updated = await prisma.product.update({
    where: { id },
    data: updateData,
    include: { brand: true },
  });

  res.json({ ...updated, price: Number(updated.price), originalPrice: updated.originalPrice ? Number(updated.originalPrice) : null });
});
```

### 16.2 Disconnect source

The "Disconnect Source" action in the Sync tab calls the existing `PUT /api/products/:id` endpoint with `source: null, sourceId: null, lastSync: null`. No new endpoint is needed — `buildProductData()` handles null values for these fields.

### 16.3 CartPe `syncProduct` implementation

```js
async syncProduct(sourceId, sourceUrl) {
  // Reconstruct URL from sourceId if not provided
  // CartPe URL pattern: https://urbanex.cartpe.in/<product-name>-<sourceId>-urbanex.html
  // Since we don't store the full URL, we use the Load More endpoint to find it,
  // or we store the productUrl during import (recommended).
  //
  // Recommended: store productUrl as a field on Product (or derive from sourceId).
  // For the initial implementation: fetch the product page directly using a known URL
  // template, or search the Load More results for the matching sourceId.

  try {
    const { data: html } = await axios.get(sourceUrl || `${BASE}/product-${sourceId}-urbanex.html`, {
      headers: { 'User-Agent': UA },
      timeout: 10000,
    });
    const parsed = parseDetail(html, sourceUrl);
    return {
      price:         parsed.price,
      originalPrice: parsed.originalPrice,
      inStock:       parsed.inStock,
      name:          parsed.name,
      images:        parsed.images,
      notFound:      false,
    };
  } catch (err) {
    if (err.response?.status === 404) {
      return { price: 0, originalPrice: null, inStock: false, notFound: true };
    }
    throw err;
  }
}
```

**Note on `sourceUrl` storage:** The `ScrapedProduct.productUrl` field should be stored on the `Product` record during import. This requires either adding a `sourceUrl` column to the `Product` model (a third migration) or reconstructing the URL from `sourceId` at sync time. The recommended approach is to store it — add `sourceUrl String? @map("source_url")` to the `Product` model in migration 1. This is included in the schema additions in Section 2.1 as an implicit requirement of the sync system.

**Updated Product model addition** (add to Section 2.1):
```prisma
sourceUrl  String?   @map("source_url")
```

---

## 17. Error Handling Summary

| Scenario | HTTP Status | Response |
|---|---|---|
| Scan: missing URL | 400 | `{ "error": "url is required" }` |
| Scan: invalid scope | 400 | `{ "error": "scope must be one of: full, category, product" }` |
| Scan: unknown provider | 400 | `{ "error": "Unsupported provider: \"xyz\". Available: cartpe, selloship, shopify, woocommerce" }` |
| Scan: supplier URL unreachable | 502 | `{ "error": "Supplier URL unreachable: <url>" }` |
| Import: empty products array | 400 | `{ "error": "products array must not be empty" }` |
| Import: missing source | 400 | `{ "error": "source and sourceUrl are required" }` |
| Sync: product not found | 404 | `{ "error": "Product not found" }` |
| Sync: product has no source | 400 | `{ "error": "Product has no source — cannot sync" }` |
| Any endpoint: no auth cookie | 401 | `{ "error": "Unauthorized" }` (from `adminAuth`) |
| Any endpoint: invalid token | 401 | `{ "error": "Invalid token" }` (from `adminAuth`) |
| Brand mapping: missing fields | 400 | `{ "error": "provider, supplierBrandName, and brandId are required" }` |

Individual product failures during import do not cause a 4xx/5xx response — they are recorded in the `log` array and reflected in `failureCount`. The overall import response is always `200` if the request itself was valid.

