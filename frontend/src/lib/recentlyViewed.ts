// Recently-viewed products — stored in localStorage, max 6, auto-expire after 7 days.

export interface RecentProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  brand: string;
  ts: number; // timestamp added
}

const KEY = 'urbanex_recently_viewed';
const MAX = 6;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function getRecentlyViewed(excludeSlug?: string): RecentProduct[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const now = Date.now();
    let list: RecentProduct[] = JSON.parse(raw);
    // drop entries older than 7 days
    list = list.filter(p => now - p.ts < SEVEN_DAYS);
    localStorage.setItem(KEY, JSON.stringify(list));
    return excludeSlug ? list.filter(p => p.slug !== excludeSlug) : list;
  } catch {
    return [];
  }
}

export function addRecentlyViewed(product: Omit<RecentProduct, 'ts'>) {
  if (typeof window === 'undefined') return;
  try {
    const now = Date.now();
    const raw = localStorage.getItem(KEY);
    let list: RecentProduct[] = raw ? JSON.parse(raw) : [];
    list = list.filter(p => p.slug !== product.slug && now - p.ts < SEVEN_DAYS);
    list.unshift({ ...product, ts: now });
    list = list.slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
