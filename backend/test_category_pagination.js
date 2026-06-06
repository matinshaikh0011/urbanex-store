// Test to see if CartPe category pages have pagination or load more
import axios from 'axios';
import * as cheerio from 'cheerio';

const testUrl = 'https://timescorner.cartpe.in/track-pants.html';

async function testCategoryPage() {
  console.log(`Testing: ${testUrl}\n`);
  
  const { data: html } = await axios.get(testUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 15000,
  });
  
  const $ = cheerio.load(html);
  
  // Check for pagination
  console.log('=== Pagination Elements ===');
  const pagination = $('.pagination, .pager, [class*="page"]').length;
  console.log(`Pagination containers found: ${pagination}`);
  
  // Check for Load More button
  console.log('\n=== Load More Button ===');
  const loadMoreBtn = $('button:contains("Load More"), a:contains("Load More"), [class*="load"][class*="more"]');
  console.log(`Load More buttons found: ${loadMoreBtn.length}`);
  loadMoreBtn.each((i, el) => {
    console.log(`  ${i + 1}. Text: "${$(el).text().trim()}" | Class: "${$(el).attr('class')}"`);
  });
  
  // Check for product count
  console.log('\n=== Product Count ===');
  const countMatch = html.match(/Showing\s+results?\s+of\s+<strong[^>]*>(\d+)<\/strong>/i);
  if (countMatch) {
    console.log(`Total products: ${countMatch[1]}`);
  }
  
  // Count products on initial page
  console.log('\n=== Products on Page ===');
  let productCount = 0;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (/-((?:npi|lpi)?\d{6,})-[a-z0-9-]+\.html/i.test(href)) {
      productCount++;
    }
  });
  console.log(`Product links found on initial page: ${productCount}`);
  
  // Check for AJAX load more endpoint
  console.log('\n=== JavaScript AJAX Calls ===');
  const ajaxMatches = html.match(/allproduct[a-z]*/gi) || [];
  console.log(`AJAX endpoints mentioned: ${[...new Set(ajaxMatches)].join(', ')}`);
  
  // Check if page uses infinite scroll
  console.log('\n=== Infinite Scroll Detection ===');
  const hasInfiniteScroll = /scroll|lazy.*load|infinite/i.test(html);
  console.log(`Likely has infinite scroll: ${hasInfiniteScroll}`);
}

testCategoryPage().catch(console.error);
