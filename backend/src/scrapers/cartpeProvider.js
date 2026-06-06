// ================================================================
// cartpeProvider.js — Generic CartPe scraper
//
// Works with ANY *.cartpe.in store. The store base URL and slug
// pattern are derived at runtime from the URL passed to scrape().
//
// ARCHITECTURE: Two-phase design
//
// SCAN phase  (fast, no detail pages):
//   - Paginates the AJAX Load More endpoint
//   - Extracts name, price, MRP, thumbnail, sourceId, productUrl
//     directly from the listing HTML
//   - Emits progress via onProgress callback (for background jobs)
//
// IMPORT phase (per selected product):
//   - Opens each selected product's detail page
//   - Extracts full images, description, sizes, stock status
// ================================================================

import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_IMAGES = 20;
const DEFAULT_DELAY = 300;

// ── URL helpers ──────────────────────────────────────────────────

/**
 * Given any CartPe product URL, extract the store slug
 * (subdomain, e.g. "urbanex" from "urbanex.cartpe.in").
 */
function storeSlugFromUrl(url) {
  try {
    const host = new URL(url).hostname; // e.g. "urbanex.cartpe.in"
    return host.split('.')[0];          // e.g. "urbanex"
  } catch {
    return null;
  }
}

/**
 * Derive the base URL (https://<store>.cartpe.in) from any URL
 * belonging to that store.
 */
function baseFromUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return null;
  }
}

/**
 * Extract CartPe sourceId from a product URL.
 * CartPe product URLs follow the pattern:
 *   ...-<type><id>-<storeslug>.html
 * where type is optional (npi, lpi, or nothing) and id is 6+ digits.
 * The store slug part is dynamic (NOT hardcoded to "urbanex").
 */
function idFromUrl(url) {
  // Matches e.g.: -npi549885570-urbanex.html  OR  -470052374-mybrand.html
  const m = String(url).match(/-((?:npi|lpi)?\d{6,})-[a-z0-9-]+\.html/i);
  return m ? m[1] : null;
}

/**
 * Build the Load More AJAX URL for a given store base.
 */
