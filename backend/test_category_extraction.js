// Test category ID extraction from a CartPe category page
import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function testCategoryExtraction(url) {
  console.log(`Testing: ${url}\n`);
  
  try {
    const { data: html } = await axios.get(url, {
      headers: { 'User-Agent': UA },
      timeout: 20000,
    });

    console.log('1. Checking for cat_ids in JavaScript:');
    const catMatch = html.match(/cat_ids\s*[=:]\s*["'\[]?([\d,\s]+)["'\]]/i)
      || html.match(/category_ids?\s*[=:]\s*["'\[]?([\d,\s]+)["'\]]/i);
    
    if (catMatch) {
      const catIds = catMatch[1].replace(/\s+/g, '').replace(/,$/, '');
      console.log(`   ✓ Found in JS: "${catIds}"`);
    } else {
      console.log(`   ✗ Not found in JS variables`);
    }

    console.log('\n2. Checking for data-cat-id attributes:');
    const $ = cheerio.load(html);
    const catEl = $('[data-cat-id],[data-category-id],[data-catid]').first();
    const dataCatId = catEl.attr('data-cat-id') || catEl.attr('data-category-id') || catEl.attr('data-catid') || '';
    
    if (dataCatId) {
      console.log(`   ✓ Found in data attribute: "${dataCatId}"`);
    } else {
      console.log(`   ✗ Not found in data attributes`);
    }

    console.log('\n3. Checking URL for category hints:');
    const urlMatch = url.match(/\/([a-z0-9-]+)\.html/i);
    if (urlMatch) {
      console.log(`   Category slug in URL: "${urlMatch[1]}"`);
    }

    console.log('\n4. Looking for category ID in page source (first 50 matches):');
    const allCatMatches = html.match(/cat.*?id.*?[=:]["']?(\d+)/gi);
    if (allCatMatches) {
      console.log(`   Found ${allCatMatches.length} potential matches:`);
      allCatMatches.slice(0, 10).forEach(m => console.log(`   - ${m}`));
    } else {
      console.log(`   ✗ No matches found`);
    }

    console.log('\n5. Checking if this is ALL PRODUCTS page:');
    if (/allproduct/i.test(url)) {
      console.log(`   ⚠️  WARNING: This is the "All Products" page!`);
      console.log(`   This page shows ALL products from the store, not a category.`);
      console.log(`   Use a specific category URL like /track-pants.html instead.`);
    }

  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

// Test the track pants category URL
testCategoryExtraction('https://timescorner.cartpe.in/track-pants.html');
