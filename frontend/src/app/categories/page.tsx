import type { Metadata } from 'next';
import CategoriesClient, { CategoryItem } from './CategoriesClient';

// Backend lives on Render; a Server Component must call it with an absolute URL.
const BACKEND = process.env.BACKEND_URL || 'https://urbanex-store.onrender.com';

// ISR — refresh every 5 minutes.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'All Categories — Shop By Category | UrbanEx',
  description:
    'Browse every UrbanEx category — sneakers, luxury watches, designer eyewear, handbags, streetwear and premium editions. Verified quality, fast pan-India shipping.',
  alternates: { canonical: '/categories' },
  openGraph: {
    title: 'All Categories | UrbanEx',
    description: 'Explore the full UrbanEx lineup — pick your lane.',
    url: '/categories',
  },
};

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default async function CategoriesPage() {
  const data = await getJson<CategoryItem[]>('/api/categories');
  const categories = Array.isArray(data) ? data : [];
  return <CategoriesClient categories={categories} />;
}
