# Requirements Document

## Introduction

The Advanced Product Scraper and Manual Sync System allows Urbanex admins to import products directly from supplier websites (starting with CartPe at urbanex.cartpe.in) into the existing Urbanex product catalog. Admins can scan a supplier URL, preview scraped products, resolve brands, apply pricing rules, and confirm imports — all from a new "Product Scraper" section in the existing Admin Dashboard. Imported products are tracked back to their source so admins can manually re-sync prices and stock at any time. The architecture is provider-based to support future suppliers (Selloship, Shopify, WooCommerce, custom sites) without structural changes.

This system integrates entirely with the existing Product, Brand, and Cloudinary infrastructure. No duplicate product tables, APIs, or catalog systems are created.

---

## Glossary

- **Scraper**: The backend subsystem responsible for fetching and parsing product data from supplier websites.
- **Provider**: A supplier-specific scraper implementation (e.g., CartPe, Selloship). Each provider implements a standard interface.
- **CartPe**: The initial supplier provider at `urbanex.cartpe.in`.
- **ScrapedProduct**: A temporary in-memory or session-scoped product record extracted from a supplier page, not yet saved to the database.
- **ImportSession**: A single admin-initiated scrape-and-import workflow, from URL input through final confirmation.
- **ImportHistory**: A persistent database record of a completed import session, including counts and a log.
- **SourceId**: The supplier's unique identifier for a product, extracted from the product URL (e.g., `npi549885570`).
- **BrandMapping**: A stored association between a supplier's brand name string and an Urbanex Brand record, scoped per provider.
- **BrandAssignment**: The explicit brand selected by the Admin for a ScrapedProduct during the Brand Assignment step, which becomes the `brandId` on the imported Product record.
- **PricingRule**: An admin-configured formula that transforms the scraped source price into the Urbanex sale price.
- **Admin**: An authenticated user with the `admin` role, verified via the existing `adminAuth` middleware.
- **Product**: The existing Prisma `Product` model in the Urbanex database.
- **Brand**: The existing Prisma `Brand` model in the Urbanex database.
- **Cloudinary**: The existing image hosting service integrated into Urbanex.
- **adminAuth**: The existing Express middleware that validates the `urbanex_admin_token` cookie.

---

## Requirements

### Requirement 1: Provider Architecture

**User Story:** As a developer, I want a provider-based scraper architecture, so that new supplier integrations can be added without changing the core import workflow.

#### Acceptance Criteria

1. THE Scraper SHALL expose a provider registry at `backend/src/scrapers/index.js` that maps provider keys (e.g., `"cartpe"`) to provider implementations.
2. WHEN a new provider key is requested that does not exist in the registry, THE Scraper SHALL reject with an Error whose message identifies the requested key and states it is unsupported.
3. THE CartPe_Provider SHALL implement the standard provider interface: `scrape(url, scope, options)`, `syncProduct(sourceId, sourceUrl)`, and `extractBrand(productData)`.
4. THE Selloship_Provider, Shopify_Provider, and WooCommerce_Provider SHALL each exist as stub files at `backend/src/scrapers/selloshipProvider.js`, `backend/src/scrapers/shopifyProvider.js`, and `backend/src/scrapers/woocommerceProvider.js` that implement the standard interface and, when any interface method is called, reject with an Error whose message indicates the provider is not yet implemented.
5. WHERE a provider implements `scrape`, THE Provider SHALL accept a `delayMs` value via the `options` parameter that controls the delay between requests, defaulting to 500ms when not specified, and SHALL apply a delay in the range of 400ms to 600ms when the default is used.

---

### Requirement 2: Website Scanner

**User Story:** As an admin, I want to scan a supplier URL and extract product data, so that I can review products before importing them.

#### Acceptance Criteria

