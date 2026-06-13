import type { Metadata } from 'next';
import ProductsClient from './ProductsClient';

const CATEGORY_META: Record<string, { title: string; description: string }> = {
  sneakers: { title: 'Sneakers — Air Jordan, Nike, Adidas & More', description: 'Shop premium verified-original sneakers at UrbanEx — Air Jordan, Nike, Adidas, Yeezy and more. Fast pan-India shipping, easy 7-day returns.' },
  watches: { title: 'Luxury Watches — Rolex, Omega & More', description: 'Premium luxury watches at UrbanEx — Rolex, Omega, Hublot, Cartier and more. Verified quality, fast pan-India shipping.' },
  'luxury-watches': { title: 'Luxury Watches — Rolex, Omega & More', description: 'Premium luxury watches at UrbanEx — verified quality, fast pan-India shipping.' },
  glasses: { title: 'Designer Glasses & Sunglasses', description: 'Premium designer glasses and sunglasses at UrbanEx — Ray-Ban, Oakley, Gucci, Prada. Fast pan-India shipping.' },
  handbags: { title: 'Designer Handbags & Luxury Bags', description: 'Premium designer handbags at UrbanEx — Louis Vuitton, Gucci, Prada and more. Verified quality, fast shipping.' },
  clothing: { title: 'Premium Streetwear Clothing', description: 'Premium streetwear clothing at UrbanEx — track pants, jeans, shirts, t-shirts and denims. Fast pan-India shipping.' },
  'ua-batch': { title: 'UA Batch Sneakers — Premium Quality', description: 'Premium UA-batch sneakers at UrbanEx — top-tier quality replicas, clearly labelled. Fast pan-India shipping.' },
};

export function generateMetadata({ searchParams }: { searchParams: { category?: string; search?: string } }): Metadata {
  const category = searchParams?.category;
  const search = searchParams?.search;

  if (search) {
    return {
      title: `Search: ${search}`,
      description: `Search results for "${search}" at UrbanEx.`,
      robots: { index: false, follow: true },
    };
  }
  if (category && CATEGORY_META[category]) {
    const m = CATEGORY_META[category];
    return {
      title: m.title,
      description: m.description,
      alternates: { canonical: `/products?category=${category}` },
      openGraph: { title: `${m.title} | UrbanEx`, description: m.description, url: `/products?category=${category}` },
    };
  }
  return {
    title: 'All Products — Premium Watches, Eyewear & Handbags',
    description: 'Browse the full UrbanEx collection — premium watches, sunglasses, handbags and fashion accessories. Verified quality, fast pan-India delivery.',
    alternates: { canonical: '/products' },
    openGraph: { title: 'All Products | UrbanEx', description: 'Browse all premium fashion accessories — verified quality.', url: '/products' },
  };
}

export default function ProductsPage() {
  return <ProductsClient />;
}
