import './globals.css';
import type { Metadata } from 'next';
import { CartProvider } from '@/components/ClientProviders';
import { WishlistProvider } from '@/components/WishlistProvider';
import WhatsAppButton from '@/components/WhatsAppButton';
import { SITE_URL, SITE_NAME, SITE_TAGLINE, DEFAULT_OG_IMAGE } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'UrbanEx — India\'s premium destination for verified-original sneakers, luxury watches, glasses, handbags and streetwear. 100% authentic, fast pan-India shipping, easy 7-day returns.',
  keywords: ['streetwear India', 'premium sneakers', 'luxury watches', 'original sneakers', 'UrbanEx', 'designer handbags', 'branded glasses'],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: '100% verified-original sneakers, watches, glasses & handbags. Fast pan-India shipping.',
    url: SITE_URL,
    locale: 'en_IN',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: '100% verified-original sneakers, watches, glasses & handbags. Fast pan-India shipping.',
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/apple-icon.png',
  },
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  name: SITE_NAME,
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
  description: 'Premium streetwear, sneakers, watches, glasses and handbags — 100% verified original, shipped across India.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Surat',
    addressRegion: 'Gujarat',
    addressCountry: 'IN',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+91-9898285850',
    contactType: 'customer service',
    areaServed: 'IN',
    availableLanguage: ['en', 'hi'],
  },
  sameAs: ['https://www.instagram.com/urbanex.store/'],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/products?search={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <CartProvider>
          <WishlistProvider>
            {children}
            <WhatsAppButton />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
