// Test the final CartPe scraper fix
import cartpeProvider from './src/scrapers/cartpeProvider.js';

async function testStore(url) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${url}`);
  console.log('='.repeat(80));
  
  try {
    const result = await cartpeProvider.scrape(url, 'category', {
      delayMs: 500,
      onProgress: (page, count) => {
        if (page % 5 === 0 || page === 1) {
          console.log(`  Progress: Page ${page}, Found ${count} products`);
        }
      }
    });
    
    console.log(`\n✓ SUCCESS!`);
    console.log(`  Total products: ${result.products.length}`);
    console.log(`  Pages fetched: ${result.pagesFetched}`);
    console.log(`  Scan duration: ${(result.stats.scanDuration / 1000).toFixed(1)}s`);
    
    // Show first 3 products
    console.log(`\n  First 3 products:`);
    result.products.slice(0, 3).forEach((p, i) => {
      console.log(`    [${i + 1}] ${p.name}`);
      console.log(`        URL: ${p.productUrl}`);
      console.log(`        Price: ₹${p.sourcePrice || 0} ${p.originalPrice ? `(MRP: ₹${p.originalPrice})` : ''}`);
      console.log(`        Thumbnail: ${p.thumbnail ? 'Yes' : 'No (will fetch during import)'}`);
    });
    
    return true;
  } catch (err) {
    console.log(`\n✗ FAILED: ${err.message}`);
    return false;
  }
}

async function runTests() {
  const testUrls = [
    'https://urbanex.cartpe.in/allproduct.html',        // Should work (has images)
    'https://timescorner.cartpe.in/allproduct.html',    // Should work (no images in listing)
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const url of testUrls) {
    const success = await testStore(url);
    if (success) passed++;
    else failed++;
    
    // Wait between tests
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(80));
}

runTests().catch(console.error);
