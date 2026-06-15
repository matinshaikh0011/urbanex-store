import type { Metadata } from 'next';
import AuthenticityClient from './AuthenticityClient';
import { AUTHENTICITY_FAQ } from './authenticityData';

export const metadata: Metadata = {
  title: 'Authenticity — 100% Verified Original Products',
  description:
    'UrbanEx authenticity guarantee: how we source, verify and ship every product. Original packaging, GST invoice, 7-day returns and real human support.',
  alternates: { canonical: '/authenticity' },
  openGraph: {
    title: 'UrbanEx Authenticity Guarantee',
    description:
      'Premium products, verified authentic, delivered honestly. Original packaging, GST invoice, 7-day returns.',
    url: '/authenticity',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: AUTHENTICITY_FAQ.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

export default function AuthenticityPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <AuthenticityClient />
    </>
  );
}
