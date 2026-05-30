// ================================================================
// UrbanEx ⇄ CartPe product scraper / sync
// ----------------------------------------------------------------
// Source: https://urbanex.cartpe.in  (your own store on CartPe)
//
// Strategy:
//   1. Page through the "Load More" AJAX endpoint to collect every
//      product URL.
//   2. Fetch each product's detail page and parse name, category,
//      price, images, sizes, stock.
//   3. Map CartPe categories/brands onto our schema.
//   4. Upsert into Postgres keyed on a stable slug `cartpe-<id>`.
//
// Safety:
//   - We ONLY ever touch products whose slug starts with `cartpe-`.
//     Hand-curated products (from the seed / admin) are left alone.
//   - `dryRun` mode parses everything and reports what WOULD change
//     without writing to the database.
// ================================================================

import https from 'https';

const BASE = 'https://urbanex.cartpe.in';
const LOADMORE_URL = `${BASE}/allproductoadmore`;
// Public token embedded in CartPe's own front-end JS (not a secret).
const WEB_TOKEN =
  '7d7a244423cfeb4ada709faeaaa457dda9022be990fefe9918440cfbd4f0ed169d156e331c366d37018f06f98ae835b6df047cc72526d3a49e5d030d07652d9c';

const UA = 'Mozilla/5.0 (compatible; UrbanExSync/1.0)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── tiny fetch helpers (no external deps) ──────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': UA } }, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve({ status: res.statusCode, body: d }));
      })
      .on('error', reject);
  });
}

function httpPostForm(url, form) {
  const data = new URLSearchParams(form).toString();
  const u = new URL(url);
  const opts = {
    hostname: u.hostname,
    path: u.pathname + u.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data),
      'User-Agent': UA,
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `${BASE}/allproduct.html`,
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const decode = (s = '') =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/\s+/g, ' ')
    .trim();

// Extract the stable CartPe product id from a product URL.
// Handles ...-npi549885570-urbanex.html / ...-lpi483234672-urbanex.html / ...-470052374-urbanex.html
function idFromUrl(url) {
  const m = url.match(/-((?:npi|lpi)?\d{6,})-urbanex\.html/i);
  return m ? m[1] : null;
}

// ── 1. Collect all product URLs via the Load More endpoint ─────
export async function collectProductUrls({ max = Infinity, log = () => {} } = {}) {
  const urls = new Map(); // id -> url (dedupe)
  let offset = 0;
  let guard = 0;

  while (urls.size < max && guard < 200) {
    guard++;
    const { status, body } = await httpPostForm(LOADMORE_URL, {
      getresult: offset,
      searchkey: '',
      orderby: '',
      cat_ids: '',
      min_price: '',
      max_price: '',
      size_ids: '',
      variant_status: 0,
      web_token: WEB_TOKEN,
    });
    if (status !== 200) {
      log(`load-more page @${offset} returned ${status}, stopping`);
      break;
    }

    const found = [...body.matchAll(/href="(https:\/\/urbanex\.cartpe\.in\/[^"]*-urbanex\.html)[^"]*"/gi)];
    let added = 0;
    for (const m of found) {
      const clean = m[1];
      const id = idFromUrl(clean);
      if (id && !urls.has(id)) {
        urls.set(id, clean);
        added++;
      }
    }
    log(`page @${offset}: +${added} (total ${urls.size})`);

    // No new products → reached the end.
    if (added === 0) break;
    offset += 24;
    await sleep(300);
  }

  return [...urls.entries()].map(([id, url]) => ({ id, url })).slice(0, max === Infinity ? undefined : max);
}

