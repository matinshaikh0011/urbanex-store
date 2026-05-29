'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './HeroBanner.module.css';

// ──────────────────────────────────────────────────────────────
// PRODUCT DROPS — cycles through the four core categories
// ──────────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80',
    label: 'SNEAKERS',
    tagline: 'FRESH KICKS',
    spec: 'VULCANIZED RUBBER · MID-TOP SILHOUETTE',
    emoji: '👟',
    href: '/products?category=sneakers',
  },
  {
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=80',
    label: 'WATCHES',
    tagline: 'TIME PIECES',
    spec: '316L STEEL · SAPPHIRE CRYSTAL GLASS',
    emoji: '⌚',
    href: '/products?category=watches',
  },
  {
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=900&q=80',
    label: 'GLASSES',
    tagline: 'CLEAR VISION',
    spec: 'POLARIZED ACETATE · ANTI-REFLECTIVE COAT',
    emoji: '🕶️',
    href: '/products?category=glasses',
  },
  {
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=80',
    label: 'HANDBAGS',
    tagline: 'CARRY HARD',
    spec: 'MATTE CALF LEATHER · HAND-STITCHED',
    emoji: '👜',
    href: '/products?category=handbags',
  },
];

const TICKER = [
  'NEW DROP 2026',
  '100% AUTHENTIC',
  'FAST SHIPPING',
  'LIMITED STOCK',
  'STREET CERTIFIED',
  'COP OR DROP',
];

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const statRefs = useRef<(HTMLSpanElement | null)[]>([null, null, null]);

  // Auto-cycle products
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % PRODUCTS.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [paused]);

  // Animated stat counters — pure rAF, no libraries
  useEffect(() => {
    const stats = [
      { end: 5, suffix: 'K+' },
      { end: 50, suffix: '+' },
      { end: 12, suffix: 'K+' },
    ];
    const start = performance.now();
    const duration = 1900;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      stats.forEach((stat, i) => {
        const el = statRefs.current[i];
        if (el) el.innerText = Math.floor(eased * stat.end) + stat.suffix;
      });
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Mouse parallax — drives CSS vars, smoothed with rAF (cheap)
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(max-width: 1024px)').matches) return;

    let raf = 0;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };

    const onMove = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect();
      target.x = (e.clientX - rect.left) / rect.width - 0.5;
      target.y = (e.clientY - rect.top) / rect.height - 0.5;
    };
    const loop = () => {
      cur.x += (target.x - cur.x) * 0.07;
      cur.y += (target.y - cur.y) * 0.07;
      section.style.setProperty('--mx', cur.x.toFixed(4));
      section.style.setProperty('--my', cur.y.toFixed(4));
      raf = requestAnimationFrame(loop);
    };
    section.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      section.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const product = PRODUCTS[current];

  return (
    <section ref={sectionRef} className={styles.hero}>
      {/* ════════ ANIMATED BACKGROUND (GPU-cheap) ════════ */}
      <div className={styles.bg} aria-hidden>
        <div className={styles.bgMesh} />
        <div className={styles.bgStripes} />
        <div className={styles.bgGrid} />
        <div className={styles.bgWordWrap}>
          <div className={styles.bgWordTrack}>
            <span>{product.label}</span>
            <span className={styles.bgWordOutline}>{product.label}</span>
            <span>{product.label}</span>
          </div>
        </div>
        {/* Floating graffiti shapes (desktop/tablet) */}
        <span className={`${styles.shape} ${styles.shapeRing}`} />
        <span className={`${styles.shape} ${styles.shapeSquare}`} />
        <span className={`${styles.shape} ${styles.shapeDot}`} />
        <span className={`${styles.shape} ${styles.shapePlus}`}>+</span>
        <span className={`${styles.shape} ${styles.shapeStar}`}>✦</span>
        <span className={`${styles.shape} ${styles.shapeZig}`} />

        {/* Mobile-only animated background: rising graffiti symbols + sheen */}
        <div className={styles.mobileFX} aria-hidden>
          <span className={styles.mSheen} />
          {['✦', '✕', '★', '◆', '+', '●', '✦', '✕', '★'].map((g, i) => (
            <span key={i} className={styles.mGlyph}>{g}</span>
          ))}
        </div>
      </div>

      {/* Top ticker tape — now flush under the header (no gap) */}
      <div className={styles.tape} aria-hidden>
        <div className={styles.tapeTrack}>
          {[...TICKER, ...TICKER, ...TICKER].map((w, i) => (
            <span key={i} className={styles.tapeItem}>{w}<i>✦</i></span>
          ))}
        </div>
      </div>

      {/* ════════ CONTENT ════════ */}
      <div className={styles.content}>
        {/* LEFT — typography + CTAs */}
        <div className={styles.left}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            LIVE DROP 2026 — 100% AUTHENTIC
          </div>

          <h1 className={styles.title}>
            <span className={styles.titleTop}>
              {'URBANEX'.split('').map((c, i) => (
                <span
                  key={i}
                  className={styles.letter}
                  style={{ animationDelay: `${0.15 + i * 0.06}s` }}
                >
                  {c}
                </span>
              ))}
            </span>
            <span className={styles.titleBottom}>
              THE{' '}
              <span key={current} className={styles.cycleWord}>{product.label}</span>{' '}
              DROP
            </span>
            <span className={styles.titleUnderline} />
          </h1>

          <p className={styles.lede}>
            Watches · Sneakers · Glasses · Handbags. The street&apos;s most wanted —
            verified original, shipped fast across India.
          </p>

          <div className={styles.specRow}>
            <span className={styles.specTag}>{product.tagline}</span>
            <span className={styles.specText}>{product.spec}</span>
          </div>

          <div className={styles.ctaRow}>
            <Link href="/products" className={styles.ctaPrimary} data-cursor="cop">
              <span className={styles.ctaShine} />
              SHOP THE DROP <i>→</i>
            </Link>
            <Link href="/brands" className={styles.ctaSecondary} data-cursor="explore">
              EXPLORE BRANDS
            </Link>
          </div>

          <div className={styles.trustRow}>
            <span>⚡ Instant WhatsApp Support</span>
            <span>↩️ 7-Day Returns</span>
            <span>🔒 Secure Checkout</span>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.statBlock}>
              <span ref={(el) => { statRefs.current[0] = el; }} className={styles.statNum}>0K+</span>
              <span className={styles.statLabel}>ITEMS</span>
            </div>
            <div className={styles.statBlock}>
              <span ref={(el) => { statRefs.current[1] = el; }} className={styles.statNum}>0+</span>
              <span className={styles.statLabel}>BRANDS</span>
            </div>
            <div className={styles.statBlock}>
              <span ref={(el) => { statRefs.current[2] = el; }} className={styles.statNum}>0K+</span>
              <span className={styles.statLabel}>MEMBERS</span>
            </div>
          </div>
        </div>

        {/* RIGHT — product showcase tile */}
        <div className={styles.right}>
          <div className={styles.showcase}>
            <span className={styles.showcaseTag}>{product.emoji} {product.label}</span>
            <span className={styles.cornerSticker}>NEW<br />DROP</span>

            <Link href={product.href} className={styles.stage} data-cursor="view">
              {PRODUCTS.map((p, i) => (
                <img
                  key={p.image}
                  src={p.image}
                  alt={p.label}
                  className={`${styles.productImg} ${i === current ? styles.productActive : ''}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                />
              ))}
              <span className={styles.stageGlow} />
              <span className={styles.stageLabel}>SHOP {product.label} →</span>
            </Link>

            <div className={styles.showcaseFoot}>
              <span className={styles.priceHint}>{product.tagline}</span>
              <div className={styles.dots}>
                {PRODUCTS.map((p, i) => (
                  <button
                    key={p.label}
                    className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
                    onClick={() => setCurrent(i)}
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                    aria-label={`Show ${p.label}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className={styles.scrollCue} aria-hidden>
        <span>SCROLL</span>
        <div className={styles.scrollArrow} />
      </div>
    </section>
  );
}
