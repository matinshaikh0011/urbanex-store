// ================================================================
// cartpeProvider.js — CartPe scraper implementation
// Scrapes urbanex.cartpe.in via their internal AJAX endpoint.
// ================================================================

import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE = 'https://urbanex.cartpe.in';
const LOADMORE_URL = `${BASE}/allproductoadmore`;
const UA = 'Mozilla/5.0 (compatible; UrbanExSync/1.0; +https://shopurbanex.com)';
const MAX_IMAGES = 20;
const DEFAULT_DELAY = 500;
// web_token is embedded in every CartPe page — required for the AJAX Load More endpoint
const WEB_TOKEN = '7d7a244423cfeb4ada709faeaaa457dda9022be990fefe9918440cfbd4f0ed169d156e331c366d37018f06f98ae835b6df047cc72526d3a49e5d030d07652d9c';

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
 * GET a URL with automatic retries on transient failures (5xx, timeouts, network).
 * Does NOT retry on 404 (permanent). Returns the response data or throws after maxRetries.
 * @param {string} url
 * @param {object} opts - { retries, baseDelay, timeout }
 */
async function fetchWithRetry(url, opts = {}) {
  const { retries = 3, baseDelay = 600, timeout = 15000 } = opts;
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await axios.get(url, { headers: { 'User-Agent': UA }, timeout });
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      // Don't retry on 404 — the resource is permanently gone
      if (status === 404) throw err;
      // Retry on 5xx, timeouts, and network errors
      if (attempt < retries) {
        const backoff = baseDelay * attempt + Math.random() * 300;
        console.warn(`[CartPe] fetch attempt ${attempt}/${retries} failed for ${url} (${status || err.code || err.message}). Retrying in ${Math.round(backoff)}ms…`);
        await sleep(backoff);
      }
    }
  }
  throw lastErr;
}

/**
 * POST to a URL with automatic retries on transient failures.
 * @param {string} url
 * @param {string} body - url-encoded body
 * @param {object} opts
 */
async function postWithRetry(url, body, opts = {}) {
  const { retries = 3, baseDelay = 600, timeout = 15000, referer = BASE } = opts;
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': UA,
          'Referer': referer,
          'X-Requested-With': 'XMLHttpRequest',
        },
        timeout,
      });
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      if (status === 404) throw err;
      if (attempt < retries) {
        const backoff = baseDelay * attempt + Math.random() * 300;
        console.warn(`[CartPe] POST attempt ${attempt}/${retries} failed (${status || err.code || err.message}). Retrying in ${Math.round(backoff)}ms…`);
        await sleep(backoff);
      }
    }
  }
  throw lastErr;
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
  [/\basics\b|\basics\b/i, 'Asics'],
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