1. WHEN an Admin submits a supplier URL and a scrape scope (`full-site`, `single-category`, or `single-product`), THE Scraper SHALL extract the following fields for each product: name, sale price, original price (MRP), description, up to 20 images, brand name (or null if not detectable), product URL, and source identifier.
2. WHEN the CartPe provider is used and the target page uses JavaScript-rendered pagination (Load More), THE CartPe_Provider SHALL retrieve all products by calling the supplier's internal AJAX/JSON endpoint rather than rendering JavaScript, and SHALL stop pagination when the endpoint returns an empty product list.
3. WHEN the CartPe provider is used, THE CartPe_Provider SHALL extract the source identifier from the product URL using the pattern `-((?:npi|lpi)?\d{6,})-urbanex\.html`.
4. IF the initial supplier URL is unreachable, THEN THE Scraper SHALL return an error response immediately without attempting to parse any products.
5. IF a product page cannot be fetched, cannot be parsed, or is missing both its name and product URL, THEN THE Scraper SHALL log the failure with the product URL and error message, skip that product, and continue processing remaining products.
6. WHEN scraping multiple pages or products, THE Scraper SHALL apply a configurable delay between requests via the `delayMs` option, defaulting to 500ms, with valid values between 100ms and 10,000ms.
7. THE Scraper SHALL NOT save any scraped product data to the database during the scan phase.

---

### Requirement 3: Duplicate Detection

**User Story:** As an admin, I want to see which scraped products already exist in Urbanex, so that I can avoid creating duplicates.

#### Acceptance Criteria

1. WHEN a ScrapedProduct is evaluated for duplicates, THE Duplicate_Detector SHALL check for an existing Product with the same `source` and `sourceId` combination (primary check).
2. WHEN no match is found by source and sourceId, THE Duplicate_Detector SHALL check for an existing Product with the same `slug`.
3. WHEN no match is found by slug, THE Duplicate_Detector SHALL perform a case-insensitive name comparison and, if a match is found, flag the ScrapedProduct as a possible duplicate (warning only, not a definitive match).
4. WHEN no match is found by any check, THE Duplicate_Detector SHALL assign the ScrapedProduct a status of `new`.
5. WHEN multiple match types apply to a single ScrapedProduct, THE Duplicate_Detector SHALL assign the highest-priority status (`already-imported` takes precedence over `possible-duplicate`) and surface all match details (matched Product name and slug per match type) to the Admin.
6. WHEN an Admin reviews a ScrapedProduct with status `already-imported` or `possible-duplicate`, THE Admin_UI SHALL present three resolution options: `skip` (pre-selected by default), `update-existing`, and `import-anyway`.

---

### Requirement 4: Product Preview Table

**User Story:** As an admin, I want to review all scraped products in a table before importing, so that I can select which ones to import.

#### Acceptance Criteria

1. WHEN scraped products are available, THE Admin_UI SHALL display them in a table with the following columns: checkbox, thumbnail image, product name, source price, original price/MRP, detected brand name, duplicate status badge (values: `new`, `duplicate`, `unknown`), and description preview truncated to 150 characters.
2. THE Admin_UI SHALL provide "Select All", "Deselect All", and "Select New Only" bulk selection controls.
3. WHEN "Select New Only" is activated, THE Admin_UI SHALL select only products with duplicate status `new` and deselect all others.
4. WHILE at least one product is selected, THE Admin_UI SHALL enable the "Proceed to Brand Mapping" action; IF no products are selected, THE Admin_UI SHALL disable the "Proceed to Brand Mapping" action.
5. WHEN no scraped products are available, THE Admin_UI SHALL display an empty state message prompting the Admin to run a scan first.

---

### Requirement 5: Brand Handling

**User Story:** As an admin, I want to map supplier brand names to existing Urbanex brands, so that imported products are correctly attributed without creating unverified brands.

#### Acceptance Criteria

