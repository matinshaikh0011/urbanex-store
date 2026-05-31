// ================================================================
// cartpeProvider.js — CartPe scraper implementation
//
// ARCHITECTURE: Two-phase design
//
// SCAN phase  (fast, <30s for 500+ products):
//   - Paginates the AJAX Load More endpoint
//   - Extracts name, price, MRP, thumbnail, sourceId, productUrl
//     directly from the listing HTML — NO detail page fetches
//   - Returns lightweight ScannedProduct objects immediately
//
// IMPORT phase (per selected product, at import time):
//   - Opens each selected product's detail page
//   - Extracts full images, description, sizes, stock status
//   - Returns enriched data for the import engine
// ================================================================

import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE = 'https://urbanex.cartpe.in';
const LOADMORE_URL = `${BASE}/allproductoadmore`;
// Use a real browser UA — CartPe's AJAX endpoint checks this
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_IMAGES = 20;
const DEFAULT_DELAY = 300;
// web_token is NOT hardcoded — it rotates and must be fetched fresh from the page before each scan.
// See fetchWebToken() below.

// ── Helpers ──────────────────────────────────────────────────────

/** Extract CartPe sourceId from a product URL */
function idFromUrl(url) {
  const m = String(url).match(/-((?:npi|lpi)?\d{6,})-urbanex\.html/i);
  return m ? m[1] : null;
}

/** Sleep with ±20% jitter */
function sleep(ms) {
  const jitter = ms * 0.2;
  const actual = ms - jitter + Math.random() * jitter * 2;
  return new Promise(r => setTimeout(r, Math.round(actual)));
}

/** Clamp delayMs to valid range */
function clampDelay(ms) {
  const n = Number(ms);
  if (isNaN(n)) return DEFAULT_DELAY;
  return Math.max(100, Math.min(10000, n));
}

/**
 * GET with automatic retries on transient failures (5xx, timeouts, network).
 * Does NOT retry on 404.
 */
async function fetchWithRetry(url, opts = {}) {
  const { retries = 3, baseDelay = 600, timeout = 15000, cookie = '' } = opts;
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const headers = { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' };
      if (cookie) headers['Cookie'] = cookie;
      return await axios.get(url, { headers, timeout });
    } catch (err) {
      lastErr = err;
      if (err.response?.status === 404) throw err;
      if (attempt < retries) {
        const backoff = baseDelay * attempt + Math.random() * 300;
        console.warn(`[CartPe] GET attempt ${attempt}/${retries} failed for ${url} (${err.response?.status || err.code || err.message}). Retrying in ${Math.round(backoff)}ms…`);
        await sleep(backoff);
      }
    }
  }
  throw lastErr;
}

/**
 * POST with automatic retries on transient failures.
 */
async function postWithRetry(url, body, opts = {}) {
  const { retries = 3, baseDelay = 600, timeout = 15000, referer = BASE, cookie = '' } = opts;
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        'Referer': referer,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': BASE,
      };
      if (cookie) headers['Cookie'] = cookie;
      return await axios.post(url, body, { headers, timeout });
    } catch (err) {
      lastErr = err;
      if (err.response?.status === 404) throw err;
      if (attempt < retries) {
        const backoff = baseDelay * attempt + Math.random() * 300;
        console.warn(`[CartPe] POST attempt ${attempt}/${retries} failed (${err.response?.status || err.code || err.message}). Retrying in ${Math.round(backoff)}ms…`);
        await sleep(backoff);
      }
    }
  }
  throw lastErr;
}

/**
 * Fetches the current web_token and session cookie from a CartPe page.
 * The token rotates — must be fetched fresh before each scan session.
 * @param {string} pageUrl - The CartPe page to fetch the token from
 * @returns {{ token: string, cookie: string }}
 */
