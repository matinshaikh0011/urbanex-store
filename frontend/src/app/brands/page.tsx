'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

interface Brand {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
}

const categories = [
  {
    name: 'SNEAKERS',
    slug: 'sneakers',
    icon: '👟',
    brands: ['nike', 'adidas', 'jordan', 'puma', 'new-balance', 'reebok', 'converse', 'vans', 'asics', 'skechers']
  },
  {
    name: 'WATCHES',
    slug: 'watches',
    icon: '⌚',
    brands: ['rolex', 'omega', 'hublot']
  },
  {
    name: 'GLASSES',
    slug: 'glasses',
    icon: '🕶️',
    brands: ['ray-ban', 'oakley', 'gucci']
  },
  {
    name: 'HANDBAGS',
    slug: 'handbags',
    icon: '👜',
    brands: ['louis-vuitton', 'gucci', 'michael-kors']
  },
  {
    name: 'CLOTHING',
    slug: 'clothing',
    icon: '👕',
    brands: ['nike', 'adidas']
  }
];

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/brands')
      .then(res => res.json())
      .then(data => {
        setBrands(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredBrands = selectedCategory
    ? brands.filter(b => categories.find(c => c.slug === selectedCategory)?.brands.includes(b.slug))
    : brands;

  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>SHOP BY <span className={styles.accent}>BRAND</span></h1>
        <p className={styles.subtitle}>Browse all our premium brands</p>
      </div>

      <div className={styles.container}>
        <div className={styles.categoryTabs}>
          <button
            className={`${styles.categoryTab} ${!selectedCategory ? styles.active : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            ALL
          </button>
          {categories.map(cat => (
            <button
              key={cat.slug}
              className={`${styles.categoryTab} ${selectedCategory === cat.slug ? styles.active : ''}`}
              onClick={() => setSelectedCategory(cat.slug)}
            >
              <span>{cat.icon}</span> {cat.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.loading}>Loading brands...</div>
        ) : (
          <>
            {selectedCategory && (
              <div className={styles.categoryInfo}>
                <h2>{categories.find(c => c.slug === selectedCategory)?.icon} {selectedCategory.toUpperCase()}</h2>
                <p>Select a brand to browse products</p>
              </div>
            )}

            <div className={styles.brandGrid}>
              {filteredBrands.map((brand, idx) => (
                <Link
                  key={brand.id}
                  href={`/products?brand=${brand.slug}`}
                  className={styles.brandCard}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className={styles.logoWrapper}>
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt={brand.name} className={styles.logo} />
                    ) : (
                      <span className={styles.logoText}>{brand.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className={styles.brandName}>{brand.name}</span>
                  <div className={styles.hoverEffect}>
                    <span>VIEW PRODUCTS</span>
                  </div>
                </Link>
              ))}
            </div>

            {!selectedCategory && (
              <div className={styles.categorySections}>
                {categories.map(category => {
                  const categoryBrands = brands.filter(b => category.brands.includes(b.slug));
                  if (categoryBrands.length === 0) return null;
                  return (
                    <div key={category.slug} className={styles.categorySection}>
                      <div className={styles.sectionHeader}>
                        <span className={styles.sectionIcon}>{category.icon}</span>
                        <h2>{category.name}</h2>
                        <Link href={`/products?category=${category.slug}`} className={styles.viewAll}>
                          View All →
                        </Link>
                      </div>
                      <div className={styles.sectionBrands}>
                        {categoryBrands.map(brand => (
                          <Link
                            key={brand.id}
                            href={`/products?brand=${brand.slug}&category=${category.slug}`}
                            className={styles.sectionBrand}
                          >
                            <span className={styles.brandInitial}>{brand.name.charAt(0)}</span>
                            <span>{brand.name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}