import type { Metadata } from 'next';
import ReturnClient from './ReturnClient';

export const metadata: Metadata = {
  title: 'Return & Exchange Policy — 7-Day Easy Returns',
  description: 'UrbanEx offers easy returns and exchanges within 7 days of delivery. Items must be unused with original packaging and tags. Refunds processed within 5–7 business days.',
  alternates: { canonical: '/return-exchange' },
  openGraph: {
    title: 'UrbanEx Return & Exchange — 7-Day Easy Returns',
    description: 'Easy returns and exchanges within 7 days of delivery.',
    url: '/return-exchange',
  },
};

export default function ReturnExchangePage() {
  return <ReturnClient />;
}
