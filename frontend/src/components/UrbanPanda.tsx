'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './UrbanPanda.module.css';

/**
 * URBAN PANDA — custom streetwear mascot that peeks from behind the UrbanEx
 * wordmark. Hand-built SVG (no clipart/emoji): thick ink outlines, B&W,
 * sticker-art feel matching the graffiti logo.
 *
 * Idle: only ear tips + top of head show above the logo's baseline.
 * Every 10–20s it performs ONE subtle sequence:
 *   peek up → look left → look right → blink → smirk → drop back.
 * Honors prefers-reduced-motion (stays idle, no motion).
 *
 * Driven by a single `phase` class on the root; all motion is CSS.
 */
type Phase = 'idle' | 'active';

export default function UrbanPanda({ className = '' }: { className?: string }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [look, setLook] = useState<'center' | 'left' | 'right'>('center');
  const [blink, setBlink] = useState(false);
  const [smirk, setSmirk] = useState(false);
  const timers = useRef<number[]>([]);
  const reduced = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    if (reduced.current) return; // stay idle, never animate

    let cancelled = false;
    const clearAll = () => { timers.current.forEach(clearTimeout); timers.current = []; };
    const push = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => { if (!cancelled) fn(); }, ms);
      timers.current.push(id);
    };

    // One full performance, then schedule the next at a random 10–20s gap.
    const runSequence = () => {
      setPhase('active');                 // peek up
      push(() => setLook('left'), 650);   // look left
      push(() => setLook('right'), 1150); // look right
      push(() => setLook('center'), 1600);
      push(() => setBlink(true), 1650);   // blink
      push(() => setBlink(false), 1780);
      push(() => setSmirk(true), 1820);   // confident smirk
      push(() => { setSmirk(false); setPhase('idle'); }, 2500); // drop back
      // schedule next
      const next = 10000 + Math.random() * 10000; // 10–20s
      push(runSequence, 2500 + next);
    };

    // first peek a few seconds after load
    push(runSequence, 4000);

    return () => { cancelled = true; clearAll(); };
  }, []);

  return (
    <div
      className={`${styles.root} ${styles[phase]} ${className}`}
      data-look={look}
      data-blink={blink ? '1' : '0'}
      data-smirk={smirk ? '1' : '0'}
      aria-hidden
    >
      <svg viewBox="0 0 120 110" className={styles.svg} role="img" aria-label="UrbanEx panda mascot">
        {/* ── EARS (behind head) ── */}
        <g className={styles.ears}>
          <circle cx="30" cy="30" r="17" className={styles.ink} />
          <circle cx="90" cy="30" r="17" className={styles.ink} />
          {/* inner ear notch for depth */}
          <circle cx="30" cy="31" r="7" className={styles.earInner} />
          <circle cx="90" cy="31" r="7" className={styles.earInner} />
        </g>

        {/* ── HEAD ── */}
        <path
          className={styles.head}
          d="M60 14
             C 30 14, 14 34, 14 60
             C 14 86, 34 104, 60 104
             C 86 104, 106 86, 106 60
             C 106 34, 90 14, 60 14 Z"
        />

        {/* ── EYE PATCHES (signature panda, angled = mischievous) ── */}
        <g className={styles.patches}>
          <path className={styles.ink} d="M44 46 C 33 44, 27 54, 30 64 C 33 73, 45 73, 49 65 C 52 57, 51 47, 44 46 Z" />
          <path className={styles.ink} d="M76 46 C 87 44, 93 54, 90 64 C 87 73, 75 73, 71 65 C 68 57, 69 47, 76 46 Z" />
        </g>

        {/* ── EYES (whites + moving pupils) ── */}
        <g className={styles.eyes}>
          <ellipse className={styles.white} cx="41" cy="58" rx="7.5" ry="8.5" />
          <ellipse className={styles.white} cx="79" cy="58" rx="7.5" ry="8.5" />
          <g className={styles.pupils}>
            <circle className={styles.pupil} cx="41" cy="59" r="3.6" />
            <circle className={styles.pupil} cx="79" cy="59" r="3.6" />
            {/* catchlight */}
            <circle className={styles.spark} cx="42.4" cy="57.4" r="1.1" />
            <circle className={styles.spark} cx="80.4" cy="57.4" r="1.1" />
          </g>
          {/* eyelids drop on blink */}
          <rect className={styles.lid} x="32" y="48" width="18" height="0" rx="4" />
          <rect className={styles.lid} x="70" y="48" width="18" height="0" rx="4" />
        </g>

        {/* ── NOSE + SMIRK ── */}
        <path className={styles.nose} d="M55 76 Q 60 80, 65 76 Q 62 83, 60 83 Q 58 83, 55 76 Z" />
        <path className={styles.mouthNeutral} d="M60 83 C 56 90, 49 90, 46 86" />
        <path className={styles.mouthSmirk} d="M60 83 C 67 92, 78 90, 82 82" />
      </svg>
    </div>
  );
}
