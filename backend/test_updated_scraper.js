// Test updated CartPe scraper with image enrichment
import cartpeProvider from './src/scrapers/cartpeProvider.js';

async function test() {
  console.log('Testing updated CartPe scraper on timescorner.cartpe.in\n');
  console.log('='.repeat(80));
  
  const url = 'https://timescorner.cartpe.in/allproduct.html';
  
  try {
    const result = await cartpeProvider.scrape(url, 'category', {
      delayMs: 500,
      onProgress: (page, count) => {
        console.log(`Progress: Page ${page}, Products found: ${count}`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('SCAN RESULTS:');
    console.log('='.repeat(80));
    console.log(`Total products: ${result.products.length}`);
    console.log(`Pages fetched: ${result.pagesFetched}`);
    console.log(`Scan duration: ${result.stats.scanDuration}ms`);
    console.log(`Failed count: ${result.stats.failedCount}`);
    
    // Count products with/without images
    const withImages = result.products.filter(p => p.thumbnail && p.thumbnail.length > 10);
    const withoutImages = result.products.filter(p => !p.thumbnail || p.thumbnail.length < 10);
    
    console.log(`\nProducts WITH images: ${withImages.length}`);
    console.log(`Products WITHOUT images: ${withoutImages.length}`);
    
    // Show first 5 products with images
    console.log('\n' + '='.repeat(80));
    console.log('SAMPLE PRODUCTS (first 5):');
    console.log('='.repeat(80));
    result.products.slice(0, 5).forEach((p, i) => {
      console.log(`\n[${i + 1}] ${p.name}`);
      console.log(`    Price: ₹${p.sourcePrice} ${p.originalPrice ? `(MRP: ₹${p.originalPrice})` : ''}`);
      console.log(`    Brand: ${p.brandName || 'none'}`);
      console.log(`    Thumbnail: ${p.thumbnail ? p.thumbnail.slice(0, 80) + '...' : 'NONE'}`);
      console.log(`    Images count: ${p.images.length}`);
    });
    
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  }
}

test();
