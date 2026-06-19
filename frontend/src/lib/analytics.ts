// ================================================================
// UrbanEx — GA4 analytics helpers (App Router friendly)
//
// All event helpers are safe to call from anywhere on the client:
// - They no-op on the server (typeof window guard).
// - They no-op when no GA measurement id is configured.
// This keeps call sites clean and avoids breaking dev/preview
// environments that don't have GA set up.
// ================================================================

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

export const gaEnabled = (): boolean =>
  typeof window !== 'undefined' &&
  !!GA_MEASUREMENT_ID &&
  typeof window.gtag === 'function';

// ---- low-level wrappers -----------------------------------------

/** Send a GA4 page_view. Called by the AnalyticsListener on each route. */
export function pageview(url: string): void {
  if (!gaEnabled()) return;
  window.gtag('event', 'page_view', {
    page_path: url,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/** Generic GA4 event. */
export function gaEvent(
  name: string,
  params: Record<string, unknown> = {}
): void {
  if (!gaEnabled()) return;
  window.gtag('event', name, params);
}

// ---- ecommerce item shape ---------------------------------------

export interface AnalyticsItem {
  item_id: string | number;
  item_name: string;
  price?: number;
  quantity?: number;
  item_brand?: string;
  item_category?: string;
  item_variant?: string; // size
}

interface ProductLike {
  id: number | string;
  name: string;
  price?: number;
  brand?: string | { name?: string } | null;
  category?: string;
  size?: string;
  quantity?: number;
}

/** Normalise our various product/cart shapes into a GA4 item. */
export function toItem(p: ProductLike): AnalyticsItem {
  const brand =
    typeof p.brand === 'string' ? p.brand : p.brand?.name || undefined;
  return {
    item_id: p.id,
    item_name: p.name,
    ...(typeof p.price === 'number' ? { price: p.price } : {}),
    quantity: p.quantity ?? 1,
    ...(brand ? { item_brand: brand } : {}),
    ...(p.category ? { item_category: p.category } : {}),
    ...(p.size ? { item_variant: p.size } : {}),
  };
}

// ---- ecommerce events (GA4 recommended schema) ------------------

export function trackViewItem(item: AnalyticsItem): void {
  gaEvent('view_item', {
    currency: 'INR',
    value: item.price ?? 0,
    items: [item],
  });
}

export function trackAddToCart(item: AnalyticsItem): void {
  const qty = item.quantity ?? 1;
  gaEvent('add_to_cart', {
    currency: 'INR',
    value: (item.price ?? 0) * qty,
    items: [item],
  });
}

export function trackBeginCheckout(items: AnalyticsItem[], value: number): void {
  gaEvent('begin_checkout', {
    currency: 'INR',
    value,
    items,
  });
}

export function trackPurchase(
  transactionId: string,
  items: AnalyticsItem[],
  value: number
): void {
  gaEvent('purchase', {
    transaction_id: transactionId,
    currency: 'INR',
    value,
    items,
  });
}
