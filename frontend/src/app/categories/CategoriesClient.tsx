'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import ScrollReveal from '@/components/ScrollReveal';
import styles from './page.module.css';

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  active?: boolean;
  featured?: boolean;
  productCount?: number;
  parentId?: number | null;
}

// Subcategory chips shown under matching parent categories
const SUBCATS: Record<string, string[]> = {
  watches: ["Men's", "Women's"],
  glasses: ["Men's", "Women's"],
  clothing: ['Track Pants', 'Jeans', 'Shirts', 'T-Shirts', 'Denims'],
};

// Fallback set used when the backend returns no categories
const FALLBACK: CategoryItem[] = [
  { id: 1, name: 'Sneakers', slug: 'sneakers', image: 'https://images.unsplash.com/photo-1552346154-21d32810baa3?w=800&q=80' },
  { id: 2, name: 'Watches', slug: 'watches', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80' },
  { id: 3, name: 'Glasses', slug: 'glasses', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80' },
  { id: 4, name: 'Handbags', slug: 'handbags', image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=800&q=80' },
  { id: 5, name: 'Clothing', slug: 'clothing', image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80' },
  { id: 6, name: 'Premium Edition', slug: 'ua-batch', image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80' },
];

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1552346154-21d32810baa3?w=800&q=80';

function hrefFor(slug: string) {
  // Premium Edition has its own dedicated route
  if (slug === 'ua-batch') return '/ua-batch';
  return `/products?category=${slug}`;
}

export default function CategoriesClient({ categories }: { categories: CategoryItem[] }) {
  // Only top-level, active categories — sorted featured-first
  const list = (categories && categories.length > 0 ? categories : FALLBACK)
    .filter(c => c.active !== false && !c.parentId)
    .sort((a, b) => Number(b.featured) - Number(a.featured));

  const totalProducts = list.reduce((sum, c) => sum + (c.productCount || 0), 0);

  return (
    <>
      <Header />
      <GlobalPopup />

      <main className={styles.main}>
        {/* ── HERO HEADER ─────────────────────────────── */}
        <section className={styles.hero}>
          <div className={styles.heroGrain} aria-hidden />
          <div className={styles.heroInner}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link href="/">HOME</Link>
              <span aria-hidden>/</span>
              <span className={styles.crumbCurrent}>CATEGORIES</span>
            </nav>
            <span className={styles.heroEyebrow}>THE FULL LINEUP</span>
            <h1 className={styles.heroTitle}>
              ALL <span className={styles.accent}>CATEGORIES</span>
            </h1>
            <p className={styles.heroSub}>— every lane, one wall —</p>
            <div className={styles.heroMeta}>
              <span><strong>{list.length}</strong> Categories</span>
              <span className={styles.metaDivider} aria-hidden />
              <span><strong>{totalProducts > 0 ? totalProducts : '1000+'}</strong> Products</span>
              <span className={styles.metaDivider} aria-hidden />
              <span><strong>100%</strong> Verified</span>
            </div>
          </div>
        </section>

        <div className={styles.crackDivider} aria-hidden />

        {/* ── CATEGORY GRID ───────────────────────────── */}
        <section className={styles.gridSlab}>
          <div className={styles.slabGrain} aria-hidden />
          <div className={styles.gridWrap}>
            <ScrollReveal animation="slideUp" duration={700}>
              <div className={styles.catGrid}>
                {list.map((cat, i) => {
                  const subs = SUBCATS[cat.slug];
                  return (
                    <Link
                      key={cat.id}
                      href={hrefFor(cat.slug)}
                      className={styles.catCard}
                      data-cursor="view"
                      style={{ ['--i' as string]: i }}
                    >
                      <span className={styles.cardIndex}>{String(i + 1).padStart(2, '0')}</span>
                      <div className={styles.catImgWrap}>
                        <img src={cat.image || FALLBACK_IMG} alt={cat.name} loading="lazy" />
                      </div>
                      <div className={styles.catOverlay}>
                        <div className={styles.catTop}>
                          {typeof cat.productCount === 'number' && cat.productCount > 0 && (
                            <span className={styles.countPill}>{cat.productCount} items</span>
                          )}
                        </div>
                        <div className={styles.catBottom}>
                          <h2 className={styles.catName}>{cat.name.toUpperCase()}</h2>
                          {cat.description && <p className={styles.catDesc}>{cat.description}</p>}
                          {subs && (
                            <div className={styles.subChips}>
                              {subs.map(s => <span key={s} className={styles.subChip}>{s}</span>)}
                            </div>
                          )}
                          <span className={styles.exploreLine}>
                            EXPLORE <span className={styles.exploreArrow} aria-hidden>→</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </ScrollReveal>
          </div>
        </section>

        <div className={styles.crackDivider} aria-hidden />

        {/* ── CTA STRIP ───────────────────────────────── */}
        <section className={styles.ctaSlab}>
          <div className={styles.slabGrain} aria-hidden />
          <div className={styles.ctaInner}>
            <h2 className={styles.ctaTitle}>CAN&apos;T DECIDE?</h2>
            <p className={styles.ctaSub}>Browse the entire catalogue in one place.</p>
            <Link href="/products" className={styles.ctaBtn} data-cursor="view">
              SHOP ALL PRODUCTS <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────── */}
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <span className={styles.footerLogo}>URBAN<span className={styles.accent}>EX</span></span>
            <p className={styles.footerTag}>100% Premium · Verified Original · Pan-India Shipping</p>
            <div className={styles.footerLinks}>
              <Link href="/products">All Products</Link>
              <Link href="/brands">Brands</Link>
              <Link href="/track-order">Track Order</Link>
              <Link href="/authenticity">Authenticity</Link>
              <Link href="/faq">FAQ</Link>
            </div>
            <p className={styles.footerCopy}>© 2026 UrbanEx. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </>
  );
}
