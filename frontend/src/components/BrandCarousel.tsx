'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './BrandCarousel.module.css';

interface Brand {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export default function BrandCarousel({ brands }: { brands: Brand[] }) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>SHOP BY <span className={styles.accent}>BRAND</span></h2>
        <p className={styles.subtitle}>Find your favorite brands all in one place</p>
      </div>
      <div className={styles.grid}>
        {brands.map((brand, idx) => (
          <Link key={brand.id} href={`/products?brand=${brand.slug}`} className={styles.brandCard} style={{ animationDelay: `${idx * 0.05}s` }}>
            <div className={styles.logoWrapper}>
              {brand.logoUrl ? (
                <BrandLogo url={brand.logoUrl} name={brand.name} />
              ) : (
                <span className={styles.logoText}>{brand.name.charAt(0)}</span>
              )}
            </div>
            <span className={styles.brandName}>{brand.name}</span>
            <div className={styles.hoverEffect}></div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function BrandLogo({ url, name }: { url: string; name: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return <span className={styles.logoText}>{name.charAt(0)}</span>;
  }

  // Use the official logo URL from the database, but style it to fit the layout.
  // We apply a premium grayscale look by default that shifts to full color on hover.
  return (
    <img
      src={url}
      alt={name}
      className={styles.logo}
      onError={() => setError(true)}
    />
  );
}