async function fetchWebToken(pageUrl) {
  const { data: html, headers: resHeaders } = await axios.get(pageUrl, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
    timeout: 15000,
  });

  // Extract web_token from the page's inline JS
  const tokenMatch = html.match(/web_token\s*=\s*["']([a-f0-9]{40,})["']/i)
    || html.match(/["']web_token["']\s*:\s*["']([a-f0-9]{40,})["']/i);
  if (!tokenMatch) throw new Error('Could not extract web_token from CartPe page');
  const token = tokenMatch[1];

  // Extract session cookie (AWSALB or similar)
  const setCookie = resHeaders['set-cookie'] || [];
  const cookie = setCookie.map(c => c.split(';')[0]).join('; ');

  console.log(`[CartPe] Fetched fresh web_token: ${token.slice(0, 16)}… cookie: ${cookie ? 'yes' : 'none'}`);
  return { token, cookie };
}

// ── Brand detection ───────────────────────────────────────────────

const BRAND_PATTERNS = [
  [/\bnik[e]?\b/i, 'Nike'],
  [/\badidas\b/i, 'Adidas'],
  [/\bjordan\b|air jordan/i, 'Jordan'],
  [/\bpuma\b/i, 'Puma'],
  [/\bnew\s*balance\b/i, 'New Balance'],
  [/\breebok\b/i, 'Reebok'],
  [/\bconverse\b/i, 'Converse'],
  [/\bvans\b/i, 'Vans'],
  [/\basics\b/i, 'Asics'],
  [/\bfila\b/i, 'Fila'],
  [/\bunder\s*armour\b/i, 'Under Armour'],
  [/\bskechers\b/i, 'Skechers'],
  [/\brolex\b/i, 'Rolex'],
  [/\bomeg[a]?\b/i, 'Omega'],
  [/\bhublot\b/i, 'Hublot'],
  [/\btag\s*heuer\b/i, 'Tag Heuer'],
  [/\bcartie?r\b/i, 'Cartier'],
  [/\bray[\s-]?ban\b/i, 'Ray-Ban'],
  [/\boakley\b/i, 'Oakley'],
  [/\bgucci\b/i, 'Gucci'],
  [/\blouis\s*vuitton\b|lv\b/i, 'Louis Vuitton'],
  [/\bmichael\s*kors\b/i, 'Michael Kors'],
  [/\bprada\b/i, 'Prada'],
  [/\blevi[s']?\b/i, 'Levis'],
  [/\bh\s*&\s*m\b/i, 'H&M'],
  [/\bbalenciag[a]{1,3}\b/i, 'Balenciaga'],
  [/\bon\s*running\b|on\s*cloud\b/i, 'On Running'],
  [/\bonitsuka\s*tiger\b/i, 'Onitsuka Tiger'],
  [/\bbirkenstock\b/i, 'Birkenstock'],
  [/\bnorth\s*face\b/i, 'The North Face'],
  [/\bgues[s]?\b/i, 'Guess'],
];

function extractBrand(text) {
  for (const [pattern, brand] of BRAND_PATTERNS) {
    if (pattern.test(text)) return brand;
  }
  return null;
}

// ── Category mapping ──────────────────────────────────────────────

const CATEGORY_MAP = [
  { test: s => /watch/i.test(s) && /ladie|women/i.test(s), category: 'watches', subcategory: 'womens-watches' },
  { test: s => /watch/i.test(s) && /couple/i.test(s), category: 'watches', subcategory: 'couple-watches' },
  { test: s => /watch/i.test(s) && /luxury/i.test(s), category: 'luxury-watches', subcategory: null },
  { test: s => /watch/i.test(s), category: 'watches', subcategory: 'mens-watches' },
  { test: s => /t[\s-]?shirt|tshirt/i.test(s), category: 'clothing', subcategory: 'tshirts' },
  { test: s => /track\s*(pant|suit)|jogger/i.test(s), category: 'clothing', subcategory: 'track-pants' },
  { test: s => /jean|denim/i.test(s), category: 'clothing', subcategory: 'jeans' },
  { test: s => /shirt/i.test(s), category: 'clothing', subcategory: 'shirts' },
  { test: s => /shoe|sneaker|footwear|loafer|flipflop|croc|slide|mule|boot/i.test(s), category: 'sneakers', subcategory: null },
  { test: s => /sunglass|glass|eyewear|spectacle/i.test(s), category: 'glasses', subcategory: null },
  { test: s => /bag|handbag|purse|tote|clutch/i.test(s), category: 'handbags', subcategory: null },
  { test: s => /perfume|fragrance|cologne/i.test(s), category: 'clothing', subcategory: null },
  { test: s => /sock/i.test(s), category: 'clothing', subcategory: null },
];

function mapCategory(text) {
  if (!text) return { category: 'sneakers', subcategory: null };
  for (const entry of CATEGORY_MAP) {
    if (entry.test(text)) return { category: entry.category, subcategory: entry.subcategory };
  }
  return { category: 'clothing', subcategory: null };
}

// ── SCAN PHASE: Parse listing card ───────────────────────────────
// Extracts all data available directly from the AJAX listing HTML.
// No detail page fetch required.

function parseListingCard($, el) {
  const card = $(el);

  // Product URL and sourceId
  const link = card.find('a[href*="-urbanex.html"]').first();
  const rawHref = link.attr('href') || '';
  const productUrl = rawHref.startsWith('http')
    ? rawHref.split('?')[0]
    : rawHref ? `${BASE}${rawHref.split('?')[0]}` : null;
  const sourceId = productUrl ? idFromUrl(productUrl) : null;

  if (!productUrl || !sourceId) return null;

  // Name — from h5 > a or h4 > a
  const name = (card.find('h5 a, h4 a').first().text().trim()
    || card.find('h5, h4').first().text().trim()
    || link.text().trim()).replace(/\s+/g, ' ');

  if (!name) return null;

  // Prices — h4 contains sale price, span.old-price contains MRP
  const salePriceText = card.find('h4').first().clone().children().remove().end().text().replace(/[^\d.]/g, '');
  const mrpText = card.find('.old-price, .text-muted').first().text().replace(/[^\d.]/g, '');
  const sourcePrice = parseFloat(salePriceText) || 0;
  const originalPrice = parseFloat(mrpText) || null;

  // Thumbnail — gallery_sm image from listing
  const imgEl = card.find('img.img-responsive, img').first();
  const imgSrc = imgEl.attr('src') || imgEl.attr('data-src') || '';
  // Upgrade sm → lg for better quality thumbnail
  const thumbnail = imgSrc
    ? imgSrc.replace('/gallery_sm/', '/gallery_lg/').replace('/gallery_md/', '/gallery_lg/')
    : null;

  // Brand — from product name (listing has no separate brand field)
  const brandName = extractBrand(name);

  // Category — infer from product name (listing has no category field)
  const { category: suggestedCategory, subcategory: suggestedSubcategory } = mapCategory(name);

  return {
    name,
    sourcePrice,
    originalPrice,
    thumbnail,
    brandName,
    productUrl,
    sourceId,
    suggestedCategory,
    suggestedSubcategory,
    // These are populated at import time, not scan time
    images: thumbnail ? [thumbnail] : [],
    description: null,
    sizes: {},
    inStock: true, // assume in stock; verified at import time
  };
}

// ── SCAN PHASE: Paginate AJAX endpoint ───────────────────────────
// Collects all product listing data without opening any detail pages.
// CartPe AJAX params (extracted from page JS):
//   getresult   = current row_no (starts at 0, increments by 24)
//   searchkey   = search keyword (empty for category/full pages)
//   web_token   = hardcoded token embedded in every CartPe page

async function scanListings(options = {}) {
  const { delayMs = DEFAULT_DELAY, pageUrl = null, searchKey = '', webToken, cookie = '' } = options;
  const delay = clampDelay(delayMs);
  const seen = new Set();
  const products = [];
  let rowNo = 0;
  const pageSize = 24;
  let pagesFetched = 0;
  let consecutiveEmpty = 0;
  let consecutiveErrors = 0;
  const pageErrors = [];

  console.log(`[CartPe] SCAN starting — searchKey="${searchKey}" pageUrl="${pageUrl || 'none'}"`);

  while (true) {
    try {
      const params = new URLSearchParams({
        getresult:      String(rowNo),
        searchkey:      searchKey,
        web_token:      webToken,
        orderby:        '',
        cat_ids:        '',
        min_price:      '0',
        max_price:      '0',
        size_ids:       '',
        variant_status: '0',
      });

      const { data: html } = await postWithRetry(LOADMORE_URL, params.toString(), {
        retries: 3, timeout: 15000, referer: pageUrl || BASE, cookie,
      });

      pagesFetched++;
      consecutiveErrors = 0;

      const $ = cheerio.load(html);
      let newCount = 0;

      // Each product card is .product-disp or contains .product-details
      $('div.product-disp, div.product-details').each((_, el) => {
        const parsed = parseListingCard($, el);
        if (!parsed || seen.has(parsed.sourceId)) return;
        seen.add(parsed.sourceId);
        products.push(parsed);
        newCount++;
      });

      console.log(`[CartPe] Page ${pagesFetched} (row_no=${rowNo}): ${newCount} new products (total: ${products.length})`);

      if (newCount === 0) {
        consecutiveEmpty++;
        if (consecutiveEmpty >= 2) {
          console.log(`[CartPe] SCAN complete — ${pagesFetched} pages, ${products.length} products`);
          break;
        }
      } else {
        consecutiveEmpty = 0;
      }

      rowNo += pageSize;
      await sleep(delay);
    } catch (err) {
      consecutiveErrors++;
      pageErrors.push({ rowNo, error: err.response?.status ? `HTTP ${err.response.status}` : err.message });
      console.error(`[CartPe] Page at row_no=${rowNo} failed: ${err.message}. Skipping.`);
      if (consecutiveErrors >= 5) {
        console.error(`[CartPe] ${consecutiveErrors} consecutive failures — stopping pagination.`);
        break;
      }
      rowNo += pageSize;
      await sleep(delay);
    }
  }

  return { products, pagesFetched, pageErrors };
}

// ── IMPORT PHASE: Fetch detail page ──────────────────────────────
// Called only for products the admin has selected for import.
// Enriches a ScannedProduct with full images, description, sizes, stock.

async function fetchProductDetail(productUrl) {
  const { data: html } = await fetchWithRetry(productUrl, { retries: 3, timeout: 15000 });
  const $ = cheerio.load(html);

  // Full images — ONLY from the main product gallery (#carousel-custom), NOT related products.
  //
  // CartPe DOM structure (confirmed from live HTML):
  //
  //   section#products
  //     #carousel-custom                        ← MAIN PRODUCT GALLERY (safe zone)
  //       .carousel-inner
  //         .item > .category-img > img         ← main slides (gallery_md)
  //       .items
  //         div[data-slide-to] > img            ← thumbnail strip (gallery_md)
  //
  //   section#best-seller                       ← RELATED PRODUCTS (must exclude)
  //     .owl-carousel
  //       .item > .product-details
  //         .slider-for > .product-img-big > img  ← these are OTHER products' images
  //
  // The old selector used .slider-for/.product-img-big which exists in BOTH sections.
  // The new selector is scoped strictly to #carousel-custom so related products
  // are never touched.
  const imageSet = new Set();

  // Primary: main carousel slides + thumbnail strip — both live inside #carousel-custom
  $('#carousel-custom .carousel-inner .item img, #carousel-custom .items img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy') || '';
    if (src && /cdn\.cartpe\.in/i.test(src) && !/logo|banner|icon/i.test(src)) {
      imageSet.add(src.replace('/gallery_sm/', '/gallery_lg/').replace('/gallery_md/', '/gallery_lg/'));
    }
  });

  const galleryImages = Array.from(imageSet);
  console.log('Gallery images found:', galleryImages.length);

  // Fallback: if #carousel-custom found nothing, use only the first main product image
  // (scoped to section#products to avoid pulling from related products)
  if (galleryImages.length === 0) {
    console.log('Gallery images found: 0 — falling back to main product image only');
    const firstImg = $('section#products .category-img img, section#products #carousel-custom img').first();
    const src = firstImg.attr('src') || firstImg.attr('data-src') || '';
    if (src && /cdn\.cartpe\.in/i.test(src)) {
      imageSet.add(src.replace('/gallery_sm/', '/gallery_lg/').replace('/gallery_md/', '/gallery_lg/'));
    }
  }

  const images = Array.from(imageSet).slice(0, MAX_IMAGES);

  // Sizes — extracted from the product's own size selector (.size_click buttons).
  // CartPe HTML: <a class="size_click active" ...>42</a>
  // These live inside section#products only, so no risk of picking up related product sizes.
  const sizeValues = [];
  $('section#products .size_click, .size-setup .size_click').each((_, el) => {
    const s = $(el).text().trim();
    if (s) sizeValues.push(s);
  });

  // Build a sizes object matching the frontend's expected shape:
  //   { US: ['42','43','44'] }  for shoes/sneakers
  //   { oneSize: ['One Size'] } when no sizes found (watches, bags, glasses, etc.)
  let sizes;
  if (sizeValues.length > 0) {
    sizes = { US: sizeValues };
  } else {
    sizes = { oneSize: ['One Size'] };
  }
  console.log(`[CartPe sizes] found=${sizeValues.length} sizes=${JSON.stringify(sizes)}`);

  // Description
  const description = $('.product-description, .description, #description, [class*="desc"]')
    .first().text().trim().slice(0, 1000) || null;

  // Stock
  const inStock = !/out\s*of\s*stock|sold\s*out/i.test($('body').text());

  // Prices — scoped strictly to the main product details section (#price_div / .price-area).
  //
  // CartPe HTML (confirmed from live page):
  //   section#products
  //     #price_div  (h3.price-area)
  //       <i class="fa fa-rupee-sign"></i>3199.00          ← selling price (text node)
  //       <span class="text-muted" style="text-decoration:line-through">
  //         <i class="fa fa-rupee-sign"></i>8999.00         ← original/MRP
  //       </span>
  //
  // The old selectors (.new-price, .old-price, strike, del) did NOT match CartPe's
  // actual markup, causing the fallback to scan the whole page (h3/h4) and pick up
  // prices from Related Products.

  let sourcePrice = 0;
  let originalPrice = null;

  // 1. Selling price: text node inside #price_div / .price-area, EXCLUDING the MRP span
  const priceContainer = $('#price_div, h3.price-area, .price-area').first();
  if (priceContainer.length) {
    // Clone, remove the struck-through MRP span, read remaining text
    const clone = priceContainer.clone();
    clone.find('span[style*="line-through"], .text-muted, strike, del, s').remove();
    const sellingText = clone.text().replace(/[^\d.]/g, '');
    const sellingVal = parseFloat(sellingText);
    if (sellingVal >= 1) sourcePrice = sellingVal;

    // 2. Original price: the struck-through span inside the same container
    const mrpSpan = priceContainer.find('span[style*="line-through"], .text-muted').first();
    const mrpText = mrpSpan.text().replace(/[^\d.]/g, '');
    const mrpVal = parseFloat(mrpText);
    if (mrpVal >= 1) originalPrice = mrpVal;

    console.log(`[CartPe price] name=unknown selector=#price_div/.price-area selling=${sourcePrice} original=${originalPrice}`);
  }

  // 3. Fallback: if #price_div not found, scan ONLY section#products (not the whole page)
  if (sourcePrice === 0) {
    const productSection = $('section#products, #page-start');
    const allPrices = [];
    productSection.find('h3, h4, .price, [class*="price"]').each((_, el) => {
      // Skip elements that are inside related-products section
      if ($(el).closest('#best-seller, .best-seller, .related-products, .owl-carousel').length) return;
      const nums = $(el).text().match(/[\d,]+\.?\d*/g);
      if (nums) nums.forEach((n) => {
        const v = parseFloat(n.replace(/,/g, ''));
        if (v >= 100 && v <= 9999999) allPrices.push(v);
      });
    });
    const sorted = [...new Set(allPrices)].sort((a, b) => a - b);
    if (sorted.length >= 2) { sourcePrice = sorted[0]; originalPrice = sorted[sorted.length - 1]; }
    else if (sorted.length === 1) { sourcePrice = sorted[0]; }
    console.log(`[CartPe price] fallback — selling=${sourcePrice} original=${originalPrice} candidates=${JSON.stringify(sorted)}`);
  }

  // 4. Validation: originalPrice must always be > selling price
  if (!originalPrice || originalPrice <= sourcePrice) {
    originalPrice = Math.round(sourcePrice * 1.4);
    console.log(`[CartPe price] originalPrice corrected to ${originalPrice} (was <= selling price or missing)`);
  }

  // Category from breadcrumb
  const breadcrumbs = [];
  $('ol.breadcrumb li, .breadcrumb li').each((_, el) => breadcrumbs.push($(el).text().trim()));
  const cartpeCategory = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;

  return { images, description, inStock, sourcePrice, originalPrice, cartpeCategory, sizes };
}

// ── Main scrape() — SCAN phase only ──────────────────────────────
// This is what the /api/admin/scraper/scan endpoint calls.
// Returns immediately after paginating listings — no detail pages opened.

async function scrape(url, scope, options = {}) {
  const delay = clampDelay(options.delayMs ?? DEFAULT_DELAY);
  const scanStart = Date.now();

  if (scope === 'product') {
    // Single product: fetch the detail page directly
    try {
      const detail = await fetchProductDetail(url);
      const sourceId = idFromUrl(url);
      const name = url.split('/').pop().replace(/-npi\d+.*/, '').replace(/-/g, ' ').trim();
      const product = {
        name, sourcePrice: detail.sourcePrice, originalPrice: detail.originalPrice,
        thumbnail: detail.images[0] || null, images: detail.images,
        description: detail.description, brandName: extractBrand(name),
        productUrl: url.split('?')[0], sourceId,
        suggestedCategory: mapCategory(detail.cartpeCategory || name).category,
        suggestedSubcategory: mapCategory(detail.cartpeCategory || name).subcategory,
        inStock: detail.inStock, sizes: detail.sizes,
      };
      return {
        products: [product], failedUrls: [], pagesFetched: 1, pageErrors: [],
        stats: { productsFound: 1, productsReturned: 1, duplicateCount: 0, failedCount: 0, pagesFetched: 1, scanDuration: Date.now() - scanStart },
      };
    } catch (err) {
      return {
        products: [], failedUrls: [{ url, error: err.message }], pagesFetched: 1, pageErrors: [],
        stats: { productsFound: 0, productsReturned: 0, duplicateCount: 0, failedCount: 1, pagesFetched: 1, scanDuration: Date.now() - scanStart },
      };
    }
  }

  // category / full — paginate listings only, no detail pages
  let searchKey = '';
  try {
    const parsed = new URL(url);
    searchKey = parsed.searchParams.get('searchkeyword') || parsed.searchParams.get('search') || '';
  } catch { /* ignore */ }

  // Fetch fresh web_token and session cookie from the page before scanning.
  // The token rotates — hardcoding it causes 403s after it changes.
  let webToken = '';
  let cookie = '';
  try {
    const tokenData = await fetchWebToken(url);
    webToken = tokenData.token;
    cookie = tokenData.cookie;
  } catch (err) {
    console.error(`[CartPe] Failed to fetch web_token: ${err.message}. Scan may fail with 403.`);
  }

  const { products, pagesFetched, pageErrors } = await scanListings({
    delayMs: delay, pageUrl: url, searchKey, webToken, cookie,
  });

  // Fallback: if AJAX returned nothing, parse the page directly
  if (products.length === 0) {
    console.log('[CartPe] AJAX returned 0 products, falling back to direct page parse…');
    try {
      const { data: html } = await fetchWithRetry(url, { retries: 2, timeout: 15000, cookie });
      const $ = cheerio.load(html);
      const seen = new Set();
      $('div.product-disp, div.product-details').each((_, el) => {
        const parsed = parseListingCard($, el);
        if (!parsed || seen.has(parsed.sourceId)) return;
        seen.add(parsed.sourceId);
        products.push(parsed);
      });
      console.log(`[CartPe] Fallback found ${products.length} products`);
    } catch (err) {
      console.error(`[CartPe] Fallback also failed: ${err.message}`);
    }
  }

  const scanDuration = Date.now() - scanStart;
  console.log(`[CartPe] SCAN complete: ${products.length} products in ${scanDuration}ms (${pagesFetched} AJAX pages)`);

  return {
    products,
    failedUrls: [],
    pagesFetched,
    pageErrors,
    stats: {
      productsFound: products.length,
      productsReturned: products.length,
      duplicateCount: 0, // filled in by the scan endpoint after DB check
      failedCount: pageErrors.length,
      pagesFetched,
      scanDuration,
    },
  };
}

// ── syncProduct — re-fetch a single product for sync ─────────────

async function syncProduct(sourceId, sourceUrl) {
  if (!sourceUrl) throw new Error(`Cannot sync product ${sourceId}: sourceUrl is required`);
  try {
    const detail = await fetchProductDetail(sourceUrl);
    return {
      price: detail.sourcePrice,
      originalPrice: detail.originalPrice,
      inStock: detail.inStock,
      description: detail.description || null,
      images: detail.images.length > 0 ? detail.images : null,
      sizes: detail.sizes,   // always include — never leave sizes stale
      notFound: false,
    };
  } catch (err) {
    if (err.response?.status === 404) return { price: 0, originalPrice: null, inStock: false, sizes: null, notFound: true };
    throw err;
  }
}

// ── Provider export ───────────────────────────────────────────────

const cartpeProvider = {
  name: 'cartpe',
  displayName: 'CartPe',
  supportedScopes: ['full', 'category', 'product'],
  scrape,
  syncProduct,
  extractBrand: (productData) => extractBrand(productData.name || ''),
  // Exposed for the import endpoint to enrich selected products
  fetchProductDetail,
};

export default cartpeProvider;
export { idFromUrl, mapCategory, extractBrand, fetchProductDetail };
