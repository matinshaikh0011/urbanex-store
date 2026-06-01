'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from './HeroBanner.module.css';

// ──────────────────────────────────────────────────────────────
// CATEGORY DROPS — each has its own identity (manifesto + stamp)
// Product cutouts are transparent PNGs so they can break the frame.
// ──────────────────────────────────────────────────────────────
interface Drop {
  key: string;
  label: string;
  manifesto: [string, string, string]; // three-word identity
  accent: 0 | 1 | 2;                    // which manifesto word is red
  spec: string;
  image: string;
  href: string;
  dropNo: string;
}

const DROPS: Drop[] = [
  {
    key: 'sneakers',
    label: 'SNEAKERS',
    manifesto: ['STREET', 'SPEED', 'CULTURE'],
    accent: 1,
    spec: 'VULCANIZED RUBBER · MID-TOP SILHOUETTE',
    image: '/hero-morph-sneakers.png',
    href: '/products?category=sneakers',
    dropNo: 'DROP 001',
  },
  {
    key: 'watches',
    label: 'WATCHES',
    manifesto: ['TIME', 'STATUS', 'PRECISION'],
    accent: 1,
    spec: '316L STEEL · SAPPHIRE CRYSTAL GLASS',
    image: '/hero-morph-watch.png',
    href: '/products?category=watches',
    dropNo: 'DROP 002',
  },
  {
    key: 'glasses',
    label: 'GLASSES',
    manifesto: ['VISION', 'ATTITUDE', 'ICON'],
    accent: 2,
    spec: 'POLARIZED ACETATE · ANTI-REFLECTIVE COAT',
    image: '/hero-morph-glasses.png',
    href: '/products?category=glasses',
    dropNo: 'DROP 003',
  },
  {
    key: 'handbags',
    label: 'HANDBAGS',
    manifesto: ['CRAFT', 'STYLE', 'STATEMENT'],
    accent: 2,
    spec: 'MATTE CALF LEATHER · HAND-STITCHED',
    image: '/hero-morph-handbag.png',
    href: '/products?category=handbags',
    dropNo: 'DROP 004',
  },
];

const TRUST = ['VERIFIED AUTHENTIC', 'CURATED BRANDS', 'FAST SHIPPING', '7-DAY RETURNS'];
const TICKER = ['NEW DROP 2026', '100% AUTHENTIC', 'FAST SHIPPING', 'LIMITED STOCK', 'STREET CERTIFIED', 'COP OR DROP'];

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Auto-cycle drops
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setCurrent(p => (p + 1) % DROPS.length), 4200);
    return () => clearInterval(id);
  }, [paused]);

  // Pause cycling while tab is hidden (saves cycles + avoids jump on return)
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Pointer parallax → CSS vars (desktop only, rAF-smoothed, transform-only)
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(max-width: 1024px)').matches) return;

    let raf = 0;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      const r = section.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width - 0.5;
      target.y = (e.clientY - r.top) / r.height - 0.5;
    };
    const loop = () => {
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      section.style.setProperty('--mx', cur.x.toFixed(4));
      section.style.setProperty('--my', cur.y.toFixed(4));
      raf = requestAnimationFrame(loop);
    };
    section.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(loop);
    return () => { section.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  const select = useCallback((i: number) => setCurrent(i), []);

  const d = DROPS[current];

  return (
    <section ref={sectionRef} className={styles.hero} data-cat={d.key}>
      {/* ════════ BACKGROUND ════════ */}
      <div className={styles.bg} aria-hidden>
        <div className={styles.bgWash} />
        <div className={styles.bgGrid} />
        {/* Giant kinetic category wordmark — re-keys to replay the slide */}
        <div className={styles.ghostWrap}>
          <span key={d.key} className={styles.ghostWord}>{d.label}</span>
        </div>
        {/* Mobile-only rising glyphs + sheen */}
        <div className={styles.mobileFX} aria-hidden>
          <span className={styles.mSheen} />
          {['✦', '✕', '★', '◆', '+', '●', '✦', '✕'].map((g, i) => (
            <span key={i} className={styles.mGlyph}>{g}</span>
          ))}
        </div>
      </div>

      {/* ════════ TICKER ════════ */}
      <div className={styles.tape} aria-hidden>
        <div className={styles.tapeTrack}>
          {[...TICKER, ...TICKER, ...TICKER].map((w, i) => (
            <span key={i} className={styles.tapeItem}>{w}<i>✦</i></span>
          ))}
        </div>
      </div>

      {/* ════════ CONTENT ════════ */}
      <div className={styles.content}>
        {/* ── DROP CARD (product breaks the frame) ── */}
        <div className={styles.cardCol}>
          <div className={styles.dropCard}>
            <span className={styles.dropStamp}>
              <span key={`${d.key}-no`} className={styles.dropStampInner}>{d.dropNo}</span>
            </span>
            <span className={styles.liveChip}><i className={styles.liveDot} />LIVE</span>

            <Link href={d.href} className={styles.cardStage} data-cursor="view" aria-label={`Shop ${d.label}`}>
              {/* Clipped backdrop + ghost letter live inside the stage */}
              <span className={styles.stageTint} />
              <span key={`${d.key}-ghost`} className={styles.stageLetter}>{d.label.charAt(0)}</span>
            </Link>

            {/* Product layer is OUTSIDE the clip → breaks above the top border */}
            <div className={styles.productLayer}>
              {DROPS.map((p, i) => (
                <img
                  key={p.key}
                  src={p.image}
                  alt={p.label}
                  className={`${styles.product} ${i === current ? styles.productActive : ''}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                />
              ))}
            </div>

            <div className={styles.cardFoot}>
              <span className={styles.spec}>{d.spec}</span>
              <div className={styles.dots}>
                {DROPS.map((p, i) => (
                  <button
                    key={p.key}
                    className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
                    onClick={() => select(i)}
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                    aria-label={`Show ${p.label}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── MANIFESTO + CTAs ── */}
        <div className={styles.copyCol}>
          <div className={styles.kicker}>
            <span className={styles.kickerMark}>URBANEX</span>
            <span className={styles.kickerLine} />
            <span className={styles.kickerCat}>{d.label}</span>
          </div>

          {/* Three-word category manifesto — the headline */}
          <h1 className={styles.manifesto} key={d.key}>
            {d.manifesto.map((word, i) => (
              <span
                key={word}
                className={`${styles.word} ${i === d.accent ? styles.wordAccent : ''}`}
                style={{ animationDelay: `${0.08 + i * 0.09}s` }}
              >
                <span className={styles.wordInner}>{word}<i className={styles.wordDot}>.</i></span>
              </span>
            ))}
          </h1>

          <p className={styles.lede}>
            The street&apos;s most wanted — verified original, shipped fast across India.
          </p>

          <div className={styles.ctaRow}>
            <Link href={d.href} className={styles.ctaPrimary} data-cursor="cop">
              <span className={styles.ctaShine} />
              SHOP {d.label} <i>→</i>
            </Link>
            <Link href="/brands" className={styles.ctaSecondary} data-cursor="explore">
              EXPLORE BRANDS
            </Link>
          </div>

          {/* Trust strip — designed in, not bolted on */}
          <div className={styles.trustStrip}>
            {TRUST.map((t, i) => (
              <span key={t} className={styles.trustItem}>
                <i className={styles.trustTick}>✓</i>{t}
                {i < TRUST.length - 1 && <i className={styles.trustSep} />}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.scrollCue} aria-hidden>
        <span>SCROLL</span>
        <div className={styles.scrollArrow} />
      </div>
    </section>
  );
}
