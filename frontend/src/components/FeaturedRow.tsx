'use client';

import Link from 'next/link';
import ShowcaseCard from './ShowcaseCard';
import styles from './FeaturedRow.module.css';

interface FeaturedRowProps {
  icon: string;
  title: string;
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products: any[];
  // Slab tone the row sits on — drives the showcase card's light/dark palette.
  tone?: 'light' | 'dark';
}

export default function FeaturedRow({ icon, title, href, products, tone = 'light' }: FeaturedRowProps) {
  if (!products || products.length === 0) return null;

  return (
    <div className={`${styles.row} ${tone === 'dark' ? 'sc-tone-dark' : ''}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.count}>{products.length} Drops</span>
      </div>

      <div className={styles.grid}>
        {products.map((product, i) => (
          <ShowcaseCard key={product.id} product={product} index={i} variant="float" tone={tone} />
        ))}
      </div>

      <div className={styles.footer}>
        <Link href={href} className={styles.viewAll} data-cursor="view">View All {title} →</Link>
      </div>
    </div>
  );
}
