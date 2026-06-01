'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import BrandCarousel from '@/components/BrandCarousel';
import ScrollReveal from '@/components/ScrollReveal';
import HeroBanner from '@/components/HeroBanner';
import FeaturedRow from '@/components/FeaturedRow';
import Loader from '@/components/Loader';
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
  const dragStart = useRef(0);
  const isDragging = useRef(false);

  const goTo = (i: number) => setActive((i + infoSlides.length) % infoSlides.length);

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

  const slide = infoSlides[active];

  return (
    <section className={styles.infoSlider}>
      <div
        className={styles.infoStage}
        onMouseDown={e => onDragStart(e.clientX)}
        onMouseUp={e => onDragEnd(e.clientX)}
        onTouchStart={e => onDragStart(e.touches[0].clientX)}
        onTouchEnd={e => onDragEnd(e.changedTouches[0].clientX)}
      >
        <button
          className={`${styles.infoArrow} ${styles.infoArrowLeft}`}
          onClick={() => { goTo(active - 1); resetTimer(); }}
          aria-label="Previous"
        >‹</button>

        {/* Single rotating banner */}
        <div
          key={active}
          className={styles.infoBanner}
          style={{ '--slide-color': slide.color } as React.CSSProperties}
        >
          <div className={styles.infoIconWrap}>
            <span className={styles.infoIcon}>{slide.icon}</span>
          </div>
          <div className={styles.infoBody}>
            <div className={styles.infoStat}>{slide.stat}</div>
            <div className={styles.infoTitle}>{slide.title}</div>
            <div className={styles.infoSub}>{slide.sub}</div>
          </div>
          <div className={styles.infoIndex}>{String(active + 1).padStart(2, '0')}<span>/{String(infoSlides.length).padStart(2, '0')}</span></div>
        </div>

        <button
          className={`${styles.infoArrow} ${styles.infoArrowRight}`}
          onClick={() => { goTo(active + 1); resetTimer(); }}
          aria-label="Next"
        >›</button>
      </div>

      {/* Progress dots */}
      <div className={styles.infoDots}>
        {infoSlides.map((_, i) => (
          <button
            key={i}
            className={`${styles.infoDot} ${i === active ? styles.infoDotActive : ''}`}
            onClick={() => { goTo(i); resetTimer(); }}
            aria-label={`Slide ${i + 1}`}
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
      fetch('/api/brands').then(res => res.json()).catch(() => []),
      fetch('/api/products').then(res => res.json()).catch(() => [])
    ])
    .then(([brandsData, productsData]) => {
      setBrands(Array.isArray(brandsData) ? brandsData : []);
      setAllProducts(Array.isArray(productsData) ? productsData : []);
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  // Get featured products by category (guard against non-array responses)
  // 4 rows × 4 columns = up to 16 per category
  const products = Array.isArray(allProducts) ? allProducts : [];
  const featuredSneakers = products.filter((p: any) => p.category === 'sneakers' && p.isFeatured).slice(0, 16);
  const featuredWatches = products.filter((p: any) => p.category === 'watches' && p.isFeatured).slice(0, 16);
  const featuredGlasses = products.filter((p: any) => p.category === 'glasses' && p.isFeatured).slice(0, 16);
  const featuredHandbags = products.filter((p: any) => p.category === 'handbags' && p.isFeatured).slice(0, 16);
  const featuredClothing = products.filter((p: any) => p.category === 'clothing' && p.isFeatured).slice(0, 16);

  const hasAnyFeatured =
    featuredSneakers.length > 0 ||
    featuredWatches.length > 0 ||
    featuredGlasses.length > 0 ||
    featuredHandbags.length > 0 ||
    featuredClothing.length > 0;

  // Pick a hero featured product (rotate through categories)
  const heroProduct = products.find((p: any) => p.isFeatured && p.category === 'sneakers') || products[0];

  if (loading) {
    return (
      <>
        <GlobalPopup />
        <Header />
        <main className={styles.main}>
          <Loader label="LOADING DROPS" />
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
              <span>LUXURY WATCHES</span>
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

        <BrandCarousel brands={brands} />

        {/* Featured Drops - Subdivided by Category */}
        <section className={styles.featured}>
          <ScrollReveal animation="slideUp">
            <div className={styles.featuredHeader}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.titleAccent}>FEATURED</span> DROPS
              </h2>
              <p className={styles.sectionSubtitle}>The hottest releases in every category</p>
            </div>
          </ScrollReveal>

          {hasAnyFeatured ? (
            <>
              <ScrollReveal animation="fadeIn">
                <FeaturedRow icon="👟" title="SNEAKERS" href="/products?category=sneakers" products={featuredSneakers} />
              </ScrollReveal>
              <ScrollReveal animation="fadeIn">
                <FeaturedRow icon="⌚" title="LUXURY WATCHES" href="/products?category=watches" products={featuredWatches} />
              </ScrollReveal>
              <ScrollReveal animation="fadeIn">
                <FeaturedRow icon="🕶️" title="GLASSES" href="/products?category=glasses" products={featuredGlasses} />
              </ScrollReveal>
              <ScrollReveal animation="fadeIn">
                <FeaturedRow icon="👜" title="HANDBAGS" href="/products?category=handbags" products={featuredHandbags} />
              </ScrollReveal>
              <ScrollReveal animation="fadeIn">
                <FeaturedRow icon="👕" title="CLOTHING" href="/products?category=clothing" products={featuredClothing} />
              </ScrollReveal>

              <ScrollReveal animation="fadeIn">
                <div className={styles.featuredViewAll}>
                  <Link href="/products" className={styles.featuredViewAllBtn} data-cursor="cop">
                    VIEW ALL PRODUCTS →
                  </Link>
                </div>
              </ScrollReveal>
            </>
          ) : (
            <ScrollReveal animation="scaleIn">
              <div className={styles.comingSoon}>
                <span className={styles.comingSoonIcon}>🛍️</span>
                <h3>FRESH DROPS COMING SOON</h3>
                <p>We&apos;re stocking up on the hottest releases. Check back shortly or browse our full collection.</p>
                <Link href="/products" className={styles.featuredViewAllBtn} data-cursor="cop">
                  BROWSE ALL PRODUCTS →
                </Link>
              </div>
            </ScrollReveal>
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

        {/* Instagram Feed */}
        <section className={styles.instagram}>
          <ScrollReveal animation="slideUp">
            <div className={styles.instaHeader}>
              <h2 className={styles.sectionTitle}>FOLLOW US ON <span className={styles.titleAccent}>INSTAGRAM</span></h2>
              <a href="https://www.instagram.com/urbanex.store/" target="_blank" rel="noopener noreferrer" className={styles.instaHandle}>@urbanex.store</a>
            </div>
          </ScrollReveal>
          <div className={styles.instaGrid}>
            {[
              'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400',
              'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=400',
              'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
              'https://images.unsplash.com/photo-1539185441755-769473a23570?w=400',
              'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=400',
              'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
            ].map((img, i) => (
              <a
                key={i}
                href="https://www.instagram.com/urbanex.store/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.instaCell}
              >
                <img src={img} alt={`UrbanEx Instagram post ${i + 1}`} loading="lazy" />
                <span className={styles.instaOverlay}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </span>
              </a>
            ))}
          </div>
          <div className={styles.instaFollowWrap}>
            <a href="https://www.instagram.com/urbanex.store/" target="_blank" rel="noopener noreferrer" className={styles.instaFollowBtn}>
              FOLLOW US
            </a>
          </div>
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
                <Link href="/products?category=watches">Luxury Watches</Link>
                <Link href="/products?category=sneakers">Sneakers</Link>
                <Link href="/products?category=glasses">Eyewear</Link>
                <Link href="/products?category=handbags">Luxury Bags</Link>
                <Link href="/products?category=clothing">Clothing</Link>
              </div>
            </div>

            {/* Support */}
            <div className={styles.footerSection}>
              <h3 className={styles.footerTitle}>SUPPORT</h3>
              <div className={styles.footerLinks}>
                <Link href="/about">About Us</Link>
                <Link href="/track-order">Track Order</Link>
                <Link href="/faq">FAQ</Link>
                <Link href="/return-exchange">Return & Exchange</Link>
                <Link href="/wholesale">Wholesale Enquiry</Link>
                <a href="https://wa.me/919898285850" target="_blank" rel="noopener">WhatsApp Support</a>
                <p className={styles.footerPhone}>📱 +91 98982 85850</p>
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

          <div className={styles.footerSocials}>
            <a
              href="https://www.instagram.com/urbanex.store/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
              aria-label="Instagram"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              <span>@shopurbanex</span>
            </a>
            <a
              href="https://wa.me/919898285850"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.socialBtn} ${styles.socialWhatsapp}`}
              aria-label="WhatsApp"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span>Chat on WhatsApp</span>
            </a>
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