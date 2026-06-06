// Test detail page fetching directly
import cartpeProvider from './src/scrapers/cartpeProvider.js';

async function testDetailFetch() {
  // These are real product URLs from timescorner (found via earlier tests)
  const testUrls = [
    'https://timescorner.cartpe.in/adidas-forum-low-beige-lpi1098.html',
    'https://timescorner.cartpe.in/adidas-forum-low-pink-npi1058.html',
    'https://timescorner.cartpe.in/nike-dunk-low-panda-lpi882.html',
  ];
  
  for (const url of testUrls) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: ${url}`);
    console.log('='.repeat(80));
    
    try {
      const detail = await cartpeProvider.fetchProductDetail(url);
      
      console.log(`✓ SUCCESS`);
      console.log(`Images found: ${detail.images.length}`);
      if (detail.images.length > 0) {
        console.log(`First 3 images:`);
        detail.images.slice(0, 3).forEach((img, i) => {
          console.log(`  [${i + 1}] ${img}`);
        });
      } else {
        console.log(`  (No images found)`);
      }
      console.log(`Price: ₹${detail.sourcePrice} ${detail.originalPrice ? `(MRP: ₹${detail.originalPrice})` : ''}`);
      console.log(`In stock: ${detail.inStock}`);
      console.log(`Sizes: ${JSON.stringify(detail.sizes)}`);
      
    } catch (err) {
      console.log(`✗ FAILED: ${err.message}`);
      if (err.response) {
        console.log(`  HTTP Status: ${err.response.status}`);
      }
    }
    
    // Small delay
    await new Promise(r => setTimeout(r, 1000));
  }
}

testDetailFetch();
