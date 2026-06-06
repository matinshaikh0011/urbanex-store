// Diagnose a specific CartPe store's image structure
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function analyzeStore(url) {
  console.log(`Analyzing: ${url}\n`);
  
  const { data: html } = await axios.get(url, {
    headers: { 'User-Agent': UA },
    timeout: 20000,
  });

  const $ = cheerio.load(html);
  
  // Find first product card
  const selectors = [
    'div.product-details',
    'div.product-disp',
    'div.product-item',
    'div.col-md-3.col-sm-4.col-xs-6',
  ];

  let firstCard = null;
  let matchedSel = null;

  for (const sel of selectors) {
    const cards = $(sel);
    if (cards.length > 0) {
      firstCard = cards.first();
      matchedSel = sel;
      break;
    }
  }

  if (!firstCard) {
    console.log('No product cards found!');
    return;
  }

  console.log(`Matched selector: ${matchedSel}`);
  console.log(`Total cards: ${$(matchedSel).length}\n`);

  // Analyze first card's HTML structure
  const cardHtml = firstCard.html();
  console.log('FIRST CARD HTML:');
  console.log('='.repeat(80));
  console.log(cardHtml.slice(0, 2000));
  console.log('='.repeat(80));
  console.log('\n');

  // Analyze ALL img tags in first card
  console.log('IMG TAGS IN FIRST CARD:');
  console.log('='.repeat(80));
  firstCard.find('img').each((i, el) => {
    const img = $(el);
    console.log(`\nImage ${i + 1}:`);
    console.log(`  tag: ${$.html(img).slice(0, 300)}`);
    console.log(`  Attributes:`);
    const attrs = img.get(0).attribs;
    Object.keys(attrs).forEach(key => {
      console.log(`    ${key}: ${attrs[key].slice(0, 150)}`);
    });
  });
  console.log('='.repeat(80));

  // Save full HTML for offline analysis
  fs.writeFileSync('cartpe_sample.html', html);
  console.log('\nFull HTML saved to cartpe_sample.html');
}

analyzeStore('https://timescorner.cartpe.in/allproduct.html').catch(console.error);
