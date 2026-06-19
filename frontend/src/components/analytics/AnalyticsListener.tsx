'use client';

import { useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { pageview, GA_MEASUREMENT_ID } from '@/lib/analytics';

/**
 * Fires a GA4 page_view on the initial load and on every client-side
 * route change (App Router doesn't emit page views by itself).
 *
 * De-duplication: we remember the last URL we reported in a ref and skip
 * if it's unchanged. React 18 / dev StrictMode can run effects twice on
 * mount; the ref guard makes the page_view fire exactly once per URL.
 */
function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    const qs = searchParams?.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (!url || url === lastUrl.current) return;
    lastUrl.current = url;
    pageview(url);
  }, [pathname, searchParams]);

  return null;
}

/**
 * useSearchParams() must be wrapped in <Suspense> in the App Router,
 * otherwise it opts the whole tree into client-side rendering.
 */
export default function AnalyticsListener() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
