'use client';

import Link from 'next/link';
import ProductCard from './ProductCard';
import styles from './FeaturedRow.module.css';

interface FeaturedRowProps {
  icon: string;
  title: string;
  href: string;
  products: any[];
}

export default function FeaturedRow({ icon, title, href, products }: FeaturedRowProps) {
  if (!products || products.length === 0) return null;

  return (
    <div className={styles.row}>
      <div className={styles.header}>
        <span className={styles.icon}>{icon}</span>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.count}>{products.length} DROPS</span>
        <Link href={href} className={styles.viewAll} data-cursor="view">VIEW ALL →</Link>
      </div>

      <div className={styles.grid}>
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </div>
  );
}
