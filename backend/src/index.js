import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const mockBrands = [
  { id: 1, name: 'Nike', slug: 'nike', logoUrl: 'https://logos.hunter.io/nike.com' },
  { id: 2, name: 'Adidas', slug: 'adidas', logoUrl: 'https://logos.hunter.io/adidas.com' },
  { id: 3, name: 'Jordan', slug: 'jordan', logoUrl: 'https://cdn.simpleicons.org/jordan' },
  { id: 4, name: 'Puma', slug: 'puma', logoUrl: 'https://logos.hunter.io/puma.com' },
  { id: 5, name: 'New Balance', slug: 'new-balance', logoUrl: 'https://logos.hunter.io/newbalance.com' },
  { id: 6, name: 'Reebok', slug: 'reebok', logoUrl: 'https://logos.hunter.io/reebok.com' },
  { id: 7, name: 'Converse', slug: 'converse', logoUrl: 'https://logos.hunter.io/converse.com' },
  { id: 8, name: 'Vans', slug: 'vans', logoUrl: 'https://logos.hunter.io/vans.com' },
  { id: 9, name: 'Asics', slug: 'asics', logoUrl: 'https://logos.hunter.io/asics.com' },
  { id: 10, name: 'Fila', slug: 'fila', logoUrl: 'https://logos.hunter.io/fila.com' },
  { id: 11, name: 'Under Armour', slug: 'under-armour', logoUrl: 'https://logos.hunter.io/underarmour.com' },
  { id: 12, name: 'Skechers', slug: 'skechers', logoUrl: 'https://logos.hunter.io/skechers.com' },
  { id: 13, name: 'Rolex', slug: 'rolex', logoUrl: 'https://logos.hunter.io/rolex.com' },
  { id: 14, name: 'Omega', slug: 'omega', logoUrl: 'https://logos.hunter.io/omegawatches.com' },
  { id: 15, name: 'Hublot', slug: 'hublot', logoUrl: 'https://logos.hunter.io/hublot.com' },
  { id: 16, name: 'Ray-Ban', slug: 'ray-ban', logoUrl: 'https://logos.hunter.io/ray-ban.com' },
  { id: 17, name: 'Oakley', slug: 'oakley', logoUrl: 'https://logos.hunter.io/oakley.com' },
  { id: 18, name: 'Gucci', slug: 'gucci', logoUrl: 'https://logos.hunter.io/gucci.com' },
  { id: 19, name: 'Louis Vuitton', slug: 'louis-vuitton', logoUrl: 'https://logos.hunter.io/louisvuitton.com' },
  { id: 20, name: 'Michael Kors', slug: 'michael-kors', logoUrl: 'https://logos.hunter.io/michaelkors.com' }
];

