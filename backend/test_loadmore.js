// Test the CartPe allproductoadmore AJAX endpoint (ESM)
import https from 'https';
import querystring from 'querystring';
import fs from 'fs';

const WEB_TOKEN = '7d7a244423cfeb4ada709faeaaa457dda9022be990fefe9918440cfbd4f0ed169d156e331c366d37018f06f98ae835b6df047cc72526d3a49e5d030d07652d9c';

const postData = querystring.stringify({
  getresult: 0,
  searchkey: '',
  orderby: '',
  cat_ids: '',
  min_price: '',
  max_price: '',
  size_ids: '',
  variant_status: 0,
  web_token: WEB_TOKEN,
});

const options = {
  hostname: 'urbanex.cartpe.in',
  path: '/allproductoadmore',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'Mozilla/5.0',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': 'https://urbanex.cartpe.in/allproduct.html',
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log('LENGTH', data.length);
    fs.writeFileSync('cartpe_loadmore_resp.html', data);
    console.log('--- first 2000 chars ---');
    console.log(data.slice(0, 2000));
  });
});
req.on('error', (e) => console.log('ERR', e.message));
req.write(postData);
req.end();
