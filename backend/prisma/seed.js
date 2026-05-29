import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const brands = [
  { name: 'Nike', slug: 'nike', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg' },
  { name: 'Adidas', slug: 'adidas', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Adidas_Logo.svg' },
  { name: 'Jordan', slug: 'jordan', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/37/Air_Jordan_logo.svg' },
  { name: 'Puma', slug: 'puma', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Puma_Logo.svg' },
  { name: 'New Balance', slug: 'new-balance', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/New_Balance_Logo.svg' },
  { name: 'Reebok', slug: 'reebok', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Reebok_Logo.svg' },
  { name: 'Converse', slug: 'converse', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Converse_Logo.svg' },
  { name: 'Vans', slug: 'vans', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Vans_logo.svg' }
];

const products = [
  {
    name: 'Air Jordan 1 Retro High OG "Chicago"',
    slug: 'air-jordan-1-retro-high-og-chicago',
    brandSlug: 'jordan',
    description: 'The Air Jordan 1 Retro High OG brings back the iconic Chicago colorway. Premium leather upper with the classic Wings logo and Nike Air branding.',
    price: 18500,
    originalPrice: 22000,
    images: ['https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800', 'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?w=800'],
    sizes: { US: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'] },
    colors: [{ name: 'White/Black-Varsity Red', hex: '#FFFFFF' }],
    category: 'sneakers',
    isFeatured: true
  },
  {
    name: 'Nike Dunk Low "Panda"',
    slug: 'nike-dunk-low-panda',
    brandSlug: 'nike',
    description: 'The Nike Dunk Low returns in the classic Black/White colorway. Leather upper with padded collar for comfort.',
    price: 7500,
    originalPrice: 9500,
    images: ['https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800'],
    sizes: { US: ['6', '7', '8', '9', '10', '11', '12'] },
    colors: [{ name: 'Black/White', hex: '#000000' }],
    category: 'sneakers',
    isFeatured: true
  },
  {
    name: 'Adidas Yeezy Boost 350 V2 "Zebra"',
    slug: 'adidas-yeezy-boost-350-v2-zebra',
    brandSlug: 'adidas',
    description: 'The Yeezy Boost 350 V2 features a Primeknit upper with the signature side stripe. Boost cushioning for ultimate comfort.',
    price: 22000,
    originalPrice: 28000,
    images: ['https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=800'],
    sizes: { US: ['7', '8', '9', '10', '11', '12', '13'] },
    colors: [{ name: 'White/Core Black/Red', hex: '#FFFFFF' }],
    category: 'sneakers',
    isFeatured: true
  },
  {
    name: 'New Balance 550 "White Green"',
    slug: 'new-balance-550-white-green',
    brandSlug: 'new-balance',
    description: 'The New Balance 550 brings retro basketball style to the streets. Premium leather upper with signature N logo.',
    price: 8500,
    originalPrice: 10500,
    images: ['https://images.unsplash.com/photo-1539185441755-769473a23570?w=800'],
    sizes: { US: ['7', '8', '9', '10', '11', '12'] },
    colors: [{ name: 'White/Green', hex: '#FFFFFF' }],
    category: 'sneakers',
    isFeatured: false
  },
  {
    name: 'Puma Suede Classic XXI',
    slug: 'puma-suede-classic-xxi',
    brandSlug: 'puma',
    description: 'The iconic Puma Suede in modern form. Soft suede upper with formstrip branding and rubber outsole.',
    price: 5500,
    originalPrice: 7000,
    images: ['https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800'],
    sizes: { US: ['6', '7', '8', '9', '10', '11', '12'] },
    colors: [{ name: 'Black/White', hex: '#000000' }],
    category: 'sneakers',
    isFeatured: false
  },
  {
    name: 'Converse Chuck 70 High "Black"',
    slug: 'converse-chuck-70-high-black',
    brandSlug: 'converse',
    description: 'The Chuck 70 elevates the classic with premium materials. Canvas upper with vintage details and cushioning.',
    price: 6500,
    originalPrice: 8000,
    images: ['https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=800'],
    sizes: { US: ['6', '7', '8', '9', '10', '11', '12', '13'] },
    colors: [{ name: 'Black', hex: '#000000' }],
    category: 'sneakers',
    isFeatured: true
  },
  {
    name: 'Vans Old Skool "Black/White"',
    slug: 'vans-old-skool-black-white',
    brandSlug: 'vans',
    description: 'The iconic Old Skool with the classic sidestripe. Durable canvas and suede upper with vulcanized construction.',
    price: 4500,
    originalPrice: 5500,
    images: ['https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800'],
    sizes: { US: ['5', '6', '7', '8', '9', '10', '11', '12'] },
    colors: [{ name: 'Black/White', hex: '#000000' }],
    category: 'sneakers',
    isFeatured: false
  },
  {
    name: 'Nike Air Max 90 "Infrared"',
    slug: 'nike-air-max-90-infrared',
    brandSlug: 'nike',
    description: 'The Air Max 90 stays true to its OG roots with the iconic Waffle outsole and visible Air unit.',
    price: 9500,
    originalPrice: 12000,
    images: ['https://images.unsplash.com/photo-1514989940723-e8e51d675571?w=800'],
    sizes: { US: ['7', '8', '9', '10', '11', '12'] },
    colors: [{ name: 'White/Black-Radiant Red', hex: '#FFFFFF' }],
    category: 'sneakers',
    isFeatured: true
  },
  {
    name: 'Adidas Forum Low "White"',
    slug: 'adidas-forum-low-white',
    brandSlug: 'adidas',
    description: 'The Forum Low brings 80s basketball heritage. Leather upper with iconic ankle strap.',
    price: 8000,
    originalPrice: 10000,
    images: ['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800'],
    sizes: { US: ['7', '8', '9', '10', '11', '12'] },
    colors: [{ name: 'White', hex: '#FFFFFF' }],
    category: 'sneakers',
    isFeatured: false
  },
  {
    name: 'Reebok Club C 85 Vintage',
    slug: 'reebok-club-c-85-vintage',
    brandSlug: 'reebok',
    description: 'The Club C 85 delivers timeless tennis style. Soft leather upper with clean lines and EVA midsole.',
    price: 5000,
    originalPrice: 6500,
    images: ['https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800'],
    sizes: { US: ['6', '7', '8', '9', '10', '11', '12'] },
    colors: [{ name: 'White/Green', hex: '#FFFFFF' }],
    category: 'sneakers',
    isFeatured: false
  }
];

async function main() {
  console.log('🌱 Seeding database...');

  // Create brands
  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {},
      create: brand
    });
  }
  console.log('✅ Brands created');

  // Create products
  for (const product of products) {
    const brand = await prisma.brand.findUnique({
      where: { slug: product.brandSlug }
    });

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        name: product.name,
        slug: product.slug,
        brandId: brand.id,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        images: product.images,
        sizes: product.sizes,
        colors: product.colors,
        category: product.category,
        isFeatured: product.isFeatured,
        inStock: true
      }
    });
  }
  console.log('✅ Products created');

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });