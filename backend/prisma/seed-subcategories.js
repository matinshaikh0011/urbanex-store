// seed-subcategories.js
// Creates subcategories under existing parent categories.
// Safe to re-run — uses upsert on slug.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const SUBCATEGORIES = [
  // Sneakers (parentSlug: sneakers)
  { name: "Men's Sneakers",   slug: 'mens-sneakers',   parentSlug: 'sneakers',       sortOrder: 1, active: true, featured: false },
  { name: "Women's Sneakers", slug: 'womens-sneakers', parentSlug: 'sneakers',       sortOrder: 2, active: true, featured: false },

  // Watches (parentSlug: watches)
  { name: "Men's Watches",    slug: 'mens-watches',    parentSlug: 'watches',        sortOrder: 1, active: true, featured: false },
  { name: "Women's Watches",  slug: 'womens-watches',  parentSlug: 'watches',        sortOrder: 2, active: true, featured: false },

  // Glasses (parentSlug: glasses)
  { name: 'Sunglasses',       slug: 'sunglasses',      parentSlug: 'glasses',        sortOrder: 1, active: true, featured: false },
  { name: 'Eyeglasses',       slug: 'eyeglasses',      parentSlug: 'glasses',        sortOrder: 2, active: true, featured: false },

  // Handbags (parentSlug: handbags)
  { name: "Women's Handbags", slug: 'womens-handbags', parentSlug: 'handbags',       sortOrder: 1, active: true, featured: false },
  { name: "Men's Bags",       slug: 'mens-bags',       parentSlug: 'handbags',       sortOrder: 2, active: true, featured: false },

  // Clothing (parentSlug: clothing)
  { name: 'T-Shirts',         slug: 'tshirts',         parentSlug: 'clothing',       sortOrder: 1, active: true, featured: false },
  { name: 'Track Pants',      slug: 'track-pants',     parentSlug: 'clothing',       sortOrder: 2, active: true, featured: false },
  { name: 'Jeans',            slug: 'jeans',           parentSlug: 'clothing',       sortOrder: 3, active: true, featured: false },
  { name: 'Shirts',           slug: 'shirts',          parentSlug: 'clothing',       sortOrder: 4, active: true, featured: false },
  { name: 'Denims',           slug: 'denims',          parentSlug: 'clothing',       sortOrder: 5, active: true, featured: false },

  // Luxury Watches (parentSlug: luxury-watches)
  { name: "Men's Luxury",     slug: 'mens-luxury-watches',   parentSlug: 'luxury-watches', sortOrder: 1, active: true, featured: false },
  { name: "Women's Luxury",   slug: 'womens-luxury-watches', parentSlug: 'luxury-watches', sortOrder: 2, active: true, featured: false },
];

async function main() {
  for (const sub of SUBCATEGORIES) {
    const parent = await prisma.category.findUnique({ where: { slug: sub.parentSlug } });
    if (!parent) {
      console.warn(`Parent not found for slug "${sub.parentSlug}" — skipping ${sub.name}`);
      continue;
    }

    const { parentSlug, ...data } = sub;
    await prisma.category.upsert({
      where: { slug: data.slug },
      update: { ...data, parentId: parent.id },
      create: { ...data, parentId: parent.id },
    });
    console.log(`  ✓ ${parent.name} → ${sub.name}`);
  }
  console.log('\nSubcategory seed complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
