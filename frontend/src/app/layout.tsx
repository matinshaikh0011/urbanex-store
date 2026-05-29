import './globals.css';
import type { Metadata } from 'next';
import { CartProvider } from '@/components/ClientProviders';
import InteractiveCursor from '@/components/InteractiveCursor';

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
          <InteractiveCursor />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}