1. WHEN a ScrapedProduct has a detected brand name, THE Brand_Resolver SHALL first check the database for an exact case-insensitive match against existing Brand names.
2. WHEN the exact match check has been completed and no exact match is found, THE Brand_Resolver SHALL then check the stored BrandMapping table for a known mapping from the supplier brand name to an Urbanex Brand, scoped to the current provider.
3. WHEN the stored mapping check has been completed and no stored mapping exists, THE Brand_Resolver SHALL compute fuzzy matches against existing Brand names using a minimum similarity threshold of 70%, present up to 10 candidates ranked by similarity, and present them to the Admin for selection.
4. WHEN no fuzzy match meets the 70% threshold, THE Brand_Resolver SHALL still present the resolution dialog to the Admin with only "create new brand" and "skip" options available.
5. WHEN an Admin resolves an unknown brand, THE Admin_UI SHALL offer three options: map to an existing Brand, create a new Brand (which requires a separate explicit admin confirmation step before creation), or skip all products with this brand name in the current import batch.
6. THE Brand_Resolver SHALL NOT automatically create a Brand record without explicit Admin confirmation.
7. WHEN an Admin confirms a brand mapping or a skip decision, THE Brand_Resolver SHALL persist the decision (supplier brand name → Urbanex Brand id or skip-rule, scoped to provider) so that future scrapes from the same provider auto-resolve the same brand name without prompting.
8. WHEN a brand name remains unresolved after the Admin dismisses the dialog without making a selection, THE Admin_UI SHALL place those products in a pending-unresolved state and exclude them from the import until resolved.

---

### Requirement 6: Category Assignment

**User Story:** As an admin, I want to assign categories to scraped products, so that they appear in the correct sections of the Urbanex storefront.

#### Acceptance Criteria

1. WHEN the CartPe provider is used, THE Category_Mapper SHALL automatically pre-populate the category and subcategory fields for each ScrapedProduct based on the supplier's category string, using the existing mapping logic.
2. THE Admin_UI SHALL allow the Admin to apply a single category and subcategory to all selected products at once; the bulk-apply control SHALL be disabled when no products are selected.
3. THE Admin_UI SHALL allow the Admin to override the category and subcategory per individual product.
4. THE Admin_UI SHALL present the valid category options: `sneakers`, `watches`, `luxury-watches`, `glasses`, `handbags`, `clothing`, `ua-batch`; products in `sneakers`, `handbags`, `luxury-watches`, and `ua-batch` categories SHALL have no subcategory assigned by default.
5. WHEN the selected category is `watches` or `glasses`, THE Admin_UI SHALL present the relevant subcategory options (mens/womens); the Admin MAY assign any subcategory to any category if needed.
6. WHEN the selected category is `clothing`, THE Admin_UI SHALL present the subcategory options: `track-pants`, `jeans`, `shirts`, `tshirts`, `denims`; WHEN a product already has a subcategory that is not in this list, THE Admin_UI SHALL allow the existing subcategory to remain.
7. WHEN an Admin attempts to proceed to Import Settings with one or more selected products that have no category assigned, THE Admin_UI SHALL block progression and display an error indicating which products require a category.

---

### Requirement 7: Pricing Rules

**User Story:** As an admin, I want to apply pricing rules to scraped products, so that Urbanex sale prices are calculated consistently from supplier source prices.

#### Acceptance Criteria

1. THE Pricing_Engine SHALL map the scraped source price to the `originalPrice` field (MRP / crossed-out price) on the Urbanex Product.
2. THE Pricing_Engine SHALL support four pricing modes: Fixed Amount Markup (`source + ₹X`, where X is between ₹0 and ₹999,999), Percentage Markup (`source + X%`, where X is between 0% and 1,000%), Combined Markup (`source + ₹X`, then `+ Y%`), and Manual Override (admin sets price per product).
3. WHEN a pricing rule is configured, THE Admin_UI SHALL display a live price preview for each selected product, recalculating within 500ms of the rule parameters changing.
4. THE Pricing_Engine SHALL support four rounding options applied after markup calculation: no rounding, round to nearest ₹49, round to nearest ₹99, and round to nearest ₹100.
5. WHEN Manual Override mode is selected for a product, THE Admin_UI SHALL allow the Admin to enter a specific sale price between ₹1 and ₹999,999 for that product, overriding the global pricing rule.
6. WHEN a ScrapedProduct has a zero or absent source price, THE Pricing_Engine SHALL require Manual Override for that product and SHALL NOT apply a markup rule to it.

---

### Requirement 8: Image Handling