function extractBrand(productData) {
  const text = `${productData.name || ''} ${productData.description || ''}`;
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

function mapCategory(cartpeCategory) {
  if (!cartpeCategory) return { category: 'sneakers', subcategory: null };
  for (const entry of CATEGORY_MAP) {
    if (entry.test(cartpeCategory)) {
      return { category: entry.category, subcategory: entry.subcategory };
    }
  }
  return { category: 'clothing', subcategory: null };
}

// ── HTML parsing ──────────────────────────────────────────────────

function parseDetail(html, url) {
  const $ = cheerio.load(html);

  // Name — try h1 first, then last breadcrumb item
  let name = $('h1').first().text().trim();
  if (!name) {
    const crumbs = $('ol.breadcrumb li, .breadcrumb li');
    name = crumbs.last().text().trim();
  }
  if (!name) name = $('title').text().split('|')[0].trim();

  // Prices — look for rupee symbols
  let sourcePrice = 0;
  let originalPrice = null;

  // CartPe typically shows: <span class="old-price">₹8999</span> <span class="new-price">₹3199</span>
  // Also: <h4>₹3199.00 <span class="old-price">₹8999.00</span></h4>
  const oldPriceText = $('.old-price, .price-old, strike, del, s').first().text().replace(/[^\d.]/g, '');
  const newPriceText = $('.new-price, .price-new, .special-price, .product-price').first().text().replace(/[^\d.]/g, '');

  if (newPriceText && parseFloat(newPriceText) > 0) {
    sourcePrice = parseFloat(newPriceText);
    if (oldPriceText && parseFloat(oldPriceText) > 0) originalPrice = parseFloat(oldPriceText);
  } else {
    // Fallback: scan all text nodes for ₹ amounts — collect all, use smallest as sale price, largest as MRP
    const allPrices = new Set();
    $('*').each((_, el) => {
      const children = $(el).children();
      if (children.length > 0) return; // only leaf nodes
      const t = $(el).text().trim();
      if (/₹/.test(t) || /rs\.?\s*\d/i.test(t)) {
        const nums = t.match(/[\d,]+\.?\d*/g);
        if (nums) nums.forEach(n => {
          const v = parseFloat(n.replace(/,/g, ''));
          if (v >= 100 && v <= 9999999) allPrices.add(v);
        });
      }
    });
    // Also check h3/h4 elements which CartPe uses for prices
    $('h3, h4, .price, [class*="price"]').each((_, el) => {
      const t = $(el).text();
      const nums = t.match(/[\d,]+\.?\d*/g);
      if (nums) nums.forEach(n => {
        const v = parseFloat(n.replace(/,/g, ''));
        if (v >= 100 && v <= 9999999) allPrices.add(v);
      });
    });
    const sorted = Array.from(allPrices).sort((a, b) => a - b);
    if (sorted.length >= 2) {
      sourcePrice = sorted[0];
      originalPrice = sorted[sorted.length - 1];
    } else if (sorted.length === 1) {
      sourcePrice = sorted[0];
    }
  }

  // Images — prefer gallery_md or gallery_lg CDN paths
  const imageSet = new Set();
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    if (src && /cdn\.cartpe\.in/i.test(src) && !/logo|banner|icon/i.test(src)) {
      // Upgrade to larger size if possible
      const large = src.replace('/gallery_sm/', '/gallery_lg/').replace('/gallery_md/', '/gallery_lg/');
      imageSet.add(large);
    }
  });
  const images = Array.from(imageSet).slice(0, MAX_IMAGES);

  // Description
  const description = $('.product-description, .description, #description, [class*="desc"]')
    .first().text().trim().slice(0, 1000) || null;

  // Stock
  const inStock = !/out\s*of\s*stock|sold\s*out/i.test($('body').text());

  // Category from breadcrumb
  const breadcrumbs = [];
  $('ol.breadcrumb li, .breadcrumb li').each((_, el) => breadcrumbs.push($(el).text().trim()));
  const cartpeCategory = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;

  const sourceId = idFromUrl(url);

  return { name, sourcePrice, originalPrice, description, images, inStock, cartpeCategory, sourceId, productUrl: url };
}

// ── Product URL collection ────────────────────────────────────────
// CartPe's Load More AJAX uses these POST params (extracted from page JS):
//   getresult   = current row_no (starts at 0, increments by 24 per page)
//   searchkey   = search keyword (empty string for category/full pages)
//   web_token   = hardcoded token embedded in every CartPe page
//   orderby     = sort order (empty = default)
//   cat_ids     = comma-separated category IDs (empty = all)
//   min_price   = price filter min (0 = no filter)
//   max_price   = price filter max (0 = no filter)
//   size_ids    = size filter (empty = all)
//   variant_status = 0

