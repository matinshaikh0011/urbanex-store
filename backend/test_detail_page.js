// Test detail page image extraction
import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

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

async function testDetailPage(url) {
  console.log(`Testing detail page: ${url}\n`);
  
  const { data: html } = await axios.get(url, {
    headers: { 'User-Agent': UA },
    timeout: 20000,
  });

  const $ = cheerio.load(html);
  
  const SKIP_RE = /logo|banner|icon|avatar|user|review|placeholder|blank|loading/i;
  
  // Test all slider patterns
  const patterns = [
    { name: 'FlexSlider', selector: '.slides li img, .flexslider .slides img, ul.slides img' },
    { name: 'Bootstrap Carousel', selector: '#carousel-custom .carousel-inner .item img, #carousel-custom .items img, [id*="carousel"] .item img' },
    { name: 'Owl Carousel', selector: '.owl-carousel .item img, .slick-slider .slick-slide img' },
    { name: 'Any slider', selector: '[class*="slider"] li img, [class*="gallery"] li img' },
    { name: 'All images', selector: 'img' },
  ];

  for (const pattern of patterns) {
    const images = [];
    $(pattern.selector).each((_, el) => {
      const src = extractImgSrc($(el));
      if (src && !SKIP_RE.test(src)) {
        images.push(src);
      }
    });

    if (images.length > 0) {
      console.log(`✓ ${pattern.name} matched: ${images.length} images`);
      console.log('First 5 images:');
      images.slice(0, 5).forEach((img, i) => {
        console.log(`  [${i}] ${img}`);
      });
      console.log('');
      break;
    } else {
      console.log(`✗ ${pattern.name}: no images`);
    }
  }

  // Check prices
  console.log('\nPrice extraction test:');
  const priceContainer = $('#price_div, h3.price-area, .price-area, .product-price, section#products h3').first();
  if (priceContainer.length) {
    console.log(`Price container text: "${priceContainer.text().trim().slice(0, 100)}"`);
  } else {
    console.log('No price container found');
  }
}

// Test with a timescorner product URL
testDetailPage('https://timescorner.cartpe.in/adidas-alphaboost-lpi1109.html').catch(console.error);
