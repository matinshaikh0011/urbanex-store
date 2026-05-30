'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRecentlyViewed, RecentProduct } from '@/lib/recentlyViewed';
import styles from './RecentlyViewed.module.css';

export default function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    setItems(getRecentlyViewed(currentSlug));
  }, [currentSlug]);

  if (items.length === 0) return null;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(price);

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>RECENTLY <span className={styles.accent}>VIEWED</span></h2>
      <div className={styles.track}>
        {items.map(item => (
          <Link key={item.id} href={`/products/${item.slug}`} className={styles.card}>
            <div className={styles.imageWrap}>
              <img src={item.image} alt={item.name} />
            </div>
            <div className={styles.info}>
              <span className={styles.brand}>{item.brand}</span>
              <span className={styles.name}>{item.name}</span>
              <span className={styles.price}>{formatPrice(item.price)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
