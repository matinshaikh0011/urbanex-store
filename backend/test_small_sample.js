// Test a small sample to verify image enrichment works
import axios from 'axios';
import * as cheerio from 'cheerio';
import cartpeProvider from './src/scrapers/cartpeProvider.js';

async function testSmallSample() {
  console.log('Testing image enrichment on a small sample\n');
  
  // Get just first page via AJAX
  const base = 'https://timescorner.cartpe.in';
  const url = `${base}/allproduct.html`;
  
  try {
    // Get web token
    const { data: pageHtml } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 20000,
    });
    
    const tokenMatch = pageHtml.match(/web_token\s*=\s*["']([a-f0-9]{40,})["']/i);
    const webToken = tokenMatch ? tokenMatch[1] : '';
    
    // Get first AJAX page
    const ajaxUrl = `${base}/allproductoadmore`;
    const params = new URLSearchParams({
      getresult: '0',
      searchkey: '',
      web_token: webToken,
      orderby: '',
      cat_ids: '',
      min_price: '0',
      max_price: '0',
      size_ids: '',
      variant_status: '0',
    });
    
    const { data: html } = await axios.post(ajaxUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Referer': url,
      },
      timeout: 15000,
    });
    
    const $ = cheerio.load(html);
    
    // Get first 3 products
    const products = [];
    $('div.product-details').slice(0, 3).each((_, el) => {
      const card = $(el);
      const link = card.find('a[href]').first();
      const href = link.attr('href') || '';
      const name = link.text().trim() || card.find('h6').first().text().trim();
      
      if (href && href.includes('.html')) {
        const productUrl = href.startsWith('http') ? href : `${base}${href}`;
        const sourceId = productUrl.match(/-(\d+)-/)?.[1] || '';
        
        products.push({
          name,
          productUrl,
          sourceId,
          thumbnail: null,
        });
      }
    });
    
    console.log(`Found ${products.length} products to test\n`);
    console.log('='.repeat(80));
    
    // Now enrich each product with detail page data
    for (const product of products) {
      console.log(`\nEnriching: ${product.name}`);
      console.log(`URL: ${product.productUrl}`);
      
      try {
        const detail = await cartpeProvider.fetchProductDetail(product.productUrl);
        
        console.log(`✓ Images found: ${detail.images.length}`);
        if (detail.images.length > 0) {
          console.log(`  First image: ${detail.images[0].slice(0, 80)}...`);
        }
        console.log(`  Price: ₹${detail.sourcePrice} ${detail.originalPrice ? `(MRP: ₹${detail.originalPrice})` : ''}`);
        console.log(`  In stock: ${detail.inStock}`);
        console.log(`  Description: ${detail.description ? detail.description.slice(0, 100) + '...' : 'none'}`);
        
      } catch (err) {
        console.log(`✗ Failed: ${err.message}`);
      }
      
      // Small delay
      await new Promise(r => setTimeout(r, 500));
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testSmallSample();