**User Story:** As an admin, I want supplier images to be uploaded to Cloudinary by default, so that Urbanex controls its own image assets.

#### Acceptance Criteria

1. THE Image_Handler SHALL support two image modes: `cloudinary` (default) and `supplier-url`.
2. WHEN `cloudinary` mode is selected, THE Image_Handler SHALL download each supplier image and upload it to Cloudinary using the existing Cloudinary integration, then save the resulting Cloudinary URL to the Product.
3. WHEN a Cloudinary upload fails for an image, or when the supplier image URL is unreachable during download, THE Image_Handler SHALL fall back to saving the original supplier URL for that image and flag the failure in the import log with the affected image URL and failure reason; WHEN the logging itself fails, THE Image_Handler SHALL still proceed with saving the supplier URL, prioritising image preservation over audit completeness.
4. WHEN `supplier-url` mode is selected, THE Image_Handler SHALL save the supplier image URLs directly to the Product without uploading to Cloudinary.

---

### Requirement 9: Product Source Tracking

**User Story:** As a developer, I want the existing Product schema extended with source tracking fields, so that imported products can be identified and re-synced.

#### Acceptance Criteria

1. THE Product schema SHALL be extended with the following nullable fields: `source` (String, e.g., `"cartpe"`), `sourceId` (String, e.g., `"npi549885570"`), and `lastSync` (DateTime).
2. THE Product schema SHALL enforce a unique constraint on the combination of `source` and `sourceId`.
3. WHEN `source` and `sourceId` are both `null` (as they are for all existing manually-created products), THE database SHALL NOT enforce the unique constraint, preserving full backward compatibility with existing products.
4. WHEN only one of `source` or `sourceId` is provided without the other, THE system SHALL reject the operation with a 400 error response indicating both fields are required together.
5. WHEN an import attempts to create a product with a `source` and `sourceId` combination that already exists in the database, THE system SHALL reject the operation with a 409 error response indicating a duplicate source record.
6. THE schema migration SHALL be applied using `prisma migrate dev` with the migration name `add_product_source_tracking`.
7. THE Product schema SHALL NOT use `prisma db push` for this or any future schema change in production.

---

### Requirement 10: Import Process

**User Story:** As an admin, I want to confirm and execute a product import, so that selected products are saved to the Urbanex catalog using the existing product system.

#### Acceptance Criteria

1. WHEN an Admin clicks the final import confirmation, THE frontend SHALL send a single `POST /api/admin/scraper/import` request containing all selected products as a JSON array; THE frontend SHALL NOT call `POST /api/products` or `PUT /api/products/:id` directly, and SHALL NOT send one HTTP request per product.
2. THE Import_Engine SHALL process all selected products server-side within the single import request, using the existing Prisma `Product` model; the determination of create vs. update per product SHALL be based on whether a matching `source` + `sourceId` pair already exists in the database.
3. THE Import_Engine SHALL extract product creation and update logic into a reusable server-side function; this function SHALL be shared by both the existing `POST /api/products` / `PUT /api/products/:id` endpoints and the import endpoint so that validation rules are never duplicated.
4. WHEN a product has no BrandAssignment and the Admin has not explicitly chosen "No Brand", THE Import_Engine SHALL classify that product as a validation failure, record it in the log with reason `"brand required"`, and exclude it from the import without affecting other products.
5. THE Import_Engine SHALL complete all image handling (Cloudinary uploads or supplier URL resolution) for all products before opening any database transaction; no network I/O SHALL occur inside the transaction.
6. WHEN all image handling is complete and all products have been pre-validated, THE Import_Engine SHALL write only the validated Product records inside a single `prisma.$transaction()` call; products that failed pre-validation SHALL NOT be included in the transaction.
7. THE Import_Engine SHALL NOT create a separate product table, a separate product API, or a parallel catalog system.
8. THE Import_Engine SHALL NOT save any ScrapedProduct data to the database before the Admin clicks the final import confirmation.
9. WHEN an Admin attempts to trigger import with zero products selected, THE Import_Engine SHALL return a 400 error without opening a transaction or writing any data.
10. AFTER the transaction completes (whether it commits or rolls back), THE Import_Engine SHALL create a single ImportHistory record that accounts for all four outcome categories: successful imports (`successCount`), updates (`updatedCount`), pre-validation failures (`failureCount`), and admin-skipped or "No Brand" products (`skippedCount`); the `log` JSON array SHALL contain one entry per product with fields `sourceId`, `operation` (`created` / `updated` / `skipped` / `failed`), and `errorMessage` (present only when `operation` is `failed`).
11. WHEN a product is successfully imported or updated, THE Import_Engine SHALL set `lastSync` to the current timestamp on that Product record.

