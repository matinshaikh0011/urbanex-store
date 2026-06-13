import type { Metadata } from 'next';
import { API_BASE, SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/site';
import ProductDetailClient from './ProductDetailClient';

interface ProductSEO {
  id: number;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number | null;
  images: string[];
  description?: string | null;
  category?: string | null;
  inStock?: boolean;
  brand?: { name: string; slug: string } | null;
}

async function getProduct(slug: string): Promise<ProductSEO | null> {
  try {
    const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(slug)}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.id ? data : null;
  } catch {
    return null;
  }
}

// Clean up scraped/underscore names into readable text for titles & descriptions.
function readable(name: string) {
  return name.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) {
    return { title: 'Product Not Found', robots: { index: false, follow: true } };
  }

  const name = readable(product.name);
  const brand = product.brand?.name ? `${product.brand.name} ` : '';
  const title = `${brand}${name}`.slice(0, 70);
  const priceText = product.price ? ` Buy at ₹${Number(product.price).toLocaleString('en-IN')}.` : '';
  const description = (product.description && product.description.length > 40
    ? readable(product.description)
    : `Shop ${brand}${name} at UrbanEx.${priceText} 100% verified original, fast pan-India shipping and easy 7-day returns.`
  ).slice(0, 160);

  const image = product.images?.[0] || DEFAULT_OG_IMAGE;
  const url = `${SITE_URL}/products/${product.slug}`;

  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: 'website',
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      images: [{ url: image, alt: name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [image],
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);

  // Product + Breadcrumb structured data (only when the product resolves server-side)
  let jsonLd: string | null = null;
  if (product) {
    const name = readable(product.name);
    const url = `${SITE_URL}/products/${product.slug}`;
    const productSchema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      image: product.images?.length ? product.images : [DEFAULT_OG_IMAGE],
      description: product.description ? readable(product.description) : `${name} — 100% verified original at UrbanEx.`,
      sku: String(product.id),
      ...(product.brand?.name ? { brand: { '@type': 'Brand', name: product.brand.name } } : {}),
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: 'INR',
        price: Number(product.price || 0),
        availability: product.inStock === false
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: SITE_NAME },
      },
    };
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/products` },
        ...(product.category ? [{ '@type': 'ListItem', position: 3, name: product.category, item: `${SITE_URL}/products?category=${product.category}` }] : []),
        { '@type': 'ListItem', position: product.category ? 4 : 3, name, item: url },
      ],
    };
    jsonLd = JSON.stringify([productSchema, breadcrumbSchema]);
  }

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />}
      <ProductDetailClient params={params} />
    </>
  );
}
