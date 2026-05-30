import './globals.css';
import type { Metadata } from 'next';
import { CartProvider } from '@/components/ClientProviders';
import { WishlistProvider } from '@/components/WishlistProvider';
import InteractiveCursor from '@/components/InteractiveCursor';
import AnnouncementBar from '@/components/AnnouncementBar';
import WhatsAppButton from '@/components/WhatsAppButton';

export const metadata: Metadata = {
  title: 'UrbanEx | Premium Streetwear & Sneakers',
  description: '100% Premium Streetwear - Nike, Adidas, Jordan, and more',
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
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
