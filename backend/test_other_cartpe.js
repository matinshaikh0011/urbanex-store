// Test script to diagnose CartPe scraping issues on non-urbanex sites
import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Test with a different CartPe site
const TEST_URLS = [
  'https://timescorner.cartpe.in/allproduct.html',
  'https://omegawatches.cartpe.in/allproduct.html',
];

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

async function testSite(url) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${url}`);
  console.log('='.repeat(80));

  try {
    // 1. Test web_token extraction
    console.log('\n1. Testing web_token extraction...');
    const { data: html, headers: resHeaders } = await axios.get(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' },
      timeout: 20000,
    });

    const tokenMatch = html.match(/web_token\s*=\s*["']([a-f0-9]{40,})["']/i)
      || html.match(/["']web_token["']\s*:\s*["']([a-f0-9]{40,})["']/i);
    
    if (tokenMatch) {
      console.log(`✓ web_token found: ${tokenMatch[1].slice(0, 20)}...`);
    } else {
      console.log('✗ web_token NOT found');
    }

    const setCookie = resHeaders['set-cookie'] || [];
    const cookie = setCookie.map(c => c.split(';')[0]).join('; ');
    console.log(`Cookie: ${cookie ? 'yes' : 'no'}`);

    // 2. Test initial page parsing
    console.log('\n2. Testing initial page product parsing...');
    const $ = cheerio.load(html);

    const cardSelectors = [
      'div.product-disp',
      'div.product-details',
      'div.product-item',
      'div.product_item',
      'li.product-item',
      'div.col-md-3.col-sm-4.col-xs-6',
      'div[class*="product-card"]',
    ];

    let matchedSelector = null;
    let productCount = 0;
    let sampleImages = [];

    for (const sel of cardSelectors) {
      const cards = $(sel);
      if (cards.length > 0) {
        matchedSelector = sel;
        productCount = cards.length;

        // Extract sample images from first 3 products
        cards.slice(0, 3).each((i, el) => {
          const card = $(el);
          const imgEl = card.find('img').first();
          if (imgEl.length) {
            const src = extractImgSrc(imgEl);
            const dataAttrs = {};
            ['data-src', 'data-original', 'data-lazy', 'data-lazy-src', 'src'].forEach(attr => {
              const val = imgEl.attr(attr);
              if (val) dataAttrs[attr] = val.slice(0, 100);
            });
            sampleImages.push({
              productIndex: i,
              extractedSrc: src,
              imgAttributes: dataAttrs,
            });
          }
        });
        break;
      }
    }

    if (matchedSelector) {
      console.log(`✓ Matched selector: "${matchedSelector}"`);
      console.log(`✓ Found ${productCount} product cards`);
      console.log(`\nSample images from first 3 products:`);
      sampleImages.forEach(img => {
        console.log(`\n  Product ${img.productIndex}:`);
        console.log(`    Extracted: ${img.extractedSrc || 'NONE'}`);
        console.log(`    Attributes:`, JSON.stringify(img.imgAttributes, null, 6));
      });
    } else {
      console.log('✗ No product cards matched');

      // Try href fallback
      const links = $('a[href*=".html"]').filter((_, a) => {
        const href = $(a).attr('href') || '';
        return /-((?:npi|lpi)?\d{6,})-[a-z0-9-]+\.html/i.test(href);
      });
      console.log(`Found ${links.length} product links via href fallback`);

      if (links.length > 0) {
        const sampleLink = links.first();
        const container = sampleLink.closest('[class*="product"], .col-md-3, .col-sm-4');
        console.log(`Sample container classes: ${container.attr('class') || 'none'}`);
        const img = container.find('img').first();
        if (img.length) {
          const dataAttrs = {};
          ['data-src', 'data-original', 'data-lazy', 'data-lazy-src', 'src'].forEach(attr => {
            const val = img.attr(attr);
            if (val) dataAttrs[attr] = val.slice(0, 100);
          });
          console.log(`Sample image attributes:`, JSON.stringify(dataAttrs, null, 2));
        }
      }
    }

    // 3. Test AJAX endpoint
    console.log('\n3. Testing AJAX Load More endpoint...');
    const baseUrl = new URL(url).origin;
    const ajaxUrl = `${baseUrl}/allproductoadmore`;
    
    const params = new URLSearchParams({
      getresult: '0',
      searchkey: '',
      web_token: tokenMatch ? tokenMatch[1] : '',
      orderby: '',
      cat_ids: '',
      min_price: '0',
      max_price: '0',
      size_ids: '',
      variant_status: '0',
    });

    try {
      const ajaxRes = await axios.post(ajaxUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': UA,
          'Referer': url,
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': cookie,
        },
        timeout: 15000,
      });

      console.log(`✓ AJAX response status: ${ajaxRes.status}`);
      const $ajax = cheerio.load(ajaxRes.data);
      
      let ajaxProducts = 0;
      let ajaxImages = [];
      
      for (const sel of cardSelectors) {
        const cards = $ajax(sel);
        if (cards.length > 0) {
          ajaxProducts = cards.length;
          
          // Get first 3 images
          cards.slice(0, 3).each((i, el) => {
            const img = $ajax(el).find('img').first();
            if (img.length) {
              const src = extractImgSrc(img);
              ajaxImages.push({ index: i, src });
            }
          });
          break;
        }
      }

      console.log(`✓ AJAX returned ${ajaxProducts} products`);
      if (ajaxImages.length > 0) {
        console.log(`Sample AJAX images:`);
        ajaxImages.forEach(img => {
          console.log(`  [${img.index}] ${img.src || 'NONE'}`);
        });
      }

    } catch (ajaxErr) {
      console.log(`✗ AJAX failed: ${ajaxErr.message}`);
    }

  } catch (err) {
    console.error(`Error testing ${url}:`, err.message);
  }
}

async function main() {
  for (const url of TEST_URLS) {
    await testSite(url);
    await new Promise(r => setTimeout(r, 2000));
  }
}

main();
