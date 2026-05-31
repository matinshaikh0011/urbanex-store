import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Sneakers', slug: 'sneakers', description: 'Athletic and casual sneakers', sortOrder: 1, featured: true, active: true },
  { name: 'Watches', slug: 'watches', description: 'Premium watches', sortOrder: 2, featured: true, active: true },
  { name: 'Luxury Watches', slug: 'luxury-watches', description: 'Luxury timepieces', sortOrder: 3, featured: true, active: true },
  { name: 'Glasses', slug: 'glasses', description: 'Sunglasses and eyewear', sortOrder: 4, featured: true, active: true },
  { name: 'Handbags', slug: 'handbags', description: 'Designer handbags', sortOrder: 5, featured: true, active: true },
  { name: 'Clothing', slug: 'clothing', description: 'Streetwear clothing', sortOrder: 6, featured: true, active: true },
  { name: 'UA Batch', slug: 'ua-batch', description: 'UA batch products', sortOrder: 7, featured: false, active: true },
];

async function main() {
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
    console.log(`Upserted: ${cat.name}`);
  }
  console.log('Category seed complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
