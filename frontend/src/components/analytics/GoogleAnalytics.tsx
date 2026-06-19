'use client';

import Script from 'next/script';
import { GA_MEASUREMENT_ID } from '@/lib/analytics';

/**
 * Loads the GA4 gtag.js library exactly once via next/script.
 *
 * - strategy="afterInteractive": injected after hydration, so it never
 *   blocks first paint and never runs on the server.
 * - We disable gtag's own automatic page_view (send_page_view: false) and
 *   fire page_view ourselves from AnalyticsListener on every route change.
 *   This is the App Router pattern: gtag.js cannot see client-side
 *   navigations, so automatic page views would miss them and the initial
 *   one would double up with our manual call.
 *
 * Renders nothing (and no scripts) when no measurement id is set, so dev
 * and preview environments stay clean.
 */
export default function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        id="ga4-lib"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
