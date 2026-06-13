import type { Metadata } from 'next';
import FaqClient from './FaqClient';
import { FAQ_GROUPS } from './faqData';

export const metadata: Metadata = {
  title: 'FAQ — Sizing, Authenticity, Shipping & Returns',
  description: 'Answers to common questions about UrbanEx — product authenticity, sizing guides, pan-India shipping times, payment options, and our 7-day return and exchange policy.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'UrbanEx FAQ — Sizing, Authenticity, Shipping & Returns',
    description: 'Everything about sizing, authenticity, shipping, returns and payments.',
    url: '/faq',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_GROUPS.flatMap(group =>
    group.items.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    }))
  ),
};

export default function FAQPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <FaqClient />
    </>
  );
}