async function collectProductUrls(options = {}) {
  const { delayMs = DEFAULT_DELAY, pageUrl = null, searchKey = '' } = options;
  const delay = clampDelay(delayMs);
  const seen = new Set();
  const urls = [];
  let rowNo = 0;
  const pageSize = 24;
  let pagesFetched = 0;
  let consecutiveEmpty = 0;
  let consecutiveErrors = 0;
  const pageErrors = [];

  console.log(`[CartPe] Starting pagination — searchKey="${searchKey}" pageUrl="${pageUrl || 'none'}"`);

  while (true) {
    try {
      const params = new URLSearchParams({
        getresult:      String(rowNo),
        searchkey:      searchKey,
        web_token:      WEB_TOKEN,
        orderby:        '',
        cat_ids:        '',
        min_price:      '0',
        max_price:      '0',
        size_ids:       '',
        variant_status: '0',
      });

      // postWithRetry retries up to 3x on 5xx / network errors before throwing
      const { data: html } = await postWithRetry(LOADMORE_URL, params.toString(), {
        retries: 3,
        timeout: 15000,
        referer: pageUrl || BASE,
      });

      pagesFetched++;
      consecutiveErrors = 0; // reset on success

      // Extract product links from the HTML fragment
      const $ = cheerio.load(html);
      const newLinks = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (/-urbanex\.html/i.test(href) && !/whatsapp/i.test(href)) {
          const full = href.startsWith('http') ? href : `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
          // Strip query string for dedup
          const cleanUrl = full.split('?')[0];
          const sid = idFromUrl(cleanUrl);
          if (sid && !seen.has(sid)) {
            seen.add(sid);
            newLinks.push(cleanUrl);
          }
        }
      });

      console.log(`[CartPe] Page ${pagesFetched} (row_no=${rowNo}): ${newLinks.length} new products (total so far: ${urls.length + newLinks.length})`);

      if (newLinks.length === 0) {
        consecutiveEmpty++;
        // Stop after 2 consecutive empty pages — pagination exhausted
        if (consecutiveEmpty >= 2) {
          console.log(`[CartPe] Pagination complete — ${pagesFetched} AJAX pages fetched, ${urls.length} unique products found`);
          break;
        }
      } else {
        consecutiveEmpty = 0;
        urls.push(...newLinks);
      }

      rowNo += pageSize;
      await sleep(delay);
    } catch (err) {
      // A page failed even after retries — record it, skip forward, and continue.
      // Do NOT abort the whole pagination on a single failed page.
      consecutiveErrors++;
      pageErrors.push({ rowNo, error: err.response?.status ? `HTTP ${err.response.status}` : err.message });
      console.error(`[CartPe] Page at row_no=${rowNo} failed after retries: ${err.message}. Skipping forward.`);

      // Safety valve: if many pages fail back-to-back the endpoint is likely down — stop.
      if (consecutiveErrors >= 5) {
        console.error(`[CartPe] ${consecutiveErrors} consecutive page failures — stopping pagination. Returning ${urls.length} products collected so far.`);
        break;
      }

      // Skip this page's offset and keep going
      rowNo += pageSize;
      await sleep(delay);
    }
  }

  return { urls, pagesFetched, pageErrors };
}

// ── Main scrape function ──────────────────────────────────────────

async function scrape(url, scope, options = {}) {
  const delay = clampDelay(options.delayMs ?? DEFAULT_DELAY);
  const products = [];
  const failedUrls = [];

  // Reachability pre-check ONLY for category/full scopes, and only a genuine
  // network-level failure (DNS, connection refused, timeout) is fatal.
  // An HTTP error code (404/500) on the landing page is NOT fatal because
  // category/full scopes use the AJAX endpoint, and product scope handles
  // per-URL failures in the batch loop below.
  if (scope !== 'product') {
    try {
      await axios.head(url, { headers: { 'User-Agent': UA }, timeout: 10000 });
    } catch (err) {
      const isNetworkError = !err.response && ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNABORTED', 'EAI_AGAIN'].includes(err.code);
      if (isNetworkError) {
        throw new Error(`Supplier URL unreachable: ${url} — ${err.message}`);
      }
      // HTTP error code on HEAD — log and continue; AJAX endpoint may still work
      console.warn(`[CartPe] HEAD check returned ${err.response?.status || err.code} for ${url} — continuing via AJAX endpoint`);
    }
  }

  let productUrls = [];
  let pagesFetched = 0;
  let pageErrors = [];

  if (scope === 'product') {
    productUrls = [url];
    pagesFetched = 1;
  } else {
    // Extract searchKey from URL query string if present
    let searchKey = '';
    try {
      const parsed = new URL(url);
      searchKey = parsed.searchParams.get('searchkeyword') || parsed.searchParams.get('search') || '';
    } catch { /* ignore */ }

    // Use the AJAX Load More endpoint with correct parameters
    const result = await collectProductUrls({
      delayMs: delay,
      pageUrl: url,
      searchKey,
    });
    productUrls = result.urls;
    pagesFetched = result.pagesFetched;
    pageErrors = result.pageErrors || [];

    // If AJAX returned nothing, fall back to parsing the page directly
    if (productUrls.length === 0) {
      console.log('[CartPe] AJAX returned 0 products, falling back to direct page parse…');
      try {
        const { data: html } = await fetchWithRetry(url, { retries: 2, timeout: 15000 });
        const $ = cheerio.load(html);
        const seen = new Set();
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href') || '';
          if (/-urbanex\.html/i.test(href) && !/whatsapp/i.test(href)) {
            const full = href.startsWith('http') ? href : `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
            const cleanUrl = full.split('?')[0];
            const sid = idFromUrl(cleanUrl);
            if (sid && !seen.has(sid)) {
              seen.add(sid);
              productUrls.push(cleanUrl);
            }
          }
        });
        console.log(`[CartPe] Fallback found ${productUrls.length} products from direct page parse`);
      } catch (err) {
        // Even the fallback failed — return empty results rather than throwing.
        console.error(`[CartPe] Fallback page parse also failed: ${err.message}`);
        return {
          products: [],
          failedUrls: [{ url, error: err.message }],
          pagesFetched,
          pageErrors,
          stats: { totalFound: 0, successful: 0, failed: 0, pagesFetched, pageErrors: pageErrors.length },
        };
      }
    }
  }

  const totalFound = productUrls.length;
  console.log(`[CartPe] Fetching ${totalFound} product detail pages (${pagesFetched} AJAX pages, ${pageErrors.length} page errors)…`);

  // ── Fetch detail pages in batches with Promise.allSettled ──
  // A single failed product NEVER aborts the scan. Each fetch is wrapped in
  // fetchWithRetry (3 attempts) and the batch uses allSettled so rejections
  // are isolated. Batching keeps concurrency bounded to avoid hammering CartPe.
  const BATCH_SIZE = 5;

  async function fetchOne(productUrl) {
    const { data: html } = await fetchWithRetry(productUrl, { retries: 3, timeout: 15000 });
    const parsed = parseDetail(html, productUrl);
    if (!parsed.name || !parsed.productUrl) {
      throw new Error('Missing name or URL after parse');
    }
    const brandName = extractBrand(parsed);
    const { category, subcategory } = mapCategory(parsed.cartpeCategory);
    return {
      name: parsed.name,
      sourcePrice: parsed.sourcePrice,
      originalPrice: parsed.originalPrice,
      description: parsed.description,
      images: parsed.images,
      brandName,
      productUrl: parsed.productUrl,
      sourceId: parsed.sourceId,
      cartpeCategory: parsed.cartpeCategory,
      suggestedCategory: category,
      suggestedSubcategory: subcategory,
      inStock: parsed.inStock,
    };
  }

  for (let i = 0; i < productUrls.length; i += BATCH_SIZE) {
    const batch = productUrls.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(batch.map(u => fetchOne(u)));

    settled.forEach((res, idx) => {
      if (res.status === 'fulfilled') {
        products.push(res.value);
      } else {
        const productUrl = batch[idx];
        const reason = res.reason?.response?.status
          ? `HTTP ${res.reason.response.status}`
          : (res.reason?.message || 'Unknown error');
        console.error(`[CartPe] Failed to fetch ${productUrl}: ${reason}`);
        failedUrls.push({ url: productUrl, error: reason });
      }
    });

    // Polite delay between batches (not between every single request)
    if (i + BATCH_SIZE < productUrls.length) await sleep(delay);
  }

  const stats = {
    totalFound,
    successful: products.length,
    failed: failedUrls.length,
    pagesFetched,
    pageErrors: pageErrors.length,
  };

  console.log(`[CartPe] Scrape complete: ${products.length}/${totalFound} products OK, ${failedUrls.length} failed, ${pagesFetched} AJAX pages, ${pageErrors.length} page errors`);
  return { products, failedUrls, pagesFetched, pageErrors, stats };
}

// ── Sync single product ───────────────────────────────────────────

async function syncProduct(sourceId, sourceUrl) {
  if (!sourceUrl) {
    throw new Error(`Cannot sync product ${sourceId}: sourceUrl is required`);
  }
  try {
    const { data: html } = await axios.get(sourceUrl, {
      headers: { 'User-Agent': UA },
      timeout: 15000,
    });
    const parsed = parseDetail(html, sourceUrl);
    return {
      price: parsed.sourcePrice,
      originalPrice: parsed.originalPrice,
      inStock: parsed.inStock,
      name: parsed.name || null,
      description: parsed.description || null,
      images: parsed.images.length > 0 ? parsed.images : null,
      notFound: false,
    };
  } catch (err) {
    if (err.response?.status === 404) {
      return { price: 0, originalPrice: null, inStock: false, notFound: true };
    }
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
  extractBrand,
};

export default cartpeProvider;
export { idFromUrl, mapCategory, extractBrand, parseDetail };
