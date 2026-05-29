'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import BrandCarousel from '@/components/BrandCarousel';
import ProductCard from '@/components/ProductCard';
import ScrollReveal from '@/components/ScrollReveal';
import HeroBanner from '@/components/HeroBanner';
import styles from './page.module.css';

// ——————————————————————————————————————
// GLITCH TEXT — premium cyberpunk letter reveal with glitch accents
// ——————————————————————————————————————
function GlitchText({ text, className }: { text: string; className?: string }) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const letters = text.split('');
    letters.forEach((_, i) => {
      setTimeout(() => setRevealed(i + 1), i * 70 + 400);
    });
  }, [text]);

  return (
    <span className={`${styles.glitchText} ${className || ''}`} data-text={text}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className={styles.glitchLetter}
          style={{
            display: 'inline-block',
            opacity: i < revealed ? 1 : 0,
            transform: i < revealed ? 'translateY(0) skewX(0deg)' : 'translateY(24px) skewX(-8deg)',
            transition: 'opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)',
            transitionDelay: `${i * 0.05}s`,
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}

// ——————————————————————————————————————
// INFO SLIDER — auto-playing feature highlights
// ——————————————————————————————————————
const infoSlides = [
  { icon: '✅', stat: '100%', title: 'ORIGINAL PRODUCTS', sub: 'Every item is verified authentic before shipping', color: '#CC0000' },
  { icon: '🚚', stat: '2-5 Days', title: 'FAST DELIVERY', sub: 'Pan-India shipping on all orders above ₹499', color: '#1a1a1a' },
  { icon: '💬', stat: '24/7', title: 'WHATSAPP SUPPORT', sub: 'Chat with us anytime for instant help', color: '#25D366' },
  { icon: '↩️', stat: '7 Days', title: 'EASY RETURNS', sub: 'Hassle-free returns & exchange policy', color: '#F5C400' },
  { icon: '🔒', stat: 'Secure', title: 'SAFE PAYMENTS', sub: 'UPI / GPay / PhonePe — 100% secure', color: '#CC0000' },
  { icon: '🏆', stat: '10K+', title: 'HAPPY CUSTOMERS', sub: 'Join thousands of satisfied streetwear fans', color: '#1a1a1a' },
];

function InfoSlider() {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef(0);
  const isDragging = useRef(false);

  const goTo = (i: number) => {
    setActive((i + infoSlides.length) % infoSlides.length);
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setActive(p => (p + 1) % infoSlides.length), 4000);
  };

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const onDragStart = (x: number) => { isDragging.current = true; dragStart.current = x; };
  const onDragEnd = (x: number) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diff = dragStart.current - x;
    if (Math.abs(diff) > 40) { goTo(active + (diff > 0 ? 1 : -1)); resetTimer(); }
  };

  return (
    <section className={styles.infoSlider}>
      <div
        ref={trackRef}
        className={styles.infoTrack}
        onMouseDown={e => onDragStart(e.clientX)}
        onMouseUp={e => onDragEnd(e.clientX)}
        onTouchStart={e => onDragStart(e.touches[0].clientX)}
        onTouchEnd={e => onDragEnd(e.changedTouches[0].clientX)}
      >
        {infoSlides.map((slide, i) => (
          <div
            key={i}
            className={`${styles.infoSlide} ${i === active ? styles.infoSlideActive : ''} ${i === (active + 1) % infoSlides.length ? styles.infoSlideNext : ''} ${i === (active - 1 + infoSlides.length) % infoSlides.length ? styles.infoSlidePrev : ''}`}
            onClick={() => { if (i !== active) { goTo(i); resetTimer(); } }}
            style={{ '--slide-color': slide.color } as React.CSSProperties}
          >
            <div className={styles.infoIcon}>{slide.icon}</div>
            <div className={styles.infoStat}>{slide.stat}</div>
            <div className={styles.infoTitle}>{slide.title}</div>
            <div className={styles.infoSub}>{slide.sub}</div>
          </div>
        ))}
      </div>
      {/* Dot nav */}
      <div className={styles.infoDots}>
        {infoSlides.map((_, i) => (
          <button
            key={i}
            className={`${styles.infoDot} ${i === active ? styles.infoDotActive : ''}`}
            onClick={() => { goTo(i); resetTimer(); }}
          />
        ))}
      </div>
    </section>
  );
}

