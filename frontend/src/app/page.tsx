import type { Metadata } from 'next';
import HomeClient, { HomeFeatured } from './HomeClient';

// Backend lives on Render; /api/* rewrites there for the browser, but a Server
// Component must call it with an absolute URL.
const BACKEND = process.env.BACKEND_URL || 'https://urbanex-store.onrender.com';

// Revalidate the homepage data every 5 minutes (ISR) — fast TTFB, fresh enough.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'UrbanEx — Premium Sneakers, Watches, Eyewear, Handbags & Clothing',
  description:
    'Shop verified-original sneakers, luxury watches, designer eyewear, handbags and streetwear at UrbanEx. Fast pan-India shipping, COD, and easy 7-day returns.',
  alternates: { canonical: '/' },
};

interface Product { id: number; category: string; isFeatured?: boolean; [k: string]: unknown }

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function featuredFor(products: Product[], category: string): Product[] {
  return products.filter((p) => p.category === category && p.isFeatured).slice(0, 16);
}

export default async function Home() {
  const [brandsData, productsData, categoriesData] = await Promise.all([
    getJson<unknown[]>('/api/brands?featured=true'),
    getJson<unknown[]>('/api/products'),
    getJson<unknown[]>('/api/categories'),
  ]);

  const products = Array.isArray(productsData) ? (productsData as Product[]) : [];
  const brands = Array.isArray(brandsData) ? brandsData : [];
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const featured: HomeFeatured = {
    sneakers: featuredFor(products, 'sneakers'),
    watches: featuredFor(products, 'watches'),
    glasses: featuredFor(products, 'glasses'),
    handbags: featuredFor(products, 'handbags'),
    clothing: featuredFor(products, 'clothing'),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <HomeClient brands={brands as any} categories={categories as any} featured={featured} />;
}
