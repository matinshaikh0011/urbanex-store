import fs from 'fs';
const html = fs.readFileSync('cartpe_detail.html', 'utf8');

// Look at the gallery carousel block (the main product images)
const gal = html.match(/carousel-custom[\s\S]{0,2500}/i);
console.log('=== GALLERY BLOCK ===');
console.log(gal ? gal[0].replace(/\s+/g, ' ') : 'NONE');

console.log('\n\n=== SIZE BLOCK ===');
// CartPe size selectors usually have class "size" or data-size, find the "Size" heading region
const idx = html.search(/>\s*Size\s*</i);
if (idx > -1) {
  console.log(html.slice(idx - 50, idx + 900).replace(/\s+/g, ' '));
} else {
  console.log('no Size heading; searching variant buttons');
  const v = html.match(/variant[\s\S]{0,500}/i);
  console.log(v ? v[0].replace(/\s+/g,' ') : 'none');
}