// Counter Animation Component
function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const duration = 2000;
    const steps = 60;
    const increment = end / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [hasStarted, end]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function Home() {
  const [brands, setBrands] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/brands').then(res => res.json()),
      fetch('/api/products').then(res => res.json())
    ])
    .then(([brandsData, productsData]) => {
      setBrands(brandsData);
      setAllProducts(productsData);
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  // Get featured products by category
  const featuredSneakers = allProducts.filter((p: any) => p.category === 'sneakers' && p.isFeatured).slice(0, 4);
  const featuredWatches = allProducts.filter((p: any) => p.category === 'watches' && p.isFeatured).slice(0, 4);
  const featuredGlasses = allProducts.filter((p: any) => p.category === 'glasses' && p.isFeatured).slice(0, 4);
  const featuredHandbags = allProducts.filter((p: any) => p.category === 'handbags' && p.isFeatured).slice(0, 4);

  // Pick a hero featured product (rotate through categories)
  const heroProduct = allProducts.find((p: any) => p.isFeatured && p.category === 'sneakers') || allProducts[0];

  if (loading) {
    return (
      <>
        <GlobalPopup />
        <Header />
        <main className={styles.main}>
          <div className={styles.loading}>Loading...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <GlobalPopup />
      <Header />
      <main className={styles.main}>
        {/* ═══════════════════════════════════════════════
            HERO BANNER — Neobrutalist WebGL Editorial Drop
            ═══════════════════════════════════════════════ */}
        <HeroBanner />

        {/* Marquee Tape Strip */}
        <div className={styles.marqueeSection}>
          <div className={styles.marqueeTrack}>
            {['SNEAKERS', 'WATCHES', 'GLASSES', 'HANDBAGS', 'CLOTHING', 'UA BATCH', 'PREMIUM DROPS', 'FRESH KICKS', 'SNEAKERS', 'WATCHES', 'GLASSES', 'HANDBAGS', 'CLOTHING', 'UA BATCH', 'PREMIUM DROPS', 'FRESH KICKS'].map((item, i) => (
              <span key={i} className={styles.marqueeItem}>
                {item}<span>✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* ===== INFO SLIDER ===== */}
        <InfoSlider />

        {/* Quick Categories - Now Links to Products Page with Category Filter */}
        <ScrollReveal animation="fadeIn" duration={1000}>
          <section className={styles.quickCategories}>
            <Link href="/products?category=sneakers" className={styles.quickCat} data-cursor="view">
              <span>👟</span>
              <span>SNEAKERS</span>
            </Link>
            <Link href="/products?category=watches" className={styles.quickCat} data-cursor="view">
              <span>⌚</span>
              <span>WATCHES</span>
            </Link>
            <Link href="/products?category=glasses" className={styles.quickCat} data-cursor="view">
              <span>🕶️</span>
              <span>GLASSES</span>
            </Link>
            <Link href="/products?category=handbags" className={styles.quickCat} data-cursor="view">
              <span>👜</span>
              <span>HANDBAGS</span>
            </Link>
            <Link href="/products?category=clothing" className={styles.quickCat} data-cursor="view">
              <span>👕</span>
              <span>CLOTHING</span>
            </Link>
            <Link href="/products?category=ua-batch" className={styles.quickCat} data-cursor="view">
              <span>🔥</span>
              <span>UA BATCH</span>
            </Link>
          </section>
        </ScrollReveal>

        <ScrollReveal animation="fadeIn" delay={100}>
          <BrandCarousel brands={brands} />
        </ScrollReveal>

        {/* Featured Drops - Subdivided by Category */}
        <section className={styles.featured}>
          <ScrollReveal animation="slideUp">
            <div className={styles.featuredHeader}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.titleAccent}>FEATURED</span> DROPS
              </h2>
              <p className={styles.sectionSubtitle}>Handpicked selection of the hottest releases</p>
            </div>
          </ScrollReveal>

          {/* Sneakers Section */}
          {featuredSneakers.length > 0 && (
            <div className={styles.categorySection}>
              <ScrollReveal animation="fadeIn">
                <div className={styles.categoryHeader}>
                  <span className={styles.categoryIcon}>👟</span>
                  <h3>SNEAKERS</h3>
                  <Link href="/products?category=sneakers" className={styles.viewAllLink} data-cursor="view">View All →</Link>
                </div>
              </ScrollReveal>
              <div className={styles.productsGrid}>
                {featuredSneakers.map((product: any, idx: number) => (
                  <ScrollReveal key={product.id} animation="scaleIn" delay={idx * 100} duration={600}>
                    <ProductCard product={product} />
                  </ScrollReveal>
                ))}
              </div>
            </div>
          )}

          {/* Watches Section */}
          {featuredWatches.length > 0 && (
            <div className={styles.categorySection}>
              <ScrollReveal animation="fadeIn">
                <div className={styles.categoryHeader}>
                  <span className={styles.categoryIcon}>⌚</span>
                  <h3>WATCHES</h3>
                  <Link href="/products?category=watches" className={styles.viewAllLink} data-cursor="view">View All →</Link>
                </div>
              </ScrollReveal>
              <div className={styles.productsGrid}>
                {featuredWatches.map((product: any, idx: number) => (
                  <ScrollReveal key={product.id} animation="scaleIn" delay={idx * 100} duration={600}>
                    <ProductCard product={product} />
                  </ScrollReveal>
                ))}
              </div>
            </div>
          )}

          {/* Glasses Section */}
          {featuredGlasses.length > 0 && (
            <div className={styles.categorySection}>
              <ScrollReveal animation="fadeIn">
                <div className={styles.categoryHeader}>
                  <span className={styles.categoryIcon}>🕶️</span>
                  <h3>GLASSES</h3>
                  <Link href="/products?category=glasses" className={styles.viewAllLink} data-cursor="view">View All →</Link>
                </div>
              </ScrollReveal>
              <div className={styles.productsGrid}>
                {featuredGlasses.map((product: any, idx: number) => (
                  <ScrollReveal key={product.id} animation="scaleIn" delay={idx * 100} duration={600}>
                    <ProductCard product={product} />
                  </ScrollReveal>
                ))}
              </div>
            </div>
          )}

          {/* Handbags Section */}
          {featuredHandbags.length > 0 && (
            <div className={styles.categorySection}>
              <ScrollReveal animation="fadeIn">
                <div className={styles.categoryHeader}>
                  <span className={styles.categoryIcon}>👜</span>
                  <h3>HANDBAGS</h3>
                  <Link href="/products?category=handbags" className={styles.viewAllLink} data-cursor="view">View All →</Link>
                </div>
              </ScrollReveal>
              <div className={styles.productsGrid}>
                {featuredHandbags.map((product: any, idx: number) => (
                  <ScrollReveal key={product.id} animation="scaleIn" delay={idx * 100} duration={600}>
                    <ProductCard product={product} />
                  </ScrollReveal>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className={styles.benefits}>
          <ScrollReveal animation="slideUp" delay={100} duration={600}>
            <div className={styles.benefit}>
              <span className={styles.benefitIcon}>✓</span>
              <div><strong>100% Premium</strong><p>Every product is verified original</p></div>
            </div>
          </ScrollReveal>
          <ScrollReveal animation="slideUp" delay={200} duration={600}>
            <div className={styles.benefit}>
              <span className={styles.benefitIcon}>✓</span>
              <div><strong>Fast Shipping</strong><p>Delivery within 3-5 days</p></div>
            </div>
          </ScrollReveal>
          <ScrollReveal animation="slideUp" delay={300} duration={600}>
            <div className={styles.benefit}>
              <span className={styles.benefitIcon}>✓</span>
              <div><strong>Easy Returns</strong><p>7-day return policy</p></div>
            </div>
          </ScrollReveal>
          <ScrollReveal animation="slideUp" delay={400} duration={600}>
            <div className={styles.benefit}>
              <span className={styles.benefitIcon}>✓</span>
              <div><strong>WhatsApp Support</strong><p>Instant assistance</p></div>
            </div>
          </ScrollReveal>
        </section>

        <section className={styles.cta}>
          <ScrollReveal animation="scaleIn">
            <div className={styles.ctaContent}>
              <h2 className={styles.ctaTitle}>READY TO <span className={styles.highlight}>COP?</span></h2>
              <p className={styles.ctaText}>Browse our curated collection of the hottest streetwear drops.</p>
              <div className={styles.ctaButtons}>
                <Link href="/products" className={styles.ctaBtn} data-cursor="cop">EXPLORE COLLECTION</Link>
                <Link href="/about" className={styles.ctaBtnOutline} data-cursor="explore">ABOUT US</Link>
              </div>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerWave}>
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className={styles.footerWavePath}></path>
          </svg>
        </div>
        <div className={styles.footerContent}>
          <div className={styles.footerGrid}>
            {/* Shop All Products */}
            <div className={styles.footerSection}>
              <h3 className={styles.footerTitle}>SHOP ALL PRODUCTS</h3>
              <div className={styles.footerLinks}>
                <Link href="/products">All Products</Link>
                <Link href="/products?category=sneakers">Sneakers</Link>
                <Link href="/products?category=watches">Watches</Link>
                <Link href="/products?category=glasses">Glasses</Link>
                <Link href="/products?category=handbags">Handbags</Link>
                <Link href="/products?category=clothing">Clothing</Link>
                <Link href="/ua-batch">UA Batch</Link>
              </div>
            </div>

            {/* Category */}
            <div className={styles.footerSection}>
              <h3 className={styles.footerTitle}>CATEGORY</h3>
              <div className={styles.footerLinks}>
                <Link href="/brands">Brands</Link>
                <Link href="/luxury-watches">Luxury Watches</Link>
                <Link href="/sneakers">Sneakers</Link>
                <Link href="/watches">Premium Watches</Link>
                <Link href="/glasses">Eyewear</Link>
                <Link href="/handbags">Luxury Bags</Link>
              </div>
            </div>

            {/* Support */}
            <div className={styles.footerSection}>
              <h3 className={styles.footerTitle}>SUPPORT</h3>
              <div className={styles.footerLinks}>
                <Link href="/about">About Us</Link>
                <Link href="/track-order">Track Order</Link>
                <Link href="/return-exchange">Return & Exchange</Link>
                <a href="https://wa.me/919898285850" target="_blank" rel="noopener">WhatsApp Support</a>
                <p className={styles.footerPhone}>📱 +91 9898285850</p>
              </div>
            </div>

            {/* Subcategory of Support */}
            <div className={styles.footerSection}>
              <h3 className={styles.footerTitle}>QUICK LINKS</h3>
              <div className={styles.footerLinks}>
                <Link href="/products?sort=newest">New Arrivals</Link>
                <Link href="/products?sort=popular">Best Sellers</Link>
                <Link href="/products?featured=true">Featured</Link>
                <Link href="/brands">All Brands</Link>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <div className={styles.footerCopyright}>
              <p>© 2026 UrbanEx. All rights reserved.</p>
              <p className={styles.qualityNote}>All products are 100% premium quality.</p>
            </div>
            <div className={styles.footerBadges}>
              <span className={styles.badge}>PREMIUM</span>
              <span className={styles.badge}>VERIFIED</span>
              <span className={styles.badge}>SECURE</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}