function loadMoreUrl(base) {
  return `${base}/allproductoadmore`;
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
 * GET with automatic retries on transient failures.
 */
async function fetchWithRetry(url, opts = {}) {
  const { retries = 3, baseDelay = 600, timeout = 15000, cookie = '' } = opts;
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const headers = {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      };
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
 * POST with automatic retries.
 */
async function postWithRetry(url, body, opts = {}) {
  const { retries = 3, baseDelay = 600, timeout = 15000, referer = '', cookie = '' } = opts;
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        'Referer': referer || url,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': new URL(url).origin,
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
 * Fetches web_token, session cookie, AND category IDs from a CartPe page.
 * cat_ids is required for the AJAX endpoint to return products for category pages.
 */
async function fetchWebToken(pageUrl) {
  const { data: html, headers: resHeaders } = await axios.get(pageUrl, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
    timeout: 20000,
  });

  const tokenMatch = html.match(/web_token\s*=\s*["']([a-f0-9]{40,})["']/i)
    || html.match(/["']web_token["']\s*:\s*["']([a-f0-9]{40,})["']/i);
  if (!tokenMatch) throw new Error('Could not extract web_token from CartPe page');
  const token = tokenMatch[1];

  const setCookie = resHeaders['set-cookie'] || [];
  const cookie = setCookie.map(c => c.split(';')[0]).join('; ');

  // Extract category IDs — CartPe embeds them as JS vars or data attributes.
  // Patterns: cat_ids = "12,34" | cat_ids=[12,34] | data-cat-id="12"
  let catIds = '';
  const catMatch = html.match(/cat_ids\s*[=:]\s*["'\[]?([\d,\s]+)["'\]]/i)
    || html.match(/category_ids?\s*[=:]\s*["'\[]?([\d,\s]+)["'\]]/i);
  if (catMatch) {
    catIds = catMatch[1].replace(/\s+/g, '').replace(/,$/, '');
  }
  // Also try extracting from data attributes in HTML
  if (!catIds) {
    const $ = cheerio.load(html);
    const catEl = $('[data-cat-id],[data-category-id],[data-catid]').first();
    catIds = catEl.attr('data-cat-id') || catEl.attr('data-category-id') || catEl.attr('data-catid') || '';
  }

  console.log(`[CartPe] web_token: ${token.slice(0, 16)}… cookie: ${cookie ? 'yes' : 'none'} cat_ids: "${catIds}"`);
  return { token, cookie, catIds };
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

// ── Image + price helpers (work across ALL CartPe themes) ─────────

/**
 * Extract the best image URL from a cheerio img element.
 * Handles lazy-load patterns: data-src, data-original, data-lazy, src.
 */
function extractImgSrc(imgEl) {
  const attrs = ['data-src', 'data-original', 'data-lazy', 'data-lazy-src', 'src'];
  for (const attr of attrs) {
    const val = imgEl.attr(attr) || '';
    if (val && !val.startsWith('data:') && val.length > 10 && !/placeholder|blank\.gif|1x1|logo/i.test(val)) {
      return val
        .replace('/gallery_sm/', '/gallery_lg/')
        .replace('/gallery_md/', '/gallery_lg/');
    }
  }
  return null;
}

/**
 * Get the FIRST valid price-like number from a text string.
 * Critical: we must NOT strip all non-digits and concatenate, because
 * "₹ 2,149 ₹ 1,01,199" → strip → "2149101199" (wrong!).
 * Instead we split on any non-digit-comma sequence and take the first match.
 */
function firstPrice(text) {
  if (!text) return 0;
  // Split on currency symbols, spaces, parentheses etc — each segment is a candidate number
  const segments = text.split(/[₹$€£¥Rs.\s()%]+/).filter(Boolean);
  for (const seg of segments) {
    // Segment may be "2,149" or "1,01,199" — comma is Indian thousands separator
    const clean = seg.replace(/,/g, '').replace(/[^\d.]/g, '');
    if (!clean) continue;
    const v = parseFloat(clean);
    if (v >= 10 && v <= 9999999) return v; // valid product price range
  }
  return 0;
}

/**
 * Extract selling price and MRP from a card container.
 * Works across all CartPe store themes.
 */
function extractCardPrices($, card) {
  let sourcePrice = 0;
  let originalPrice = null;

  // Step 1: Extract MRP from struck-through/muted elements first
  const mrpEl = card.find('.old-price, .text-muted, strike, del, s, [style*="line-through"], .mrp-price, small').first();
  if (mrpEl.length) {
    const v = firstPrice(mrpEl.text());
    if (v >= 10) originalPrice = v;
  }

  // Step 2: Extract selling price from the price container
  // Remove the MRP element from a clone, then take the FIRST number from remaining text
  const priceEl = card.find('h4, .price, [class*="price"], .product-price, h3').first();
  if (priceEl.length) {
    const clone = priceEl.clone();
    clone.find('.old-price, .text-muted, strike, del, s, [style*="line-through"], .mrp-price, small').remove();
    const v = firstPrice(clone.text());
    if (v >= 10) sourcePrice = v;
  }

  // Step 3: If still no price, scan individual leaf elements (no children) for first price
  if (sourcePrice === 0) {
    card.find('h3, h4, h5, span, p').each((_, el) => {
      const jEl = $(el);
      // Only leaf-ish elements (not containers with many children)
      if (jEl.children().length > 3) return;
      const clone = jEl.clone();
      clone.children().remove();
      const v = firstPrice(clone.text());
      if (v >= 10) { sourcePrice = v; return false; } // break
    });
  }

  // Sanity: MRP must be strictly greater than selling price
  if (originalPrice !== null && originalPrice <= sourcePrice) originalPrice = null;
  return { sourcePrice, originalPrice };
}


// ── SCAN PHASE: Parse listing card ───────────────────────────────

function parseListingCard($, el, base) {
  const card = $(el);

  // Product URL
  let productUrl = null;
  card.find('a[href]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const resolved = href.startsWith('http') ? href
      : `${base}${href.startsWith('/') ? href : '/' + href}`;
    if (/-((?:npi|lpi)?\d{6,})-[a-z0-9-]+\.html/i.test(resolved)) {
      productUrl = resolved.split('?')[0];
      return false;
    }
  });
  if (!productUrl) return null;
  const sourceId = idFromUrl(productUrl);
  if (!sourceId) return null;

  // Name: heading link > heading > URL slug fallback
  const nameFromEl = card.find('h5 a, h4 a, h3 a, h6 a, .product-name a').first().text().trim()
    || card.find('h5, h4, h3, h6, .product-name, .prod-name').first().text().trim();
  const nameFromUrl = productUrl.split('/').pop()
    .replace(/-((?:npi|lpi)?\d{6,})-[a-z0-9-]+\.html$/i, '')
    .replace(/-/g, ' ').trim();
  const name = (nameFromEl || nameFromUrl).replace(/\s+/g, ' ');
  if (!name) return null;

  // Image: Try to extract from card first
  let thumbnail = null;
  const imgEl = card.find('img').first();
  if (imgEl.length) {
    thumbnail = extractImgSrc(imgEl);
  }

  // If no image in card, look for nearest image sibling
  // (Some CartPe themes separate images from product details)
  if (!thumbnail) {
    const parent = card.parent();
    const siblings = parent.siblings();
    siblings.each((_, sibling) => {
      const sibImg = $(sibling).find('img').first();
      if (sibImg.length) {
        const src = extractImgSrc(sibImg);
        if (src && !/(logo|banner|icon)/i.test(src)) {
          thumbnail = src;
          return false; // break
        }
      }
    });
  }

  // Prices: use extractCardPrices helper
  const { sourcePrice, originalPrice } = extractCardPrices($, card);

  const brandName = extractBrand(name);
  const { category: suggestedCategory, subcategory: suggestedSubcategory } = mapCategory(name);

  return {
    name, sourcePrice, originalPrice, thumbnail, brandName,
    productUrl, sourceId, suggestedCategory, suggestedSubcategory,
    images: thumbnail ? [thumbnail] : [],
    description: null, sizes: {}, inStock: true,
  };
}

// ── SCAN PHASE: Parse products from any HTML ─────────────────────

/**
 * Scans a cheerio document for all CartPe product cards.
 * Tries structured card selectors first; if none match, falls back
 * to collecting any product URL from <a> tags and extracting
 * image + price from the link's closest container element.
 */
function parseAllProductLinks($, base) {
  const seen = new Set();
  const products = [];

  // Ordered list of card container selectors (most specific first)
  const cardSelectors = [
    'div.product-disp',
    'div.product-details',
    'div.product-item',
    'div.product_item',
    'li.product-item',
    'div.col-md-3.col-sm-4.col-xs-6',
    'div[class*="product-card"]',
    'div[class*="productcard"]',
    'article[class*="product"]',
    'li[class*="product"]',
    // Generic: any div that directly contains a CartPe product link
  ];

  for (const sel of cardSelectors) {
    $(sel).each((_, el) => {
      const parsed = parseListingCard($, el, base);
      if (parsed && !seen.has(parsed.sourceId)) {
        seen.add(parsed.sourceId);
        products.push(parsed);
      }
    });
    if (products.length > 0) {
      console.log(`[CartPe] parseAllProductLinks: matched selector "${sel}" → ${products.length} products`);
      return products;
    }
  }

  // Href fallback: find all product links, then extract context from parent container
  console.log('[CartPe] parseAllProductLinks: no card selector matched, using href fallback');
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const resolved = href.startsWith('http') ? href
      : href.startsWith('/') ? `${base}${href}` : null;
    if (!resolved) return;
    const sourceId = idFromUrl(resolved);
    if (!sourceId || seen.has(sourceId)) return;
    seen.add(sourceId);
    const cleanUrl = resolved.split('?')[0];

    // Walk up the DOM to find the smallest useful container for this link
    const container = $(a).closest(
      '[class*="product"], .col-md-3, .col-sm-4, .col-xs-6, li, article, .item, .card'
    );
    const ctx = container.length ? container : $(a).parent();

    // Name: link text > heading inside container > URL slug
    const rawName = $(a).text().trim()
      || ctx.find('h3,h4,h5,h6,.product-name,.prod-name,.title').first().text().trim()
      || cleanUrl.split('/').pop()
          .replace(/-((?:npi|lpi)?\d{6,})-[a-z0-9-]+\.html$/i, '')
          .replace(/-/g, ' ').trim();
    const name = rawName.replace(/\s+/g, ' ').trim();
    if (!name) return;

    // Thumbnail: search all img tags inside the container
    let thumbnail = null;
    ctx.find('img').each((_, img) => {
      const src = extractImgSrc($(img));
      if (src) { thumbnail = src; return false; }
    });
    // If not in container, check if the <a> itself wraps an img
    if (!thumbnail) {
      $(a).find('img').each((_, img) => {
        const src = extractImgSrc($(img));
        if (src) { thumbnail = src; return false; }
      });
    }

    // Prices
    const { sourcePrice, originalPrice } = extractCardPrices($, ctx);

    const brandName = extractBrand(name);
    const { category: suggestedCategory, subcategory: suggestedSubcategory } = mapCategory(name);
    products.push({
      name, sourcePrice, originalPrice,
      thumbnail, images: thumbnail ? [thumbnail] : [],
      brandName, productUrl: cleanUrl, sourceId,
      suggestedCategory, suggestedSubcategory,
      description: null, sizes: {}, inStock: true, cartpeCategory: null,
    });
  });

  return products;
}


// ── SCAN PHASE: Paginate AJAX endpoint ───────────────────────────

/**
 * @param {object} options
 * @param {string} options.base       - Store base URL
 * @param {string} options.webToken   - Fresh web_token from page
 * @param {string} options.cookie     - Session cookie
 * @param {string} options.catIds     - Category IDs string (e.g. "12,34")
 * @param {string} options.searchKey  - Search keyword
 * @param {number} options.delayMs    - Delay between pages
 * @param {function} options.onProgress - (pageNo, total) => void
 */
async function scanListings(options = {}) {
  const {
    base,
    webToken,
    cookie = '',
    catIds = '',
    searchKey = '',
    delayMs = DEFAULT_DELAY,
    onProgress = null,
    pageUrl = null,
  } = options;
  const delay = clampDelay(delayMs);
  const ajaxUrl = loadMoreUrl(base);
  const seen = new Set();
  const products = [];
  let rowNo = 0;
  const pageSize = 24;
  let pagesFetched = 0;
  let consecutiveEmpty = 0;
  let consecutiveErrors = 0;
  const pageErrors = [];

  console.log(`[CartPe] SCAN — base="${base}" cat_ids="${catIds}" searchKey="${searchKey}"`);

  while (true) {
    try {
      const params = new URLSearchParams({
        getresult:      String(rowNo),
        searchkey:      searchKey,
        web_token:      webToken,
        orderby:        '',
        cat_ids:        catIds,
        min_price:      '0',
        max_price:      '0',
        size_ids:       '',
        variant_status: '0',
      });

      const { data: html } = await postWithRetry(ajaxUrl, params.toString(), {
        retries: 3, timeout: 20000, referer: pageUrl || base, cookie,
      });

      pagesFetched++;
      consecutiveErrors = 0;

      const $ = cheerio.load(html);
      let newCount = 0;

      const pageProducts = parseAllProductLinks($, base);
      for (const p of pageProducts) {
        if (seen.has(p.sourceId)) continue;
        seen.add(p.sourceId);
        products.push(p);
        newCount++;
      }

      console.log(`[CartPe] Page ${pagesFetched} (row_no=${rowNo}): ${newCount} new (total: ${products.length})`);
      if (onProgress) onProgress(pagesFetched, products.length);

      if (newCount === 0) {
        consecutiveEmpty++;
        if (consecutiveEmpty >= 2) break;
      } else {
        consecutiveEmpty = 0;
      }

      rowNo += pageSize;
      await sleep(delay);
    } catch (err) {
      consecutiveErrors++;
      pageErrors.push({ rowNo, error: err.response?.status ? `HTTP ${err.response.status}` : err.message });
      console.error(`[CartPe] row_no=${rowNo} failed (${err.response?.status || err.message}). Errors: ${consecutiveErrors}`);
      if (consecutiveErrors >= 5) {
        console.error('[CartPe] Too many consecutive errors — stopping.');
        break;
      }
      rowNo += pageSize;
      await sleep(delay);
    }
  }

  console.log(`[CartPe] AJAX done: ${products.length} products in ${pagesFetched} pages`);
  return { products, pagesFetched, pageErrors };
}

// ── IMPORT PHASE: Fetch detail page ──────────────────────────────

async function fetchProductDetail(productUrl) {
  const { data: html } = await fetchWithRetry(productUrl, { retries: 3, timeout: 25000 });
  const $ = cheerio.load(html);

  // ── Images ──────────────────────────────────────────────────────
  // CartPe product detail pages use STATIC HTML (not JS-loaded) images.
  // Two common slider structures across CartPe themes:
  //   1. FlexSlider: .slides li img  (timescorner, many others)
  //   2. Bootstrap Carousel: #carousel-custom .carousel-inner .item img  (UrbanEx)
  // We try each structure, de-duplicate by URL, skip logos/icons.
  const imageSet = new Set();

  const SKIP_RE = /logo|banner|icon|avatar|user|review|placeholder|blank|loading/i;

  // Priority 1 — FlexSlider (most common CartPe theme after default)
  $('.slides li img, .flexslider .slides img, ul.slides img').each((_, el) => {
    const src = extractImgSrc($(el));
    if (src && !SKIP_RE.test(src)) imageSet.add(src);
  });

  // Priority 2 — Bootstrap Carousel (UrbanEx default theme)
  if (imageSet.size === 0) {
    $('#carousel-custom .carousel-inner .item img, #carousel-custom .items img, [id*="carousel"] .item img').each((_, el) => {
      const src = extractImgSrc($(el));
      if (src && !SKIP_RE.test(src)) imageSet.add(src);
    });
  }

  // Priority 3 — Owl Carousel / generic sliders
  if (imageSet.size === 0) {
    $('.owl-carousel .item img, .slick-slider .slick-slide img, [class*="slider"] li img, [class*="gallery"] li img').each((_, el) => {
      const src = extractImgSrc($(el));
      if (src && !SKIP_RE.test(src)) imageSet.add(src);
    });
  }

  // Priority 4 — ANY img anywhere on the page with a CDN-looking URL
  // (covers stores hosted on any CDN, not just cdn.cartpe.in)
  if (imageSet.size === 0) {
    $('img').each((_, el) => {
      const src = extractImgSrc($(el));
      if (src && !SKIP_RE.test(src) && src.startsWith('http')) {
        imageSet.add(src);
      }
    });
  }

  // Deduplicate: gallery_sm and gallery_md are the same image as gallery_lg
  // Prefer gallery_lg. If no gallery_lg found, upgrade all sm/md URLs.
  const images = [...imageSet]
    .map(s => s.replace('/gallery_sm/', '/gallery_lg/').replace('/gallery_md/', '/gallery_lg/'))
    .filter((s, i, a) => a.indexOf(s) === i) // de-dup after upgrade
    .slice(0, MAX_IMAGES);


  // ── Sizes ────────────────────────────────────────────────────────
  const sizeValues = [];
  $([
    'section#products .size_click',
    '.size-setup .size_click',
    '[class*="size"] .size_click',
    '.size_click',
    '[class*="size-option"]',
    '[class*="variant"] button',
    '[class*="size"] li',
  ].join(', ')).each((_, el) => {
    const s = $(el).text().trim();
    if (s && s.length <= 10 && !/sold|out/i.test(s)) sizeValues.push(s);
  });
  const sizes = sizeValues.length > 0 ? { US: [...new Set(sizeValues)] } : { oneSize: ['One Size'] };

  // ── Description ──────────────────────────────────────────────────
  const description = $([
    '.product-description',
    '#product-description',
    '.description',
    '#description',
    '[class*="desc"]',
    '.product-details-content',
    '.product-info',
    'section#products p',
  ].join(', ')).first().text().trim().slice(0, 1000) || null;

  // ── Stock ────────────────────────────────────────────────────────
  const inStock = !/out\s*of\s*stock|sold\s*out/i.test($('body').text());

  // ── Prices ───────────────────────────────────────────────────────
  let sourcePrice = 0;
  let originalPrice = null;

  // Try known CartPe price containers (broad list for any theme)
  const priceContainer = $([
    '#price_div',
    'h3.price-area',
    '.price-area',
    '.product-price',
    '[class*="price-box"]',
    '[class*="price-wrap"]',
    'section#products h3',
    'section#products h4',
    '.product-detail h3',
    '.product-detail h4',
  ].join(', ')).first();

  if (priceContainer.length) {
    const mrpEl = priceContainer.find('span[style*="line-through"], .text-muted, strike, del, s, .old-price, .mrp, small').first();
    if (mrpEl.length) {
      const v = firstPrice(mrpEl.text());
      if (v >= 10) originalPrice = v;
    }

    const clone = priceContainer.clone();
    clone.find('span[style*="line-through"], .text-muted, strike, del, s, .old-price, .mrp, small').remove();
    const v = firstPrice(clone.text());
    if (v >= 10) sourcePrice = v;
  }

  // Numeric fallback: scan product section leaf elements for price-like numbers
  if (sourcePrice === 0) {
    const productSection = $('section#products, #page-start, .product-detail, main').first();
    const candidates = [];
    productSection.find('h2, h3, h4, h5, span, p').each((_, el) => {
      if ($(el).closest('#best-seller, .best-seller, .related-products, .owl-carousel, nav, header, footer').length) return;
      const jEl = $(el);
      if (jEl.children().length > 3) return; // skip containers
      const v = firstPrice(jEl.clone().children().remove().end().text());
      if (v >= 50 && v <= 9999999) candidates.push(v);
    });
    const sorted = [...new Set(candidates)].sort((a, b) => a - b);
    if (sorted.length >= 2) { sourcePrice = sorted[0]; if (!originalPrice) originalPrice = sorted[sorted.length - 1]; }
    else if (sorted.length === 1) sourcePrice = sorted[0];
  }

  if (!originalPrice || originalPrice <= sourcePrice) {
    originalPrice = Math.round(sourcePrice * 1.4);
  }

  // ── Category from breadcrumb ─────────────────────────────────────
  const breadcrumbs = [];
  $('ol.breadcrumb li, .breadcrumb li, [class*="breadcrumb"] li, [class*="breadcrumb"] a').each((_, el) => {
    const t = $(el).text().trim();
    if (t) breadcrumbs.push(t);
  });
  const cartpeCategory = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;

  return { images, description, inStock, sourcePrice, originalPrice, cartpeCategory, sizes };
}

// ── Main scrape() — SCAN phase only ──────────────────────────────

/**
 * @param {string} url      - The CartPe store/category/product URL
 * @param {string} scope    - 'full' | 'category' | 'product'
 * @param {object} options  - { delayMs, onProgress }
 *   onProgress: (pageNo, productsFound) => void  — called after each AJAX page
 */
async function scrape(url, scope, options = {}) {
  const delay = clampDelay(options.delayMs ?? DEFAULT_DELAY);
  const onProgress = options.onProgress || null;
  const scanStart = Date.now();

  const base = baseFromUrl(url);
  if (!base || !/cartpe\.in/i.test(base)) {
    throw new Error(`URL must be a *.cartpe.in store URL. Got: ${url}`);
  }

  if (scope === 'product') {
    try {
      const detail = await fetchProductDetail(url);
      const sourceId = idFromUrl(url);
      const name = url.split('/').pop()
        .replace(/-((?:npi|lpi)?\d{6,})-[a-z0-9-]+\.html$/i, '')
        .replace(/-/g, ' ').trim();
      const product = {
        name, sourcePrice: detail.sourcePrice, originalPrice: detail.originalPrice,
        thumbnail: detail.images[0] || null, images: detail.images,
        description: detail.description, brandName: extractBrand(name),
        productUrl: url.split('?')[0], sourceId,
        suggestedCategory: mapCategory(detail.cartpeCategory || name).category,
        suggestedSubcategory: mapCategory(detail.cartpeCategory || name).subcategory,
        inStock: detail.inStock, sizes: detail.sizes,
      };
      if (onProgress) onProgress(1, 1);
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

  // category / full — paginate listings only
  let searchKey = '';
  try {
    const parsed = new URL(url);
    searchKey = parsed.searchParams.get('searchkeyword') || parsed.searchParams.get('search') || '';
  } catch { /* ignore */ }

  // Fetch fresh web_token + session cookie + cat_ids
  let webToken = '';
  let cookie = '';
  let catIds = '';
  try {
    const tokenData = await fetchWebToken(url);
    webToken = tokenData.token;
    cookie = tokenData.cookie;
    catIds = tokenData.catIds || '';
  } catch (err) {
    console.error(`[CartPe] Failed to fetch web_token: ${err.message}`);
  }

  const { products, pagesFetched, pageErrors } = await scanListings({
    base, webToken, cookie, catIds, searchKey, delayMs: delay, onProgress, pageUrl: url,
  });

  // Fallback: if AJAX returned nothing, parse the initial page HTML directly.
  // This handles stores where the AJAX endpoint requires authentication we can't replicate.
  if (products.length === 0) {
    console.log('[CartPe] AJAX returned 0 products — parsing initial page HTML as fallback…');
    try {
      const { data: html } = await fetchWithRetry(url, { retries: 2, timeout: 20000, cookie });
      const $ = cheerio.load(html);
      const seen = new Set();
      const fallbackProducts = parseAllProductLinks($, base);
      for (const p of fallbackProducts) {
        if (!seen.has(p.sourceId)) { seen.add(p.sourceId); products.push(p); }
      }
      console.log(`[CartPe] Fallback found ${products.length} products`);
    } catch (err) {
      console.error(`[CartPe] Fallback also failed: ${err.message}`);
    }
  }

  // CATEGORY PAGE FIX: If this is a category page (not /allproduct.html),
  // and AJAX returned MORE products than visible on the page,
  // it means AJAX ignored the category filter.
  // Solution: Parse the static HTML from the category page instead.
  if (!/allproduct/i.test(url) && products.length > 0) {
    try {
      const { data: html } = await fetchWithRetry(url, { retries: 2, timeout: 20000, cookie });
      const $ = cheerio.load(html);
      
      // Check if page shows product count (e.g. "Showing results of 319 Products")
      const countText = $('body').text();
      const countMatch = countText.match(/(\d+)\s*Products?/i);
      
      if (countMatch) {
        const pageProductCount = parseInt(countMatch[1]);
        console.log(`[CartPe] Category page shows ${pageProductCount} products, but AJAX returned ${products.length}`);
        
        // If AJAX returned significantly more (>20% more), it's ignoring the category
        if (products.length > pageProductCount * 1.2) {
          console.log(`[CartPe] AJAX is ignoring category filter! Parsing static HTML instead...`);
          products.length = 0; // Clear AJAX results
          
          const seen = new Set();
          const categoryProducts = parseAllProductLinks($, base);
          for (const p of categoryProducts) {
            if (!seen.has(p.sourceId)) { seen.add(p.sourceId); products.push(p); }
          }
          console.log(`[CartPe] Static parse found ${products.length} products from category page`);
        }
      }
    } catch (err) {
      console.log(`[CartPe] Category verification failed: ${err.message}`);
    }
  }

  // Final fallback: if still no products, try scraping without selectors
  // by finding ALL product links anywhere in the page
  if (products.length === 0) {
    console.log('[CartPe] Final fallback: extracting all product links from page…');
    try {
      const { data: html } = await fetchWithRetry(url, { retries: 2, timeout: 20000, cookie });
      const $ = cheerio.load(html);
      const seen = new Set();
      
      // Find all links that match CartPe product URL pattern
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const fullUrl = href.startsWith('http') ? href 
          : href.startsWith('/') ? `${base}${href}` 
          : `${base}/${href}`;
        
        const sourceId = idFromUrl(fullUrl);
        if (!sourceId || seen.has(sourceId)) return;
        seen.add(sourceId);
        
        const linkText = $(el).text().trim();
        const name = linkText || fullUrl.split('/').pop()
          .replace(/-((?:npi|lpi)?\d{6,})-[a-z0-9-]+\.html$/i, '')
          .replace(/-/g, ' ').trim();
        
        if (name && name.length > 3 && name.length < 200) {
          products.push({
            name: name.replace(/\s+/g, ' '),
            sourcePrice: 0, // Will be enriched from detail page during import
            originalPrice: null,
            thumbnail: null,
            images: [],
            brandName: extractBrand(name),
            productUrl: fullUrl.split('?')[0],
            sourceId,
            suggestedCategory: mapCategory(name).category,
            suggestedSubcategory: mapCategory(name).subcategory,
            description: null,
            sizes: {},
            inStock: true,
          });
        }
      });
      
      console.log(`[CartPe] Final fallback found ${products.length} product links`);
    } catch (err) {
      console.error(`[CartPe] Final fallback failed: ${err.message}`);
    }
  }

  const scanDuration = Date.now() - scanStart;
  console.log(`[CartPe] SCAN complete: ${products.length} products in ${scanDuration}ms (${pagesFetched} AJAX pages)`);

  // NOTE: Image enrichment is DISABLED during scan to avoid timeouts and memory issues.
  // Images will be fetched during the import phase when products are actually selected.
  // This keeps the scan phase fast and reliable.

  return {
    products,
    failedUrls: [],
    pagesFetched,
    pageErrors,
    stats: {
      productsFound: products.length,
      productsReturned: products.length,
      duplicateCount: 0,
      failedCount: pageErrors.length,
      pagesFetched,
      scanDuration,
    },
  };
}

// ── syncProduct ───────────────────────────────────────────────────

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
      sizes: detail.sizes,
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
  fetchProductDetail,
};

export default cartpeProvider;
export { idFromUrl, mapCategory, extractBrand, fetchProductDetail };
