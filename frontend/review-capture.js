// One-off visual capture of the running dev site for design review.
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = 'c:/Users/Matin/claude website ue/review-shots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  async function settle(ms = 1500) {
    try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch {}
    await page.waitForTimeout(ms);
  }

  // Home — hero (above fold) + full page
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await settle(2500);
  await page.screenshot({ path: `${OUT}/01-home-hero.png` });
  // scroll through to trigger reveal animations, then full page
  for (let y = 0; y < 6; y++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(350); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/02-home-full.png`, fullPage: true });

  // Hover the Categories trigger to open the mega menu (verify new icons + layout)
  try {
    await page.getByText('CATEGORIES', { exact: false }).first().hover();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/03-megamenu.png` });
  } catch (e) { console.log('megamenu hover failed:', e.message); }

  // Products listing
  await page.goto('http://localhost:3000/products', { waitUntil: 'domcontentloaded' });
  await settle(2500);
  await page.screenshot({ path: `${OUT}/04-products.png`, fullPage: false });

  // A product detail page — grab a real slug from the API
  let slug = null;
  try {
    slug = await page.evaluate(async () => {
      const r = await fetch('/api/products'); const d = await r.json();
      return Array.isArray(d) && d[0] ? d[0].slug : null;
    });
  } catch (e) { console.log('slug fetch failed:', e.message); }
  if (slug) {
    await page.goto(`http://localhost:3000/products/${slug}`, { waitUntil: 'domcontentloaded' });
    await settle(2500);
    await page.screenshot({ path: `${OUT}/05-pdp.png`, fullPage: false });
  }

  // Brands page
  await page.goto('http://localhost:3000/brands', { waitUntil: 'domcontentloaded' });
  await settle(2000);
  await page.screenshot({ path: `${OUT}/06-brands.png`, fullPage: false });

  await browser.close();
  console.log('done; slug used =', slug);
})().catch(e => { console.error(e); process.exit(1); });
