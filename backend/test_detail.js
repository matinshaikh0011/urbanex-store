// Fetch a raw product detail page + count total products (ESM)
import https from 'https';
import fs from 'fs';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

const url = 'https://urbanex.cartpe.in/balenciagaa-speed-trainer-black-white-5002-npi549885570-urbanex.html';
const html = await get(url);
fs.writeFileSync('cartpe_detail.html', html);
console.log('detail length', html.length);

// Find breadcrumb
const bc = html.match(/breadcrumb[\s\S]{0,600}/i);
console.log('--- breadcrumb area ---');
console.log(bc ? bc[0].replace(/\s+/g, ' ').slice(0, 600) : 'NONE');

// Find gallery images
const imgs = [...html.matchAll(/cdn\.cartpe\.in\/images\/[a-z_]+\/[\w.-]+/gi)].map(m => m[0]);
console.log('--- images found:', imgs.length, '---');
console.log([...new Set(imgs)].slice(0, 10).join('\n'));

// Find sizes
const sizeMatch = html.match(/Size[\s\S]{0,400}/i);
console.log('--- size area ---');
console.log(sizeMatch ? sizeMatch[0].replace(/\s+/g, ' ').slice(0, 400) : 'NONE');

// Stock
const stock = html.match(/(In Stock|Out of Stock|Avaibility[\s\S]{0,40})/i);
console.log('--- stock ---', stock ? stock[0].replace(/\s+/g,' ') : 'NONE');
