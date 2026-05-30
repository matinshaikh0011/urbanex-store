// ================================================================
// UrbanEx Catalog — brands + product definitions used by the seed.
// ~28 products per category, with subcategories where relevant.
// Products reference brands by slug (Prisma connects on seed).
// ================================================================

export const brands = [
  { name: 'Nike', slug: 'nike', logoUrl: 'https://logos.hunter.io/nike.com' },
  { name: 'Adidas', slug: 'adidas', logoUrl: 'https://logos.hunter.io/adidas.com' },
  { name: 'Jordan', slug: 'jordan', logoUrl: 'https://cdn.simpleicons.org/jordan' },
  { name: 'Puma', slug: 'puma', logoUrl: 'https://logos.hunter.io/puma.com' },
  { name: 'New Balance', slug: 'new-balance', logoUrl: 'https://logos.hunter.io/newbalance.com' },
  { name: 'Reebok', slug: 'reebok', logoUrl: 'https://logos.hunter.io/reebok.com' },
  { name: 'Converse', slug: 'converse', logoUrl: 'https://logos.hunter.io/converse.com' },
  { name: 'Vans', slug: 'vans', logoUrl: 'https://logos.hunter.io/vans.com' },
  { name: 'Asics', slug: 'asics', logoUrl: 'https://logos.hunter.io/asics.com' },
  { name: 'Fila', slug: 'fila', logoUrl: 'https://logos.hunter.io/fila.com' },
  { name: 'Under Armour', slug: 'under-armour', logoUrl: 'https://logos.hunter.io/underarmour.com' },
  { name: 'Skechers', slug: 'skechers', logoUrl: 'https://logos.hunter.io/skechers.com' },
  { name: 'Rolex', slug: 'rolex', logoUrl: 'https://logos.hunter.io/rolex.com' },
  { name: 'Omega', slug: 'omega', logoUrl: 'https://logos.hunter.io/omegawatches.com' },
  { name: 'Hublot', slug: 'hublot', logoUrl: 'https://logos.hunter.io/hublot.com' },
  { name: 'Ray-Ban', slug: 'ray-ban', logoUrl: 'https://logos.hunter.io/ray-ban.com' },
  { name: 'Oakley', slug: 'oakley', logoUrl: 'https://logos.hunter.io/oakley.com' },
  { name: 'Gucci', slug: 'gucci', logoUrl: 'https://logos.hunter.io/gucci.com' },
  { name: 'Louis Vuitton', slug: 'louis-vuitton', logoUrl: 'https://logos.hunter.io/louisvuitton.com' },
  { name: 'Michael Kors', slug: 'michael-kors', logoUrl: 'https://logos.hunter.io/michaelkors.com' },
  { name: 'Tag Heuer', slug: 'tag-heuer', logoUrl: 'https://logos.hunter.io/tagheuer.com' },
  { name: 'Cartier', slug: 'cartier', logoUrl: 'https://logos.hunter.io/cartier.com' },
  { name: 'Prada', slug: 'prada', logoUrl: 'https://logos.hunter.io/prada.com' },
  { name: 'Levis', slug: 'levis', logoUrl: 'https://logos.hunter.io/levi.com' },
  { name: 'H&M', slug: 'hm', logoUrl: 'https://logos.hunter.io/hm.com' },
];

// ---- Image pools (known-good Unsplash photos) ----
const IMG = {
  sneakers: [
    'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800',
    'https://images.unsplash.com/photo-1514989940723-e8e51d675571?w=800',
    'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=800',
    'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800',
    'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=800',
    'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800',
    'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?w=800',
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800',
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800',
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800',
  ],
  watches: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800',
    'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800',
    'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800',
    'https://images.unsplash.com/photo-1548171915-e79a380a2a4b?w=800',
    'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=800',
    'https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=800',
    'https://images.unsplash.com/photo-1622434641406-a158123450f9?w=800',
  ],
  glasses: [
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800',
    'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800',
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800',
    'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800',
    'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800',
    'https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=800',
  ],
  handbags: [
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800',
    'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800',
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800',
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800',
    'https://images.unsplash.com/photo-1559563458-527698bf5295?w=800',
    'https://images.unsplash.com/photo-1597633425046-08f5110420b5?w=800',
  ],
  clothing: [
    'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800',
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800',
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800',
    'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
    'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800',
    'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800',
  ],
};

const SNEAKER_SIZES = { US: ['6', '7', '8', '9', '10', '11', '12'] };
const APPAREL_SIZES = { US: ['S', 'M', 'L', 'XL', 'XXL'] };
const ONE_SIZE = { oneSize: ['One Size'] };

const slugify = (s) =>
  s.toLowerCase().replace(/["']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

let _n = 0;
const pick = (arr, i) => arr[i % arr.length];

function make({ name, brandSlug, price, originalPrice, category, subcategory = null, images, sizes, color = 'Assorted', hex = '#1A1A1A', featured = false, desc }) {
  _n += 1;
  return {
    name,
    slug: slugify(name) + '-' + _n,
    brandSlug,
    description: desc || `${name} — 100% authentic, verified original with bill and original packaging. Fast shipping across India.`,
    price,
    originalPrice: originalPrice ?? null,
    images,
    sizes,
    colors: [{ name: color, hex }],
    category,
    subcategory,
    isFeatured: featured,
    inStock: true,
  };
}

// ================================================================
// SNEAKERS (28)
// ================================================================
const sneakerDefs = [
  ['jordan', 'Air Jordan 1 Retro High OG "Chicago"', 18500, 22000],
  ['nike', 'Nike Dunk Low "Panda"', 7500, 9500],
  ['nike', 'Nike Air Max 90 "Infrared"', 9500, 12000],
  ['nike', 'Nike Air Force 1 07 "Triple White"', 8000, 10000],
  ['adidas', 'Adidas Yeezy Boost 350 V2 "Zebra"', 22000, 28000],
  ['adidas', 'Adidas Samba OG "Black White"', 9000, 11000],
  ['adidas', 'Adidas Forum Low "Cloud White"', 8000, 10000],
  ['jordan', 'Air Jordan 4 Retro "Bred"', 19500, 24000],
  ['jordan', 'Air Jordan 3 "White Cement"', 17500, 21000],
  ['new-balance', 'New Balance 550 "White Green"', 8500, 10500],
  ['new-balance', 'New Balance 990v5 "Grey"', 14000, 17000],
  ['puma', 'Puma Suede Classic XXI', 5500, 7000],
  ['puma', 'Puma RS-X "Reinvention"', 7000, 9000],
  ['reebok', 'Reebok Club C 85 Vintage', 5000, 6500],
  ['converse', 'Converse Chuck 70 High "Black"', 6500, 8000],
  ['converse', 'Converse Run Star Hike "Platform"', 8500, 10500],
  ['vans', 'Vans Old Skool "Black White"', 4500, 5500],
  ['vans', 'Vans Sk8-Hi "Checkerboard"', 5000, 6500],
  ['asics', 'Asics Gel-Lyte III "OG"', 9500, 12000],
  ['asics', 'Asics Gel-Kayano 14 "Cream"', 13000, 16000],
  ['nike', 'Nike Air Max 270 "Triple Black"', 11000, 13500],
  ['adidas', 'Adidas Ultraboost Light "Core Black"', 16000, 19000],
  ['jordan', 'Air Jordan 11 "Cool Grey"', 21000, 26000],
  ['nike', 'Nike Blazer Mid 77 Vintage', 8000, 10000],
  ['skechers', 'Skechers D Lites "Retro"', 4000, 5500],
  ['fila', 'Fila Disruptor II "Chunky"', 5500, 7000],
  ['new-balance', 'New Balance 327 "Sea Salt"', 9000, 11000],
  ['puma', 'Puma Cali Dream "Pastel"', 6500, 8500],
];
const sneakers = sneakerDefs.map((d, i) =>
  make({ brandSlug: d[0], name: d[1], price: d[2], originalPrice: d[3], category: 'sneakers', images: [pick(IMG.sneakers, i)], sizes: SNEAKER_SIZES, color: 'Multi', hex: '#FFFFFF', featured: true })
);

// ================================================================
// LUXURY WATCHES (28)  — subcategories: mens-watches / womens-watches
// ================================================================
const watchDefs = [
  ['rolex', 'Rolex Submariner Date "Black"', 285000, 320000, 'mens-watches'],
  ['rolex', 'Rolex Daytona "Cosmograph"', 450000, 520000, 'mens-watches'],
  ['rolex', 'Rolex GMT-Master II "Batman"', 410000, 470000, 'mens-watches'],
  ['rolex', 'Rolex Datejust 41 "Wimbledon"', 320000, 360000, 'mens-watches'],
  ['omega', 'Omega Speedmaster Professional', 145000, 165000, 'mens-watches'],
  ['omega', 'Omega Seamaster Planet Ocean', 175000, 200000, 'mens-watches'],
  ['hublot', 'Hublot Classic Fusion "Titanium"', 185000, 220000, 'mens-watches'],
  ['hublot', 'Hublot Big Bang Unico "King Gold"', 360000, 420000, 'mens-watches'],
  ['tag-heuer', 'TAG Heuer Carrera Chronograph', 165000, 195000, 'mens-watches'],
  ['tag-heuer', 'TAG Heuer Monaco "Steve McQueen"', 240000, 280000, 'mens-watches'],
  ['omega', 'Omega Seamaster Diver 300M', 158000, 185000, 'mens-watches'],
  ['rolex', 'Rolex Explorer II "Polar"', 380000, 430000, 'mens-watches'],
  ['hublot', 'Hublot Spirit of Big Bang', 290000, 340000, 'mens-watches'],
  ['tag-heuer', 'TAG Heuer Aquaracer Professional', 120000, 145000, 'mens-watches'],
  ['cartier', 'Cartier Tank Must Large', 195000, 230000, 'womens-watches'],
  ['cartier', 'Cartier Ballon Bleu 33mm', 285000, 330000, 'womens-watches'],
  ['rolex', 'Rolex Lady-Datejust 28 "Silver"', 310000, 360000, 'womens-watches'],
  ['rolex', 'Rolex Oyster Perpetual 31 "Pink"', 260000, 300000, 'womens-watches'],
  ['omega', 'Omega De Ville Prestige 32mm', 135000, 160000, 'womens-watches'],
  ['omega', 'Omega Constellation 28mm', 168000, 195000, 'womens-watches'],
  ['cartier', 'Cartier Panthere de Cartier', 320000, 380000, 'womens-watches'],
  ['hublot', 'Hublot Classic Fusion 33mm "Rose"', 210000, 250000, 'womens-watches'],
  ['tag-heuer', 'TAG Heuer Aquaracer 32mm "Diamond"', 145000, 175000, 'womens-watches'],
  ['cartier', 'Cartier Santos de Cartier Small', 305000, 355000, 'womens-watches'],
  ['rolex', 'Rolex Datejust 31 "Mother of Pearl"', 340000, 390000, 'womens-watches'],
  ['omega', 'Omega Seamaster Aqua Terra 34mm', 152000, 178000, 'womens-watches'],
  ['hublot', 'Hublot Big Bang One Click 33mm', 270000, 320000, 'womens-watches'],
  ['cartier', 'Cartier Tank Francaise 25mm', 225000, 265000, 'womens-watches'],
];
const watches = watchDefs.map((d, i) =>
  make({ brandSlug: d[0], name: d[1], price: d[2], originalPrice: d[3], category: 'watches', subcategory: d[4], images: [pick(IMG.watches, i)], sizes: ONE_SIZE, color: 'Steel', hex: '#C0C0C0', featured: true })
);

// ================================================================
// GLASSES (28)  — subcategories: mens-glasses / womens-glasses
// ================================================================
const glassDefs = [
  ['ray-ban', 'Ray-Ban Wayfarer Classic', 2500, 3500, 'mens-glasses'],
  ['ray-ban', 'Ray-Ban Aviator Classic', 2800, 3800, 'mens-glasses'],
  ['ray-ban', 'Ray-Ban Clubmaster Classic', 3000, 4000, 'mens-glasses'],
  ['ray-ban', 'Ray-Ban Justin Matte Black', 2600, 3600, 'mens-glasses'],
  ['oakley', 'Oakley Holbrook "Matte Black"', 3500, 4500, 'mens-glasses'],
  ['oakley', 'Oakley Gascan "Polarized"', 3800, 4800, 'mens-glasses'],
  ['oakley', 'Oakley Flak 2.0 XL "Prizm"', 4200, 5200, 'mens-glasses'],
  ['gucci', 'Gucci Rectangular Frame "Black"', 7500, 10000, 'mens-glasses'],
  ['prada', 'Prada Linea Rossa Sport', 8000, 11000, 'mens-glasses'],
  ['ray-ban', 'Ray-Ban Hexagonal Flat Lens', 3200, 4200, 'mens-glasses'],
  ['oakley', 'Oakley Radar EV Path', 4500, 5500, 'mens-glasses'],
  ['gucci', 'Gucci Pilot Frame "Gold"', 8500, 11500, 'mens-glasses'],
  ['prada', 'Prada Symbole Geometric', 9000, 12000, 'mens-glasses'],
  ['ray-ban', 'Ray-Ban Erika Velvet', 2900, 3900, 'mens-glasses'],
  ['gucci', 'Gucci Oversized Sunglasses', 8500, 12000, 'womens-glasses'],
  ['gucci', 'Gucci Cat-Eye "Tortoise"', 9000, 12500, 'womens-glasses'],
  ['prada', 'Prada Cat-Eye Baroque', 9500, 13000, 'womens-glasses'],
  ['prada', 'Prada Butterfly Gradient', 8800, 12000, 'womens-glasses'],
  ['ray-ban', 'Ray-Ban Round Metal "Gold"', 3100, 4100, 'womens-glasses'],
  ['ray-ban', 'Ray-Ban Jackie Ohh', 2700, 3700, 'womens-glasses'],
  ['gucci', 'Gucci Square Oversized "Havana"', 9200, 12800, 'womens-glasses'],
  ['oakley', 'Oakley Feedback "Rose Gold"', 4000, 5000, 'womens-glasses'],
  ['prada', 'Prada Hexagonal Slim', 8600, 11800, 'womens-glasses'],
  ['gucci', 'Gucci GG Logo Cat-Eye', 9800, 13500, 'womens-glasses'],
  ['ray-ban', 'Ray-Ban Marble Cat-Eye', 3300, 4300, 'womens-glasses'],
  ['prada', 'Prada Oval Acetate "Pink"', 8400, 11500, 'womens-glasses'],
  ['gucci', 'Gucci Shield Wraparound', 11000, 15000, 'womens-glasses'],
  ['oakley', 'Oakley Sutro "Lavender"', 4300, 5300, 'womens-glasses'],
];
const glasses = glassDefs.map((d, i) =>
  make({ brandSlug: d[0], name: d[1], price: d[2], originalPrice: d[3], category: 'glasses', subcategory: d[4], images: [pick(IMG.glasses, i)], sizes: ONE_SIZE, color: 'Black', hex: '#000000', featured: true })
);

// ================================================================
// HANDBAGS (28)
// ================================================================
const bagDefs = [
  ['louis-vuitton', 'Louis Vuitton Neverfull MM', 45000, 55000],
  ['louis-vuitton', 'Louis Vuitton Speedy 30', 38000, 48000],
  ['louis-vuitton', 'Louis Vuitton Pochette Metis', 52000, 62000],
  ['louis-vuitton', 'Louis Vuitton Alma BB', 48000, 58000],
  ['gucci', 'Gucci Marmont Mini Shoulder Bag', 55000, 70000],
  ['gucci', 'Gucci Dionysus Small GG', 62000, 78000],
  ['gucci', 'Gucci Soho Disco Bag', 42000, 54000],
  ['gucci', 'Gucci Horsebit 1955 Mini', 58000, 72000],
  ['michael-kors', 'Michael Kors Hamilton Large Tote', 8500, 12000],
  ['michael-kors', 'Michael Kors Jet Set Crossbody', 7000, 10000],
  ['michael-kors', 'Michael Kors Mercer Medium', 9500, 13000],
  ['prada', 'Prada Re-Edition 2005 Nylon', 48000, 60000],
  ['prada', 'Prada Galleria Saffiano Medium', 68000, 82000],
  ['louis-vuitton', 'Louis Vuitton OnTheGo MM', 72000, 88000],
  ['louis-vuitton', 'Louis Vuitton Multi Pochette', 65000, 80000],
  ['gucci', 'Gucci Ophidia GG Medium Tote', 54000, 68000],
  ['gucci', 'Gucci Jackie 1961 Small', 60000, 75000],
  ['michael-kors', 'Michael Kors Voyager Tote', 9000, 12500],
  ['michael-kors', 'Michael Kors Bedford Satchel', 8000, 11000],
  ['prada', 'Prada Cleo Brushed Leather', 72000, 86000],
  ['louis-vuitton', 'Louis Vuitton Capucines BB', 95000, 115000],
  ['gucci', 'Gucci Bamboo 1947 Mini', 64000, 80000],
  ['michael-kors', 'Michael Kors Greenwich Small', 7500, 10500],
  ['prada', 'Prada Panier Small', 66000, 80000],
  ['louis-vuitton', 'Louis Vuitton Petit Palais', 78000, 94000],
  ['gucci', 'Gucci Aphrodite Medium', 70000, 86000],
  ['michael-kors', 'Michael Kors Cece Quilted', 8200, 11500],
  ['prada', 'Prada Re-Nylon Tote', 58000, 72000],
];
const handbags = bagDefs.map((d, i) =>
  make({ brandSlug: d[0], name: d[1], price: d[2], originalPrice: d[3], category: 'handbags', images: [pick(IMG.handbags, i)], sizes: ONE_SIZE, color: 'Assorted', hex: '#8B5A2B', featured: true })
);

// ================================================================
// CLOTHING (28)  — subcategories: track-pants / jeans / shirts / tshirts / denims
// ================================================================
const clothingDefs = [
  ['adidas', 'Adidas Essentials Track Pants', 2500, 3500, 'track-pants'],
  ['nike', 'Nike Sportswear Club Joggers', 2800, 3800, 'track-pants'],
  ['puma', 'Puma Iconic T7 Track Pants', 2600, 3600, 'track-pants'],
  ['under-armour', 'Under Armour Sportstyle Joggers', 3000, 4000, 'track-pants'],
  ['adidas', 'Adidas Tiro 23 Training Pants', 2700, 3700, 'track-pants'],
  ['nike', 'Nike Therma-FIT Tapered Pants', 3200, 4200, 'track-pants'],
  ['levis', 'Levis 511 Slim Fit Jeans', 3500, 4800, 'jeans'],
  ['levis', 'Levis 501 Original Fit Jeans', 3800, 5000, 'jeans'],
  ['hm', 'H&M Slim Tapered Jeans', 1800, 2600, 'jeans'],
  ['levis', 'Levis 512 Slim Taper Jeans', 3600, 4900, 'jeans'],
  ['hm', 'H&M Relaxed Fit Jeans', 1900, 2700, 'jeans'],
  ['levis', 'Levis 721 High Rise Skinny', 3700, 5000, 'jeans'],
  ['hm', 'H&M Oxford Cotton Shirt', 1500, 2200, 'shirts'],
  ['levis', 'Levis Classic Western Shirt', 2800, 3800, 'shirts'],
  ['hm', 'H&M Linen-Blend Resort Shirt', 1700, 2400, 'shirts'],
  ['nike', 'Nike Sportswear Flannel Shirt', 3000, 4000, 'shirts'],
  ['hm', 'H&M Slim Fit Poplin Shirt', 1400, 2000, 'shirts'],
  ['levis', 'Levis Battery Housemark Shirt', 2900, 3900, 'shirts'],
  ['nike', 'Nike Dri-FIT Training T-Shirt', 1500, 2000, 'tshirts'],
  ['adidas', 'Adidas Trefoil Logo Tee', 1400, 1900, 'tshirts'],
  ['puma', 'Puma Essentials Logo Tee', 1200, 1700, 'tshirts'],
  ['hm', 'H&M Regular Fit Cotton Tee', 800, 1200, 'tshirts'],
  ['under-armour', 'Under Armour Tech 2.0 Tee', 1600, 2200, 'tshirts'],
  ['nike', 'Nike Sportswear Club Tee', 1500, 2100, 'tshirts'],
  ['levis', 'Levis Trucker Denim Jacket', 4500, 6000, 'denims'],
  ['hm', 'H&M Denim Overshirt', 2400, 3400, 'denims'],
  ['levis', 'Levis Sherpa Trucker Jacket', 5200, 6800, 'denims'],
  ['hm', 'H&M Relaxed Denim Jacket', 2600, 3600, 'denims'],
];
const clothing = clothingDefs.map((d, i) =>
  make({ brandSlug: d[0], name: d[1], price: d[2], originalPrice: d[3], category: 'clothing', subcategory: d[4], images: [pick(IMG.clothing, i)], sizes: APPAREL_SIZES, color: 'Assorted', hex: '#1A1A1A', featured: true })
);

// ================================================================
// UA BATCH — budget replicas
// ================================================================
const uaDefs = [
  ['nike', 'UA Batch Nike Dunk Low "Reverse Panda"', 4500, 6000],
  ['jordan', 'UA Batch Air Jordan 1 "Mocha"', 7500, 9500],
  ['adidas', 'UA Batch Adidas Yeezy 350 "Onyx"', 8500, 11000],
  ['jordan', 'UA Batch Air Jordan 4 "Black Cat"', 7800, 9800],
  ['nike', 'UA Batch Nike Air Force 1 Low', 4200, 5800],
];
const uaBatch = uaDefs.map((d, i) =>
  make({ brandSlug: d[0], name: d[1], price: d[2], originalPrice: d[3], category: 'ua-batch', images: [pick(IMG.sneakers, i + 3)], sizes: SNEAKER_SIZES, color: 'Multi', hex: '#FFFFFF', featured: i < 3 })
);

export const products = [
  ...sneakers,
  ...watches,
  ...glasses,
  ...handbags,
  ...clothing,
  ...uaBatch,
];

// Subcategory metadata for the storefront filters
export const subcategories = {
  watches: [
    { slug: 'mens-watches', label: "Men's Watches" },
    { slug: 'womens-watches', label: "Women's Watches" },
  ],
  glasses: [
    { slug: 'mens-glasses', label: "Men's Glasses" },
    { slug: 'womens-glasses', label: "Women's Glasses" },
  ],
  clothing: [
    { slug: 'track-pants', label: 'Track Pants' },
    { slug: 'jeans', label: 'Jeans' },
    { slug: 'shirts', label: 'Shirts' },
    { slug: 'tshirts', label: 'T-Shirts' },
    { slug: 'denims', label: 'Denims' },
  ],
};