const mockProducts = [
  // Sneakers
  { id: 1, name: 'Air Jordan 1 Retro High OG "Chicago"', slug: 'air-jordan-1-retro-high-og-chicago', brand: mockBrands[2], brandId: 3, description: 'The Air Jordan 1 Retro High OG brings back the iconic Chicago colorway.', price: 18500, originalPrice: 22000, images: ['https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800'], sizes: { US: ['7', '8', '9', '10', '11', '12'] }, colors: [{ name: 'White/Black-Varsity Red', hex: '#FFFFFF' }], category: 'sneakers', isFeatured: true, inStock: true },
  { id: 2, name: 'Nike Dunk Low "Panda"', slug: 'nike-dunk-low-panda', brand: mockBrands[0], brandId: 1, description: 'The Nike Dunk Low returns in the classic Black/White colorway.', price: 7500, originalPrice: 9500, images: ['https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800'], sizes: { US: ['6', '7', '8', '9', '10', '11', '12'] }, colors: [{ name: 'Black/White', hex: '#000000' }], category: 'sneakers', isFeatured: true, inStock: true },
  { id: 3, name: 'Nike Air Max 90 "Infrared"', slug: 'nike-air-max-90-infrared', brand: mockBrands[0], brandId: 1, description: 'The Air Max 90 stays true to its OG roots.', price: 9500, originalPrice: 12000, images: ['https://images.unsplash.com/photo-1514989940723-e8e51d675571?w=800'], sizes: { US: ['7', '8', '9', '10', '11', '12'] }, colors: [{ name: 'White/Black-Radiant Red', hex: '#FFFFFF' }], category: 'sneakers', isFeatured: true, inStock: true },
  { id: 6, name: 'Adidas Yeezy Boost 350 V2 "Zebra"', slug: 'adidas-yeezy-boost-350-v2-zebra', brand: mockBrands[1], brandId: 2, description: 'The Yeezy Boost 350 V2 features a Primeknit upper.', price: 22000, originalPrice: 28000, images: ['https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=800'], sizes: { US: ['7', '8', '9', '10', '11', '12', '13'] }, colors: [{ name: 'White/Core Black/Red', hex: '#FFFFFF' }], category: 'sneakers', isFeatured: true, inStock: true },
  { id: 10, name: 'New Balance 550 "White Green"', slug: 'new-balance-550-white-green', brand: mockBrands[4], brandId: 5, description: 'The New Balance 550 brings retro basketball style.', price: 8500, originalPrice: 10500, images: ['https://images.unsplash.com/photo-1539185441755-769473a23570?w=800'], sizes: { US: ['7', '8', '9', '10', '11', '12'] }, colors: [{ name: 'White/Green', hex: '#FFFFFF' }], category: 'sneakers', isFeatured: false, inStock: true },
  { id: 14, name: 'Converse Chuck 70 High "Black"', slug: 'converse-chuck-70-high-black', brand: mockBrands[6], brandId: 7, description: 'The Chuck 70 elevates the classic with premium materials.', price: 6500, originalPrice: 8000, images: ['https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=800'], sizes: { US: ['6', '7', '8', '9', '10', '11', '12', '13'] }, colors: [{ name: 'Black', hex: '#000000' }], category: 'sneakers', isFeatured: true, inStock: true },
  { id: 17, name: 'Vans Sk8-Hi "Checkerboard"', slug: 'vans-sk8-hi-checkerboard', brand: mockBrands[7], brandId: 8, description: 'The Vans Sk8-Hi is the legendary high-top.', price: 5000, originalPrice: 6500, images: ['https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800'], sizes: { US: ['6', '7', '8', '9', '10', '11', '12'] }, colors: [{ name: 'Checkerboard Black/White', hex: '#000000' }], category: 'sneakers', isFeatured: true, inStock: true },

  // UA Batch
  { id: 25, name: 'UA Batch Nike Dunk Low "Reverse Panda"', slug: 'ua-batch-nike-dunk-low-reverse-panda', brand: mockBrands[0], brandId: 1, description: 'Exclusive UA batch - Premium quality replica', price: 4500, originalPrice: 6000, images: ['https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800'], sizes: { US: ['7', '8', '9', '10', '11', '12'] }, colors: [{ name: 'White/Black', hex: '#FFFFFF' }], category: 'ua-batch', isFeatured: true, inStock: true },
  { id: 26, name: 'UA Batch Air Jordan 1 "Mocha"', slug: 'ua-batch-air-jordan-1-mocha', brand: mockBrands[2], brandId: 3, description: 'UA batch - High quality replica with original box', price: 7500, originalPrice: 9500, images: ['https://images.unsplash.com/photo-1597045566677-8cf032ed6634?w=800'], sizes: { US: ['8', '9', '10', '11'] }, colors: [{ name: 'Sail/Dark Mocha', hex: '#F5F5DC' }], category: 'ua-batch', isFeatured: true, inStock: true },
  { id: 27, name: 'UA Batch Adidas Yeezy 350 "Onyx"', slug: 'ua-batch-adidas-yeezy-350-onyx', brand: mockBrands[1], brandId: 2, description: 'UA batch - Best quality replica', price: 8500, originalPrice: 11000, images: ['https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=800'], sizes: { US: ['7', '8', '9', '10', '11', '12'] }, colors: [{ name: 'Onyx', hex: '#353839' }], category: 'ua-batch', isFeatured: false, inStock: true },

  // Watches
  { id: 30, name: 'Rolex Submariner Date "Black"', slug: 'rolex-submariner-date-black', brand: mockBrands[12], brandId: 13, description: 'Rolex Submariner with date - 100% authentic with box and papers', price: 285000, originalPrice: 320000, images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'], sizes: { oneSize: ['One Size'] }, colors: [{ name: 'Black/Steel', hex: '#000000' }], category: 'watches', isFeatured: true, inStock: true },
  { id: 31, name: 'Omega Speedmaster Professional', slug: 'omega-speedmaster-professional', brand: mockBrands[13], brandId: 14, description: 'The iconic Moonwatch - Full set', price: 145000, originalPrice: 165000, images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800'], sizes: { oneSize: ['One Size'] }, colors: [{ name: 'Black/Steel', hex: '#000000' }], category: 'watches', isFeatured: true, inStock: true },
  { id: 32, name: 'Hublot Classic Fusion "Titanium"', slug: 'hublot-classic-fusion-titanium', brand: mockBrands[14], brandId: 15, description: 'Hublot Classic Fusion - Premium quality', price: 185000, originalPrice: 220000, images: ['https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800'], sizes: { oneSize: ['One Size'] }, colors: [{ name: 'Titanium/Grey', hex: '#878681' }], category: 'watches', isFeatured: false, inStock: true },

  // Luxury Watches
  { id: 35, name: 'Rolex Daytona "Cosmograph"', slug: 'rolex-daytona-cosmograph', brand: mockBrands[12], brandId: 13, description: 'The ultimate luxury sports watch - Full set', price: 450000, originalPrice: 520000, images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800'], sizes: { oneSize: ['One Size'] }, colors: [{ name: 'Gold/Black', hex: '#FFD700' }], category: 'luxury-watches', isFeatured: true, inStock: true },
  { id: 36, name: 'Omega Seamaster Planet Ocean', slug: 'omega-seamaster-planet-ocean', brand: mockBrands[13], brandId: 14, description: 'James Bond edition - Full set', price: 175000, originalPrice: 200000, images: ['https://images.unsplash.com/photo-1548171915-e79a380a2a4b?w=800'], sizes: { oneSize: ['One Size'] }, colors: [{ name: 'Blue/Orange', hex: '#0055A4' }], category: 'luxury-watches', isFeatured: true, inStock: true },

  // Glasses
  { id: 40, name: 'Ray-Ban Wayfarer Classic', slug: 'ray-ban-wayfarer-classic', brand: mockBrands[15], brandId: 16, description: 'The iconic Wayfarer - 100% UV protection', price: 2500, originalPrice: 3500, images: ['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800'], sizes: { oneSize: ['One Size'] }, colors: [{ name: 'Black', hex: '#000000' }], category: 'glasses', isFeatured: true, inStock: true },
  { id: 41, name: 'Ray-Ban Aviator Classic', slug: 'ray-ban-aviator-classic', brand: mockBrands[15], brandId: 16, description: 'The classic Aviator - Timeless design', price: 2800, originalPrice: 3800, images: ['https://images.unsplash.com/photo-1577803645773-f96470509666?w=800'], sizes: { oneSize: ['One Size'] }, colors: [{ name: 'Gold/Green', hex: '#FFD700' }], category: 'glasses', isFeatured: true, inStock: true },
  { id: 42, name: 'Oakley Holbrook "Matte Black"', slug: 'oakley-holbrook-matte-black', brand: mockBrands[16], brandId: 17, description: 'Performance sunglasses with Prizm lens technology', price: 3500, originalPrice: 4500, images: ['https://images.unsplash.com/photo-1577803645773-f96470509666?w=800'], sizes: { oneSize: ['One Size'] }, colors: [{ name: 'Matte Black', hex: '#28282B' }], category: 'glasses', isFeatured: false, inStock: true },
  { id: 43, name: 'Gucci Oversized Sunglasses', slug: 'gucci-oversized-sunglasses', brand: mockBrands[17], brandId: 18, description: 'Luxury oversized frame with GG logo', price: 8500, originalPrice: 12000, images: ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800'], sizes: { oneSize: ['One Size'] }, colors: [{ name: 'Black/Gold', hex: '#000000' }], category: 'glasses', isFeatured: true, inStock: true },

  // Handbags
  { id: 50, name: 'Louis Vuitton Neverfull MM', slug: 'louis-vuitton-neverfull-mm', brand: mockBrands[18], brandId: 19, description: 'The iconic LV Neverfull - 100% authentic with dustbag and box', price: 45000, originalPrice: 55000, images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800'], sizes: { oneSize: ['One Size'] }, colors: [{ name: 'Monogram', hex: '#F5F5DC' }], category: 'handbags', isFeatured: true, inStock: true },
  { id: 51, name: 'Louis Vuitton Speedy 30', slug: 'louis-vuitton-speedy-30', brand: mockBrands[18], brandId: 19, description: 'The legendary Speedy - Full set', price: 38000, originalPrice: 48000, images: ['https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800'], sizes: { oneSize: ['One Size'] }, colors: [{ name: 'Monogram', hex: '#F5F5DC' }], category: 'handbags', isFeatured: true, inStock: true },
  { id: 52, name: 'Michael Kors Hamilton Large Tote', slug: 'michael-kors-hamilton-large-tote', brand: mockBrands[19], brandId: 20, description: 'Premium leather tote bag', price: 8500, originalPrice: 12000, images: ['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800'], sizes: { oneSize: ['One Size'] }, colors: [{ name: 'Black', hex: '#000000' }], category: 'handbags', isFeatured: true, inStock: true },
  { id: 53, name: 'Gucci Marmont Mini Shoulder Bag', slug: 'gucci-marmont-mini-shoulder-bag', brand: mockBrands[17], brandId: 18, description: 'Iconic GG Marmont - With chain strap', price: 55000, originalPrice: 70000, images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800'], sizes: { oneSize: ['One Size'] }, colors: [{ name: 'Black/Gold', hex: '#000000' }], category: 'handbags', isFeatured: true, inStock: true },

  // Clothing
  { id: 60, name: 'Nike Sportswear Hoodie', slug: 'nike-sportswear-hoodie', brand: mockBrands[0], brandId: 1, description: 'Premium fleece hoodie - Perfect for layering', price: 3500, originalPrice: 4500, images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800'], sizes: { US: ['S', 'M', 'L', 'XL', 'XXL'] }, colors: [{ name: 'Black', hex: '#000000' }], category: 'clothing', isFeatured: true, inStock: true },
  { id: 61, name: 'Adidas Trefoil Hoodie', slug: 'adidas-trefoil-hoodie', brand: mockBrands[1], brandId: 2, description: 'Classic trefoil logo hoodie - Cotton blend', price: 3200, originalPrice: 4200, images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800'], sizes: { US: ['S', 'M', 'L', 'XL', 'XXL'] }, colors: [{ name: 'Black/White', hex: '#000000' }], category: 'clothing', isFeatured: false, inStock: true },
  { id: 62, name: 'Nike Dri-FIT Training T-Shirt', slug: 'nike-dri-fit-training-t-shirt', brand: mockBrands[0], brandId: 1, description: 'Moisture-wicking technology - Perfect for workouts', price: 1500, originalPrice: 2000, images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'], sizes: { US: ['S', 'M', 'L', 'XL', 'XXL'] }, colors: [{ name: 'White', hex: '#FFFFFF' }], category: 'clothing', isFeatured: false, inStock: true },
  { id: 63, name: 'Adidas Essentials Track Pants', slug: 'adidas-essentials-track-pants', brand: mockBrands[1], brandId: 2, description: 'Comfortable track pants for everyday wear', price: 2500, originalPrice: 3500, images: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800'], sizes: { US: ['S', 'M', 'L', 'XL', 'XXL'] }, colors: [{ name: 'Black', hex: '#000000' }], category: 'clothing', isFeatured: false, inStock: true },
  { id: 64, name: 'Nike Air Max Windrunner', slug: 'nike-air-max-windrunner', brand: mockBrands[0], brandId: 1, description: 'Lightweight windbreaker with iconic design', price: 4500, originalPrice: 6000, images: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800'], sizes: { US: ['S', 'M', 'L', 'XL', 'XXL'] }, colors: [{ name: 'Black/White', hex: '#000000' }], category: 'clothing', isFeatured: true, inStock: true }
];

const orders = [];

app.use(cors());
app.use(express.json());

function generateOrderId() {
  const chars = '0123456789';
  let result = 'UEX-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// API Routes
app.get('/api/brands', (req, res) => res.json(mockBrands));

app.get('/api/products', (req, res) => {
  const { brand, category, featured } = req.query;
  let products = [...mockProducts];
  if (brand) products = products.filter(p => p.brand.slug === brand);
  if (category) products = products.filter(p => p.category === category);
  if (featured === 'true') products = products.filter(p => p.isFeatured);
  res.json(products);
});

app.get('/api/products/featured', (req, res) => res.json(mockProducts.filter(p => p.isFeatured)));

app.get('/api/products/:slug', (req, res) => {
  const product = mockProducts.find(p => p.slug === req.params.slug);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.post('/api/orders', (req, res) => {
  const { productId, size, color, quantity, totalAmount, shippingName, shippingAddress, shippingEmail, shippingPhone, items } = req.body;
  const orderId = generateOrderId();

  let orderItems = [];

  if (items && Array.isArray(items)) {
    // Cart checkout with multiple items
    orderItems = items.map((item) => {
      const product = mockProducts.find(p => p.id === parseInt(item.productId));
      return {
        productId: parseInt(item.productId),
        product: product || null,
        size: item.size,
        quantity: item.quantity || 1,
        price: item.price
      };
    });
  } else {
    // Single product checkout
    const product = mockProducts.find(p => p.id === parseInt(productId));
    orderItems = [{
      productId: parseInt(productId),
      product: product || null,
      size,
      quantity: quantity || 1,
      price: parseFloat(totalAmount)
    }];
  }

  const order = {
    id: orders.length + 1,
    orderId,
    items: orderItems,
    totalAmount: parseFloat(totalAmount),
    status: 'Pending Advance',
    advancePaid: false,
    shippingName,
    shippingAddress,
    shippingEmail,
    shippingPhone,
    createdAt: new Date().toISOString()
  };

  orders.push(order);
  res.status(201).json(order);
});

app.get('/api/orders/:orderId', (req, res) => {
  const order = orders.find(o => o.orderId === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`🚀 UrbanEx API running on port ${PORT}`));