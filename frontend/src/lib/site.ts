// ================================================================
// Central site + API config for SEO (metadata, sitemap, JSON-LD)
// ================================================================

// Public canonical origin of the storefront (no trailing slash).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://www.shopurbanex.com';

// Backend API origin. Browser requests use the /api rewrite, but Server
// Components / sitemap run on the server and must call the backend directly.
export const API_BASE = (process.env.BACKEND_API_URL || 'https://urbanex-store.onrender.com').replace(/\/$/, '');

export const SITE_NAME = 'UrbanEx';
export const SITE_TAGLINE = 'Premium Streetwear, Sneakers, Watches, Glasses & Handbags';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/urbanex-logo.png`;

// Build a fully-qualified canonical URL from a path.
export function canonical(path = '/') {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${clean}`;
}
