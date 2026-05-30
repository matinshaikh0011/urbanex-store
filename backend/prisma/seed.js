import { PrismaClient } from '@prisma/client';
import { brands, products } from '../src/catalog.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Brands
  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: { name: brand.name, logoUrl: brand.logoUrl },
      create: brand,
    });
  }
  console.log(`✅ ${brands.length} brands upserted`);

  // Products
  let count = 0;
  for (const product of products) {
    const brand = await prisma.brand.findUnique({ where: { slug: product.brandSlug } });
    if (!brand) {
      console.warn(`⚠️  Missing brand for ${product.name} (${product.brandSlug})`);
      continue;
    }

    const data = {
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
      subcategory: product.subcategory,
      isFeatured: product.isFeatured,
      inStock: product.inStock,
    };

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: data,
      create: data,
    });
    count += 1;
  }
  console.log(`✅ ${count} products upserted`);
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
