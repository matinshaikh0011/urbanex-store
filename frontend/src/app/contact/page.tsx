import type { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact Us — WhatsApp & Email Support',
  description: 'Get in touch with UrbanEx. Chat with us on WhatsApp at +91 98982 85850 or email urbanexconnect@gmail.com. Support available 10AM–9PM, fast delivery pan-India.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact UrbanEx — WhatsApp & Email Support',
    description: 'We\'re here to help — reach out any time on WhatsApp or email.',
    url: '/contact',
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