// ── 2. Parse a single product detail page ──────────────────────
export function parseDetail(html, url) {
  const id = idFromUrl(url);

  // Name: prefer the breadcrumb's final <span>, fall back to <h5 class="title"> or <h1>
  let name =
    (html.match(/<li><span>([^<]+)<\/span><\/li>\s*<\/ul>/i) || [])[1] ||
    (html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || [])[1] ||
    (html.match(/<h5[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h5>/i) || [])[1] ||
    '';
  name = decode(name);

  // Category: 2nd breadcrumb <li><a ...>CATEGORY</a></li>
  let category = '';
  const crumbs = [...html.matchAll(/<li><a[^>]*>([^<]+)<\/a><\/li>/gi)].map((m) => decode(m[1]));
  // crumbs[0] is "Home"; crumbs[1] is the category
  if (crumbs.length >= 2) category = crumbs[1];

  // Prices: first fa-rupee-sign is current, old-price span is MRP
  let price = null;
  let originalPrice = null;
  const priceBlock = html.match(/<h3[^>]*>[\s\S]{0,400}?<\/h3>/i) || html.match(/fa-rupee-sign[\s\S]{0,300}/i);
  const allRupees = [...html.matchAll(/fa-rupee-sign"><\/i>\s*([\d,]+(?:\.\d+)?)/gi)].map((m) =>
    parseFloat(m[1].replace(/,/g, ''))
  );
  if (allRupees.length >= 1) price = allRupees[0];
  const oldP = html.match(/old-price"><i[^>]*><\/i>\s*([\d,]+(?:\.\d+)?)/i);
  if (oldP) originalPrice = parseFloat(oldP[1].replace(/,/g, ''));
  if (originalPrice && price && originalPrice < price) {
    // some pages list MRP first — normalise so price <= originalPrice
    [price, originalPrice] = [originalPrice, price];
  }

  // Images: unique gallery_md (full size) images from the carousel
  let images = [...html.matchAll(/src="(https:\/\/cdn\.cartpe\.in\/images\/gallery_(?:md|lg)\/[^"]+)"/gi)].map(
    (m) => m[1]
  );
  if (images.length === 0) {
    // fall back to small gallery images
    images = [...html.matchAll(/src="(https:\/\/cdn\.cartpe\.in\/images\/gallery_sm\/[^"]+)"/gi)].map((m) => m[1]);
  }
  images = [...new Set(images)];

  // Sizes: <a ... class="size_click ...">42</a>
  const sizes = [...html.matchAll(/class="size_click[^"]*"[^>]*>([^<]+)<\/a>/gi)]
    .map((m) => decode(m[1]))
    .filter(Boolean);

  // Stock: "Out of Stock" present => false, else in stock
  const inStock = !/out\s*of\s*stock/i.test(html);

  return { id, url, name, category, price, originalPrice, images, sizes, inStock };
}

export async function scrapeDetail(url) {
  const { body } = await httpGet(url);
  return parseDetail(body, url);
}

// ── Mapping: CartPe category → our schema ──────────────────────
export function mapCategory(cartpeCategory = '') {
  const c = cartpeCategory.toLowerCase();

  // Watches
  if (c.includes('watch')) {
    let subcategory = null;
    if (c.includes('ladies') || c.includes('women')) subcategory = 'womens-watches';
    else if (c.includes('couple')) subcategory = 'couple-watches';
    else if (c.includes('luxury')) subcategory = 'luxury-watches';
    else if (c.includes('men')) subcategory = 'mens-watches';
    return { category: 'watches', subcategory };
  }

  // Clothing sub-types
  if (c.includes('t-shirt') || c.includes('tshirt') || c.includes('t shirt'))
    return { category: 'clothing', subcategory: 'tshirts' };
  if (c.includes('track pant') || c.includes('track suit') || c.includes('track-suit'))
    return { category: 'clothing', subcategory: 'track-pants' };
  if (c.includes('jean') || c.includes('denim')) return { category: 'clothing', subcategory: 'jeans' };
  if (c.includes('shirt')) return { category: 'clothing', subcategory: 'shirts' };

  // Footwear → sneakers
  if (
    c.includes('shoe') ||
    c.includes('sneaker') ||
    c.includes('footwear') ||
    c.includes('loafer') ||
    c.includes('flipflop') ||
    c.includes('crocs') ||
    c.includes('slide')
  )
    return { category: 'sneakers', subcategory: null };

  // Eyewear / bags (in case they get added later)
  if (c.includes('sunglass') || c.includes('glass') || c.includes('eyewear'))
    return { category: 'glasses', subcategory: null };
  if (c.includes('bag') || c.includes('handbag') || c.includes('purse'))
    return { category: 'handbags', subcategory: null };

  // Fragrance / socks / misc → keep as their own slug so admin can re-bucket
  if (c.includes('perfume') || c.includes('fragrance')) return { category: 'fragrance', subcategory: null };
  if (c.includes('sock')) return { category: 'socks', subcategory: null };

  return { category: 'clothing', subcategory: null };
}

// ── Brand detection from product name ──────────────────────────
const BRAND_KEYWORDS = [
  [/balenciaga|balenciagaa/i, 'Balenciaga'],
  [/gucci/i, 'Gucci'],
  [/louis\s*vuitton|lv\b/i, 'Louis Vuitton'],
  [/prada/i, 'Prada'],
  [/cartie?r/i, 'Cartier'],
  [/omeg\s*a|omega/i, 'Omega'],
  [/rolex/i, 'Rolex'],
  [/hublot/i, 'Hublot'],
  [/tag\s*heuer/i, 'Tag Heuer'],
  [/gues+\b|guess/i, 'Guess'],
  [/michael\s*kors/i, 'Michael Kors'],
  [/ray.?ban/i, 'Ray-Ban'],
  [/oakley/i, 'Oakley'],
  [/nike/i, 'Nike'],
  [/jordan/i, 'Jordan'],
  [/adidas|yeezy/i, 'Adidas'],
  [/puma/i, 'Puma'],
  [/new\s*balance|neww\s*balance/i, 'New Balance'],
  [/reebok/i, 'Reebok'],
  [/converse/i, 'Converse'],
  [/vans/i, 'Vans'],
  [/asics/i, 'Asics'],
  [/fila/i, 'Fila'],
  [/skechers/i, 'Skechers'],
  [/on\s*(running|cloud)/i, 'On Running'],
  [/onitsuka/i, 'Onitsuka Tiger'],
  [/north\s*face|nort\s*h\s*face/i, 'The North Face'],
  [/birkenstock/i, 'Birkenstock'],
  [/under\s*armour/i, 'Under Armour'],
  [/levi'?s|levis/i, 'Levis'],
  [/h&m|h ?and ?m/i, 'H&M'],
];

export function detectBrand(name = '') {
  for (const [re, brand] of BRAND_KEYWORDS) if (re.test(name)) return brand;
  return 'UrbanEx';
}

const slugify = (s = '') =>
  s
    .toLowerCase()
    .replace(/["']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Convert a parsed CartPe product into our Product shape.
export function toProductRecord(p) {
  const { category, subcategory } = mapCategory(p.category);
  const brandName = detectBrand(p.name);
  const sizes = p.sizes && p.sizes.length ? { default: p.sizes } : { oneSize: ['One Size'] };
  return {
    slug: `cartpe-${p.id}`,
    name: p.name || `Product ${p.id}`,
    brandName,
    category,
    subcategory,
    price: p.price ?? 0,
    originalPrice: p.originalPrice ?? null,
    images: p.images && p.images.length ? p.images : [],
    sizes,
    colors: [{ name: 'Default', hex: '#1A1A1A' }],
    inStock: p.inStock,
    description: `${p.name} — available at UrbanEx. Authentic, fast shipping across India. DM on WhatsApp to order.`,
    sourceUrl: p.url,
    cartpeCategory: p.category,
  };
}

// ── Full scrape (parse only, no DB) ────────────────────────────
export async function scrapeAll({ limit = Infinity, log = () => {}, throttleMs = 350 } = {}) {
  log('Collecting product URLs…');
  const list = await collectProductUrls({ max: limit, log });
  log(`Found ${list.length} products. Fetching detail pages…`);

  const out = [];
  for (let i = 0; i < list.length; i++) {
    try {
      const detail = await scrapeDetail(list[i].url);
      out.push(toProductRecord(detail));
      if ((i + 1) % 10 === 0) log(`  …parsed ${i + 1}/${list.length}`);
    } catch (e) {
      log(`  ! failed ${list[i].url}: ${e.message}`);
    }
    await sleep(throttleMs);
  }
  return out;
}

// ── 4. Sync into the database (additive + update) ──────────────
// `prisma` is passed in so this works inside the API server.
export async function syncProducts(prisma, { limit = Infinity, dryRun = false, log = () => {} } = {}) {
  const records = await scrapeAll({ limit, log });

  const summary = { scraped: records.length, created: 0, updated: 0, skipped: 0, errors: 0, dryRun };
  if (records.length === 0) return summary;

  // Cache brands so we don't hit the DB for every product.
  const brandCache = new Map();
  async function getBrandId(brandName) {
    if (brandCache.has(brandName)) return brandCache.get(brandName);
    const slug = slugify(brandName);
    let brand = await prisma.brand.findFirst({ where: { OR: [{ name: brandName }, { slug }] } });
    if (!brand && !dryRun) brand = await prisma.brand.create({ data: { name: brandName, slug } });
    const idVal = brand ? brand.id : null;
    brandCache.set(brandName, idVal);
    return idVal;
  }

  for (const r of records) {
    try {
      const existing = await prisma.product.findUnique({ where: { slug: r.slug } });
      if (dryRun) {
        if (existing) summary.updated++;
        else summary.created++;
        continue;
      }

      const brandId = await getBrandId(r.brandName);
      const data = {
        name: r.name,
        description: r.description,
        price: r.price,
        originalPrice: r.originalPrice,
        images: r.images,
        sizes: r.sizes,
        colors: r.colors,
        category: r.category,
        subcategory: r.subcategory,
        inStock: r.inStock,
        brandId,
      };

      if (existing) {
        await prisma.product.update({ where: { slug: r.slug }, data });
        summary.updated++;
      } else {
        await prisma.product.create({ data: { slug: r.slug, isFeatured: false, ...data } });
        summary.created++;
      }
    } catch (e) {
      summary.errors++;
      log(`  ! db error for ${r.slug}: ${e.message}`);
    }
  }

  return summary;
}

// ── CLI entry: `node src/scraper.js --dry --limit 8` ───────────
const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('scraper.js');
if (isMain) {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 6;
  const log = (...m) => console.log('[scrape]', ...m);

  scrapeAll({ limit, log })
    .then((records) => {
      console.log('\n================ EXTRACTED PRODUCTS ================\n');
      console.log(JSON.stringify(records, null, 2));
      console.log(`\nTotal parsed: ${records.length}`);
    })
    .catch((e) => {
      console.error('Scrape failed:', e);
      process.exit(1);
    });
}
