'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import Link from 'next/link';
import styles from './BrandCarousel.module.css';

interface Brand {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function BrandCarousel({ brands }: { brands: Brand[] }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<HTMLAnchorElement[]>([]);

  // Per-card animation state (parallel to cardEls)
  const stateRef = useRef<{ reveal: number; prox: number; revealed: boolean }[]>([]);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  // Initialise cards to hidden BEFORE first paint (prevents flash).
  // Skipped entirely when the user prefers reduced motion — then CSS
  // fallbacks (--reveal:1, --prox:1) render the grid fully visible/static.
  useLayoutEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    stateRef.current = cardEls.current.map(() => ({ reveal: 0, prox: 0, revealed: false }));
    if (reduced) return;
    cardEls.current.forEach(el => {
      if (!el) return;
      el.style.setProperty('--reveal', '0');
      el.style.setProperty('--prox', '0');
    });
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const els = cardEls.current.filter(Boolean);
    if (els.length === 0) return;

    const startLoop = () => {
      if (runningRef.current) return;
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(frame);
    };

    const frame = () => {
      const vh = window.innerHeight;
      const viewportCenter = vh / 2;
      const maxDist = vh * 0.62; // distance at which a card reaches its dimmest

      // Read phase (batched to avoid layout thrash)
      const rects = els.map(el => el.getBoundingClientRect());

      let stillMoving = false;
      els.forEach((el, i) => {
        const st = stateRef.current[i];
        if (!st) return;
        const r = rects[i];
        const cardCenter = r.top + r.height / 2;
        const dist = Math.abs(cardCenter - viewportCenter);
        const targetProx = Math.max(0, 1 - dist / maxDist); // 1 at center → 0 far away
        const targetReveal = st.revealed ? 1 : 0;

        // Spring-ish smoothing via lerp
        st.prox = lerp(st.prox, targetProx, 0.12);
        st.reveal = lerp(st.reveal, targetReveal, 0.12);

        // Write phase — only custom properties; CSS does the transform math
        el.style.setProperty('--prox', st.prox.toFixed(3));
        el.style.setProperty('--reveal', st.reveal.toFixed(3));

        if (Math.abs(st.prox - targetProx) > 0.001 || Math.abs(st.reveal - targetReveal) > 0.001) {
          stillMoving = true;
        }
      });

      if (runningRef.current || stillMoving) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rafRef.current = null;
      }
    };

    // Reveal each card once it first enters, with a subtle neighbour stagger
    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const i = els.indexOf(entry.target as HTMLAnchorElement);
        if (i === -1) return;
        if (entry.isIntersecting && stateRef.current[i] && !stateRef.current[i].revealed) {
          window.setTimeout(() => {
            if (stateRef.current[i]) stateRef.current[i].revealed = true;
            startLoop();
          }, (i % 6) * 45);
        }
      });
    }, { threshold: 0.18 });

    // Run the rAF loop only while the section is near the viewport
    const sectionIO = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e.isIntersecting) {
        startLoop();
      } else {
        runningRef.current = false; // loop stops after it settles
      }
    }, { rootMargin: '200px 0px' });

    els.forEach(el => revealIO.observe(el));
    if (gridRef.current) sectionIO.observe(gridRef.current);

    return () => {
      revealIO.disconnect();
      sectionIO.disconnect();
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [brands]);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>SHOP BY <span className={styles.accent}>BRAND</span></h2>
        <p className={styles.subtitle}>Find your favorite brands all in one place</p>
      </div>
      <div className={styles.grid} ref={gridRef}>
        {brands.map((brand, idx) => (
          <Link
            key={brand.id}
            href={`/products?brand=${brand.slug}`}
            className={styles.brandCard}
            ref={el => { if (el) cardEls.current[idx] = el; }}
          >
            <div className={styles.logoWrapper}>
              {brand.logoUrl ? (
                <BrandLogo url={brand.logoUrl} name={brand.name} />
              ) : (
                <span className={styles.logoText}>{brand.name.charAt(0)}</span>
              )}
            </div>
            <span className={styles.brandName}>{brand.name}</span>
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

  return (
    <img
      src={url}
      alt={name}
      className={styles.logo}
      onError={() => setError(true)}
    />
  );
}
