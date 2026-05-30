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

async function collectProductUrls(options = {}) {
  const { delayMs = DEFAULT_DELAY, categoryUrl = null } = options;
  const delay = clampDelay(delayMs);
  const seen = new Set();
  const urls = [];
  let offset = 0;
  const pageSize = 24;

  while (true) {
    try {
      const params = new URLSearchParams({ start: offset, end: offset + pageSize });
      if (categoryUrl) params.set('category_url', categoryUrl);

      const { data: html } = await axios.post(LOADMORE_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': UA,
          'Referer': categoryUrl || BASE,
          'X-Requested-With': 'XMLHttpRequest',
        },
        timeout: 15000,
      });

      // Extract product links from the HTML fragment
      const $ = cheerio.load(html);
      const links = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && /-urbanex\.html/i.test(href)) {
          const full = href.startsWith('http') ? href : `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
          const sid = idFromUrl(full);
          if (sid && !seen.has(sid)) {
            seen.add(sid);
            links.push(full);
          }
        }
      });

      if (links.length === 0) break; // No more products

      urls.push(...links);
      offset += pageSize;
      await sleep(delay);
    } catch (err) {
      console.error(`[CartPe] collectProductUrls error at offset ${offset}:`, err.message);
      break;
    }
  }

  return urls;
}

// ── Main scrape function ──────────────────────────────────────────

async function scrape(url, scope, options = {}) {
  const delay = clampDelay(options.delayMs ?? DEFAULT_DELAY);
  const products = [];
  const failedUrls = [];

  // Verify the initial URL is reachable
  try {
    await axios.head(url, { headers: { 'User-Agent': UA }, timeout: 10000 });
  } catch (err) {
    throw new Error(`Supplier URL unreachable: ${url} — ${err.message}`);
  }

  let productUrls = [];

  if (scope === 'product') {
    productUrls = [url];
  } else {
    // full or category — use the Load More AJAX endpoint
    productUrls = await collectProductUrls({
      delayMs: delay,
      categoryUrl: scope === 'category' ? url : null,
    });

    // If AJAX returned nothing, try parsing the page directly for product links
    if (productUrls.length === 0) {
      try {
        const { data: html } = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 15000 });
        const $ = cheerio.load(html);
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (href && /-urbanex\.html/i.test(href)) {
            const full = href.startsWith('http') ? href : `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
            const sid = idFromUrl(full);
            if (sid) productUrls.push(full);
          }
        });
      } catch (err) {
        throw new Error(`Failed to parse supplier page: ${url} — ${err.message}`);
      }
    }
  }

  // Fetch and parse each product detail page
  for (const productUrl of productUrls) {
    try {
      await sleep(delay);
      const { data: html } = await axios.get(productUrl, {
        headers: { 'User-Agent': UA },
        timeout: 15000,
      });
      const parsed = parseDetail(html, productUrl);

      if (!parsed.name || !parsed.productUrl) {
        failedUrls.push({ url: productUrl, error: 'Missing name or URL after parse' });
        continue;
      }

      const brandName = extractBrand(parsed);
      const { category, subcategory } = mapCategory(parsed.cartpeCategory);

      products.push({
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
      });
    } catch (err) {
      console.error(`[CartPe] Failed to fetch ${productUrl}:`, err.message);
      failedUrls.push({ url: productUrl, error: err.message });
    }
  }

  return { products, failedUrls };
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