---

### Requirement 11: Import History Table

**User Story:** As a developer, I want an ImportHistory table in the database, so that admins can review past import sessions.

#### Acceptance Criteria

1. THE database SHALL contain an `ImportHistory` model with the fields: `id` (auto-increment Int), `source` (String), `sourceUrl` (String), `importedAt` (DateTime, default now), `totalScraped` (Int), `successCount` (Int), `failureCount` (Int), `skippedCount` (Int), `updatedCount` (Int), `log` (nullable JSON), and `createdAt` (DateTime, default now).
2. THE schema migration for ImportHistory SHALL be applied using `prisma migrate dev` with the migration name `add_import_history`.
3. THE Admin_UI SHALL display ImportHistory records in the History tab showing: import date, source website, and counts for imported, updated, skipped, and failed products.
4. THE Admin_UI SHALL provide per-record actions: View Details (shows full log), Re-import (pre-fills the scanner with the same source URL), and Delete History (removes the record with confirmation).

---

### Requirement 12: Manual Sync System

**User Story:** As an admin, I want to manually re-sync an imported product's price and stock from its source, so that the Urbanex catalog stays up to date.

#### Acceptance Criteria

1. WHEN an Admin views the Products section of the Admin Dashboard, THE Admin_UI SHALL display a `Source` column for products that have a non-null `source` field, showing the provider name, sourceId, last sync date, and a status of `Connected`.
2. WHEN an Admin triggers "Sync Now" for an imported product, THE Sync_Engine SHALL fetch the current data from the supplier using the product's `sourceId` and `sourceUrl`, then update the Product's `price`, `originalPrice`, and `inStock` fields, and set `lastSync` to the current timestamp.
3. WHERE the Admin has enabled optional sync fields (description, images, name), THE Sync_Engine SHALL also update those fields during a sync.
4. IF the product is not found at the source URL during a sync, THEN THE Sync_Engine SHALL set `inStock` to `false` and update the product's status display to `"Source Not Found"`; WHEN updating the status display fails, THE Sync_Engine SHALL still mark the product as out of stock. THE Sync_Engine SHALL NOT delete the product.
5. WHEN an Admin triggers "Disconnect Source" for an imported product, THE Admin_UI SHALL prompt for confirmation, then set `source`, `sourceId`, and `lastSync` to `null` on the Product, severing the sync link.

---

### Requirement 13: Scraper API Endpoints

**User Story:** As a developer, I want dedicated backend API endpoints for the scraper system, so that the frontend can drive the full import workflow.

#### Acceptance Criteria

1. THE Backend SHALL expose the following endpoints, all protected by the existing `adminAuth` middleware:
   - `POST /api/admin/scraper/scan` — initiates a scrape and returns ScrapedProducts
   - `POST /api/admin/scraper/import` — executes a confirmed import of selected products
   - `POST /api/admin/scraper/sync/:id` — syncs a single product by its Urbanex Product id
   - `GET /api/admin/scraper/history` — returns a paginated list of ImportHistory records
   - `GET /api/admin/scraper/history/:id` — returns a single ImportHistory record with full log
   - `DELETE /api/admin/scraper/history/:id` — deletes a single ImportHistory record
   - `GET /api/admin/scraper/brand-mappings` — returns all stored BrandMapping records
   - `POST /api/admin/scraper/brand-mappings` — creates or updates a BrandMapping record
