'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { TRUST_STATS } from '@/lib/trustConfig';
import styles from './HeroBanner.module.css';

// ──────────────────────────────────────────────────────────────
// PRODUCT DROPS — cycles through the four core categories
// ──────────────────────────────────────────────────────────────
const DEFAULT_PRODUCTS = [
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

// Inline SVG crack — used as the seam between the light & dark slabs.
// Hand-tuned to feel organic, not algorithmic; mirrors the cracks on the logo.
const CRACK_SVG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 1000' preserveAspectRatio='none'><path d='M20 0 L18 60 L22 130 L17 210 L24 290 L19 360 L23 440 L16 520 L22 600 L18 690 L25 770 L17 850 L21 930 L20 1000' stroke='%230a0a0a' stroke-width='2.4' fill='none' opacity='0.85'/><path d='M20 0 L18 60 L22 130 L17 210 L24 290 L19 360 L23 440 L16 520 L22 600 L18 690 L25 770 L17 850 L21 930 L20 1000' stroke='%23f4f2ed' stroke-width='0.8' fill='none' opacity='0.5'/></svg>\")";

// ── Shutter trigger gate ───────────────────────────────────────
// Survives client-side navigation within one document load; resets on
// a real page load. Prevents the reveal from replaying when the user
// navigates back to "/" via <Link> (returning from a product page,
// category change, etc.).
let playedThisDocument = false;

/**
 * Decides whether the shutter reveal should play on this mount.
 * - reduced motion  → never (open instantly)
 * - development     → every refresh / HMR remount (ignore the doc flag)
 * - production      → first visit + browser refresh only; never on
 *                     internal SPA navigation (guarded by playedThisDocument)
 */
function shouldPlayShutter(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  } catch { /* matchMedia unsupported — continue */ }

  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) return true; // dev: replay on every refresh, ignore the flag

  // Production: only on a genuine document load (navigate or reload),
  // and only once per loaded document.
  if (playedThisDocument) return false;

  let navType: string | undefined;
  try {
    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    navType = entries[0]?.type;
  } catch { /* Navigation Timing unsupported */ }

  // navigate = first visit / typed URL / external link; reload = refresh.
  // back_forward / undefined → treat conservatively as "play once" only if
  // we have never played in this document.
  return navType === 'navigate' || navType === 'reload' || navType === undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function HeroBanner({ initialSlides }: { initialSlides?: any[] }) {
  // Prefer server-provided slides so the first paint already shows the real
  // featured products — no flash of the DEFAULT_PRODUCTS placeholder.
  const hasInitial = Array.isArray(initialSlides) && initialSlides.length > 0;
  const [slides, setSlides] = useState<any[]>(hasInitial ? initialSlides! : DEFAULT_PRODUCTS);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const statRefs = useRef<(HTMLSpanElement | null)[]>([null, null, null]);

  useEffect(() => {
    // Server already supplied real slides — skip the client fetch (and the swap).
    if (hasInitial) return;
    fetch('/api/hero-slides')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSlides(data);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── THE SHUTTER — storefront roller-door reveal ────────────────
  // 'closed' → 'opening' → 'open'. Initial state reads ONLY `playedThisDocument`
  // — a plain module flag that is `false` on both the server and the client at a
  // genuine document load (so SSR HTML and the client's first render match: no
  // hydration mismatch), and `true` after an internal SPA nav (skip the replay).
  // Because it defaults to 'closed', the shutter is painted from the very first
  // frame — no flash of open content before it appears.
  const [shutterState, setShutterState] = useState<'closed' | 'opening' | 'open'>(
    () => (playedThisDocument ? 'open' : 'closed')
  );
  const shutterTimers = useRef<number[]>([]);
  const touchStartY = useRef<number | null>(null);

  const liftShutter = useCallback(() => {
    setShutterState(prev => {
      if (prev !== 'closed') return prev;
      playedThisDocument = true; // mark so internal nav back to "/" won't replay
      // Door rolls up + settles (~1.32s) then the overlay unmounts.
      const t1 = window.setTimeout(() => setShutterState('open'), 1320);
      shutterTimers.current.push(t1);
      return 'opening';
    });
  }, []);

  // Post-hydration decision (reads browser APIs, so effect-only).
  useEffect(() => {
    if (shutterState !== 'closed') return;
    if (!shouldPlayShutter()) {
      // Reduced motion / already played / non-navigation → reveal instantly.
      playedThisDocument = true;
      setShutterState('open');
      return;
    }
    const auto = window.setTimeout(() => liftShutter(), 60);
    shutterTimers.current.push(auto);
    const timers = shutterTimers.current;
    return () => { timers.forEach(t => clearTimeout(t)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liftShutter]);

  // Swipe-up to lift (mobile)
  const onShutterTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const onShutterTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current == null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy < -36) { liftShutter(); touchStartY.current = null; }
  };
  const onShutterTouchEnd = () => { touchStartY.current = null; };

  // Auto-cycle products
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [paused, slides.length]);

  // Animated stat counters — pure rAF, no libraries.
  // Numbers come from TRUST_STATS (single source of truth) so the hero
  // never contradicts the other trust sections.
  useEffect(() => {
    const stats = [
      // Happy customers + orders count up with comma grouping; rating one decimal.
      { end: TRUST_STATS.happyCustomers, decimals: 0, suffix: '+', comma: true },
      { end: TRUST_STATS.ordersDelivered, decimals: 0, suffix: '+', comma: true },
      { end: TRUST_STATS.rating, decimals: 1, suffix: '', comma: false },
    ];
    const setFinal = () => {
      stats.forEach((stat, i) => {
        const el = statRefs.current[i];
        if (!el) return;
        el.innerText = (stat.comma ? stat.end.toLocaleString('en-IN') : stat.end.toFixed(stat.decimals)) + stat.suffix;
      });
    };
    // Respect reduced motion: show the real numbers immediately, no count-up.
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFinal();
      return;
    }
    const start = performance.now();
    const duration = 1900;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      stats.forEach((stat, i) => {
        const el = statRefs.current[i];
        if (!el) return;
        const val = eased * stat.end;
        const text = stat.comma
          ? Math.floor(val).toLocaleString('en-IN')
          : val.toFixed(stat.decimals);
        el.innerText = text + stat.suffix;
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

  const product = slides[current] || slides[0];

  return (
    <section ref={sectionRef} className={styles.hero}>
      {/* ════════ DIPTYCH BACKGROUND — light cement | dark asphalt ════════ */}
      <div className={styles.bg} aria-hidden>
        {/* Left half: light cement slab */}
        <div className={styles.slabLight}>
          <div className={styles.slabGrain} />
          <div className={styles.slabStains} />
        </div>
        {/* Right half: dark asphalt slab */}
        <div className={styles.slabDark}>
          <div className={styles.slabGrain} />
          <div className={styles.slabStains} />
        </div>

        {/* Cracked seam down the centre */}
        <div
          className={styles.crack}
          style={{ backgroundImage: CRACK_SVG }}
        />

        {/* Ghost wordmark drifting across (paint stencil) */}
        <div className={styles.ghostWordWrap}>
          <div className={styles.ghostWordTrack}>
            <span>URBANEX</span>
            <span className={styles.ghostWordOutline}>URBANEX</span>
            <span>URBANEX</span>
          </div>
        </div>

        {/* Spray drips falling from the seam */}
        <span className={`${styles.drip} ${styles.dripA}`} />
        <span className={`${styles.drip} ${styles.dripB}`} />
        <span className={`${styles.drip} ${styles.dripC}`} />

        {/* Stencil glyphs */}
        <span className={`${styles.glyph} ${styles.glyphPlus}`}>+</span>
        <span className={`${styles.glyph} ${styles.glyphStar}`}>✦</span>
        <span className={`${styles.glyph} ${styles.glyphX}`}>✕</span>
        <span className={`${styles.glyph} ${styles.glyphCircle}`} />

        {/* Mobile-only: rising glyphs over a single stacked background */}
        <div className={styles.mobileFX} aria-hidden>
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
              <span ref={(el) => { statRefs.current[0] = el; }} className={styles.statNum}>{TRUST_STATS.happyCustomers.toLocaleString('en-IN')}+</span>
              <span className={styles.statLabel}>HAPPY CUSTOMERS</span>
            </div>
            <div className={styles.statBlock}>
              <span ref={(el) => { statRefs.current[1] = el; }} className={styles.statNum}>{TRUST_STATS.ordersDelivered.toLocaleString('en-IN')}+</span>
              <span className={styles.statLabel}>ORDERS DELIVERED</span>
            </div>
            <div className={styles.statBlock}>
              <span ref={(el) => { statRefs.current[2] = el; }} className={styles.statNum}>{TRUST_STATS.rating.toFixed(1)}</span>
              <span className={styles.statLabel}>RATING ★</span>
            </div>
          </div>
        </div>

        {/* RIGHT — product showcase tile */}
        <div className={styles.right}>
          <div className={styles.showcase}>
            <span className={styles.showcaseTag}>{product.emoji} {product.label}</span>
            <span className={styles.cornerSticker}>NEW<br />DROP</span>

            <Link href={product.href} className={styles.stage} data-cursor="view">
              {slides.map((p, i) => (
                <img
                  key={p.image + i}
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
                {slides.map((p, i) => (
                  <button
                    key={p.label + i}
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

      {/* ════════ THE DIPTYCH SHUTTER — two slabs part from the seam ════════ */}
      {shutterState !== 'open' && (
        <div
          className={`${styles.shutter} ${shutterState === 'opening' ? styles.shutterOpening : ''}`}
          role="dialog"
          aria-label="UrbanEx store intro — press Skip to enter"
          onTouchStart={onShutterTouchStart}
          onTouchMove={onShutterTouchMove}
          onTouchEnd={onShutterTouchEnd}
        >
          {/* Interior glow behind the slabs */}
          <div className={styles.shutterGlow} aria-hidden />

          {/* Left slab — light cement */}
          <div className={`${styles.shutterSlab} ${styles.shutterSlabLeft}`}>
            <div className={styles.shutterSlabTex} aria-hidden />
            <div className={styles.shutterSignLeft}>
              <span className={styles.shutterSignWordLight}>URBAN</span>
            </div>
          </div>

          {/* Right slab — dark asphalt */}
          <div className={`${styles.shutterSlab} ${styles.shutterSlabRight}`}>
            <div className={styles.shutterSlabTex} aria-hidden />
            <div className={styles.shutterSignRight}>
              <span className={styles.shutterSignWordDark}>EX</span>
            </div>
          </div>

          {/* The crack/seam that splits */}
          <div
            className={styles.shutterCrack}
            style={{ backgroundImage: CRACK_SVG }}
            aria-hidden
          />

          {/* Sub-tag, centered */}
          <div className={styles.shutterTag} aria-hidden>EST. STREETWEAR</div>

          {/* Controls */}
          <button
            className={styles.shutterLift}
            onClick={liftShutter}
            aria-label="Open the doors and enter the store"
          >
            <span className={styles.shutterChevron} aria-hidden>⇔</span>
            PART TO ENTER
          </button>
          <button className={styles.shutterSkip} onClick={liftShutter} aria-label="Skip intro and enter the store">
            SKIP →
          </button>
        </div>
      )}
    </section>
  );
}
