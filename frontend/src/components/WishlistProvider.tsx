'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface WishlistItem {
  id: number;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  brand: string;
  category?: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  toggle: (item: WishlistItem) => void;
  remove: (id: number) => void;
  has: (id: number) => boolean;
  count: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const STORAGE_KEY = 'urbanex_wishlist';

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, mounted]);

  const toggle = (item: WishlistItem) => {
    setItems(prev =>
      prev.some(i => i.id === item.id)
        ? prev.filter(i => i.id !== item.id)
        : [item, ...prev]
    );
  };

  const remove = (id: number) => setItems(prev => prev.filter(i => i.id !== id));
  const has = (id: number) => items.some(i => i.id === id);

  return (
    <WishlistContext.Provider value={{ items, toggle, remove, has, count: items.length }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    // Safe fallback so components don't crash if used outside provider
    return {
      items: [] as WishlistItem[],
      toggle: () => {},
      remove: () => {},
      has: () => false,
      count: 0,
    } as WishlistContextType;
  }
  return context;
}
