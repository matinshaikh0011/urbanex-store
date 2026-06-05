import './globals.css';
import type { Metadata } from 'next';
import { CartProvider } from '@/components/ClientProviders';
import { WishlistProvider } from '@/components/WishlistProvider';
import InteractiveCursor from '@/components/InteractiveCursor';
import AnnouncementBar from '@/components/AnnouncementBar';
import WhatsAppButton from '@/components/WhatsAppButton';
import SocialProof from '@/components/SocialProof';

export const metadata: Metadata = {
  title: 'UrbanEx | Premium Streetwear & Sneakers',
  description: '100% Premium Streetwear - Nike, Adidas, Jordan, and more',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/apple-icon.png',
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
        <CartProvider>
          <WishlistProvider>
            <InteractiveCursor />
            <AnnouncementBar />
            {children}
            <WhatsAppButton />
            <SocialProof />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