2. WHEN `POST /api/admin/scraper/scan` is called without a valid URL or without a valid scope value, THE Backend SHALL return a 400 status code and a descriptive error message identifying the missing or invalid field.
3. WHEN `POST /api/admin/scraper/import` is called with an empty product selection array, THE Backend SHALL return a 400 status code and a descriptive error message.
4. WHEN any scraper endpoint is called without a valid `urbanex_admin_token` cookie, THE Backend SHALL return a 401 status code, consistent with the existing `adminAuth` middleware behaviour.

---

### Requirement 14: Admin Dashboard Integration

**User Story:** As an admin, I want a "Product Scraper" section in the existing Admin Dashboard sidebar, so that I can access the full import workflow without leaving the admin interface.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL include a "🕷 Product Scraper" navigation item in the existing sidebar, routing to the scraper section at `/admin/scraper`.
2. THE Scraper_Page SHALL follow the existing Admin Dashboard visual design system: dark theme (`#111` background), Oswald font for headings, red (`#CC0000`) accent color, and CSS Modules for styling.
3. THE Scraper_Page SHALL implement a stepper layout with the following steps in order: Scanner → Preview → Brand Mapping → Category Assignment → Brand Assignment → Import Settings → Import → History → Sync.
4. THE Scraper_Page SHALL reuse the existing toast notification system for success and error feedback.
5. THE Scraper_Page SHALL display loading states, error states, empty states, and progress bars during long-running operations such as scanning and importing; progress bars SHALL be hidden when no operations are active.
6. THE Scraper_Page SHALL be mobile responsive, consistent with the existing Admin Dashboard responsive behavior.
7. WHEN an Admin navigates to `/admin/scraper`, THE existing frontend middleware SHALL enforce authentication, redirecting unauthenticated users to `/admin/login`.

---

### Requirement 15: Brand Assignment

**User Story:** As an admin, I want to explicitly assign a brand to each scraped product before import, so that every imported product is correctly attributed and no brand is created without my approval.

#### Acceptance Criteria

1. THE Admin_UI SHALL present a Brand Assignment step immediately after Category Assignment in the stepper, showing all selected products in a table with columns: product name, detected brand name (from scraper), and a brand assignment control.
2. THE Brand_Assignment_Step SHALL pre-populate each product's brand assignment using the result of the Brand Mapping step (Requirement 5) where a resolved brand exists; products whose brand was auto-resolved via exact match or stored mapping SHALL display the resolved brand as pre-selected and allow the Admin to override it.
3. THE Admin_UI SHALL provide a bulk-apply control that allows the Admin to apply a single brand to all selected products at once; the bulk-apply control SHALL be disabled when no products are selected.
4. THE Admin_UI SHALL allow the Admin to assign brands individually per product, overriding any bulk assignment.
5. WHEN assigning a brand, THE Admin_UI SHALL present a searchable dropdown of all existing Urbanex Brand records fetched from `GET /api/brands`.
6. THE Admin_UI SHALL provide a "Create New Brand" option within the brand assignment control; WHEN selected, THE Admin_UI SHALL display a confirmation dialog requiring the Admin to enter the brand name and slug before the brand is created; THE system SHALL NOT create the brand until the Admin explicitly confirms.
7. THE Admin_UI SHALL provide a "No Brand" option per product that allows the Admin to explicitly mark a product as having no brand; WHEN "No Brand" is selected, THE Admin_UI SHALL display a warning that the product requires a brand to be saved in the existing system and that the product will be skipped during import unless a brand is assigned.
8. WHEN an Admin attempts to proceed from Brand Assignment to Import Settings with one or more selected products that have neither a brand assigned nor "No Brand" explicitly chosen, THE Admin_UI SHALL block progression and display an error listing the products that require a brand decision.
9. WHEN an Admin proceeds from Brand Assignment with products marked "No Brand", THE Import_Engine SHALL exclude those products from the import, increment `skippedCount`, and log each with operation `skipped` and reason `no-brand-assigned`.
10. THE Brand_Assignment_Step SHALL NOT automatically create any Brand record; all brand creation requires explicit Admin confirmation as defined in criterion 6.
