// Find ALL images on the page to understand structure
import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function findAllImages(url) {
  console.log(`Finding all images on: ${url}\n`);
  
  const { data: html } = await axios.get(url, {
    headers: { 'User-Agent': UA },
    timeout: 20000,
  });

  const $ = cheerio.load(html);
  
  const allImages = [];
  $('img').each((i, el) => {
    const img = $(el);
    const attrs = img.get(0).attribs;
    const parent = img.parent();
    const parentTag = parent.get(0) ? parent.get(0).name : 'none';
    const parentClass = parent.attr('class') || '';
    
    allImages.push({
      index: i,
      parentTag,
      parentClass: parentClass.slice(0, 100),
      src: attrs.src || '',
      dataSrc: attrs['data-src'] || '',
      dataOriginal: attrs['data-original'] || '',
      dataLazy: attrs['data-lazy'] || '',
      alt: (attrs.alt || '').slice(0, 100),
      class: (attrs.class || '').slice(0, 100),
    });
  });

  console.log(`Total images found: ${allImages.length}\n`);
  
  // Group by parent class to find patterns
  const byParentClass = {};
  allImages.forEach(img => {
    const key = img.parentClass || 'no-class';
    if (!byParentClass[key]) byParentClass[key] = [];
    byParentClass[key].push(img);
  });

  console.log('Images grouped by parent class:');
  console.log('='.repeat(80));
  Object.keys(byParentClass).forEach(key => {
    console.log(`\n${key} (${byParentClass[key].length} images):`);
    // Show first image of each group
    const sample = byParentClass[key][0];
    console.log(`  Sample src: ${sample.src || sample.dataSrc || sample.dataOriginal || 'NONE'}`);
    console.log(`  Parent tag: ${sample.parentTag}`);
    console.log(`  Alt: ${sample.alt || 'none'}`);
  });

  // Find product-looking images (not logo/banner)
  console.log('\n\nProduct-looking images (excluding logo/banner/icon):');
  console.log('='.repeat(80));
  const productImages = allImages.filter(img => {
    const src = img.src || img.dataSrc || img.dataOriginal || '';
    const alt = img.alt.toLowerCase();
    const parentClass = img.parentClass.toLowerCase();
    
    return src &&
      !/(logo|banner|icon|avatar|payment|social)/i.test(src) &&
      !/(logo|banner|icon|header|footer|nav)/i.test(parentClass) &&
      !/(logo|banner|icon)/i.test(alt);
  });

  console.log(`Found ${productImages.length} product-like images\n`);
  productImages.slice(0, 10).forEach(img => {
    console.log(`[${img.index}] ${img.src || img.dataSrc || img.dataOriginal}`);
    console.log(`    Parent: <${img.parentTag} class="${img.parentClass}">`);
    console.log(`    Alt: ${img.alt || 'none'}\n`);
  });
}

findAllImages('https://timescorner.cartpe.in/allproduct.html').catch(console.error);
