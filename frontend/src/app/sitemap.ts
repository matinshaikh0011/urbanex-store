import type { MetadataRoute } from 'next';
import { SITE_URL, API_BASE } from '@/lib/site';

// Revalidate the sitemap hourly so new products appear without a redeploy.
export const revalidate = 3600;

const CATEGORY_SLUGS = ['sneakers', 'watches', 'glasses', 'handbags', 'clothing', 'ua-batch'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Static / high-value routes ──
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/brands`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/return-exchange`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/track-order`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // ── Category landing pages ──
  const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_SLUGS.map(slug => ({
    url: `${SITE_URL}/products?category=${slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // ── Product detail pages (from the backend) ──
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_BASE}/api/products`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const products = await res.json();
      if (Array.isArray(products)) {
        productRoutes = products
          .filter((p: { slug?: string }) => p.slug)
          .map((p: { slug: string }) => ({
            url: `${SITE_URL}/products/${p.slug}`,
            lastModified: now,
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          }));
      }
    }
  } catch {
    // If the backend is unreachable, still return the static + category routes.
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
