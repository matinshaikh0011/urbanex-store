// Quick test to verify category limit detection
import axios from 'axios';

const testUrls = [
  'https://timescorner.cartpe.in/track-pants.html',
  'https://urbanex.cartpe.in/watches.html',
];

const patterns = [
  /Showing\s+results?\s+of\s+<strong[^>]*>(\d+)<\/strong>/i,
  /results?\s+of\s+<strong[^>]*>(\d+)<\/strong>\s*Products?/i,
  /(\d+)\s*Products?/i,
  /Showing.*?of\s+(\d+)\s+Products?/i,
  /Total.*?(\d+)\s+Products?/i,
  /(\d+)\s+items?/i,
  /results?\s+of\s+(\d+)/i,
];

async function testCategoryDetection(url) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Testing: ${url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });
    
    console.log(`✅ Page fetched (${html.length} bytes)`);
    
    let found = false;
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        console.log(`✅ MATCH: ${pattern}`);
        console.log(`   Captured: "${match[0]}"`);
        console.log(`   Count: ${match[1]}`);
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.log(`❌ No pattern matched`);
      console.log(`Searching for keywords in HTML...`);
      const keywords = ['product', 'item', 'showing', 'result', 'total'];
      keywords.forEach(kw => {
        const regex = new RegExp(`.{0,50}${kw}.{0,50}`, 'gi');
        const matches = html.match(regex);
        if (matches && matches.length > 0) {
          console.log(`\nKeyword "${kw}" context:`);
          matches.slice(0, 3).forEach(m => {
            console.log(`  ${m.trim()}`);
          });
        }
      });
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }
}

(async () => {
  for (const url of testUrls) {
    await testCategoryDetection(url);
  }
})();
