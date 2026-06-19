'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import UrbanPandaMark from './UrbanPandaMark';
import styles from './UrbanPandaPeek.module.css';

/**
 * URBAN PANDA — final header easter egg.
 *
 * Architecture:
 *  .root  = clip window (overflow:hidden). Its BOTTOM edge sits on the
 *           logo top edge → the logo acts as the wall.
 *  .inner = full panda head. GSAP translates it UP (yPercent) so the
 *           ears crest the wall first, then eyes rise into view. The
 *           wall clips the nose/mouth/chin so only the upper face shows.
 *
 * Sequence (~3s), expression FIXED:
 *  idle → ears crest → eyes rise to peak → freeze → glance L → glance R
 *  → blink → hold → duck (hidden) → pause → tiny second peek → hide
 *  → wait random gap → repeat.
 *
 * Logo never moves. GPU-accelerated transform/opacity only.
 *
 * Lifecycle:
 *  - static gsap import (no promise-timing bug).
 *  - timeline + the scheduling delayedCall are tracked in refs and
 *    explicitly killed in the effect cleanup, so React StrictMode's
 *    double-invoke can't leak racing timelines/timers (the root cause
 *    of the intermittent "frozen / never appears" behaviour).
 *  - the .inner element carries NO css transform; GSAP owns it fully.
 *    (A css translateY baseline made GSAP double-offset via yPercent,
 *    parking the panda permanently out of view.)
 *
 * Plays on every device — prefers-reduced-motion is intentionally NOT
 * gated, per explicit user request (many Windows machines run with
 * "animation effects off", which reports reduced-motion).
 */
export default function UrbanPandaPeek({ className = '' }: { className?: string }) {
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const svg = el.querySelector('svg');
    const pupils = svg?.querySelectorAll<SVGGElement>('.ux-pupil') ?? ([] as unknown as NodeListOf<SVGGElement>);
    const lLid = svg?.querySelector<SVGRectElement>('.ux-lid-l') ?? null;
    const rLid = svg?.querySelector<SVGRectElement>('.ux-lid-r') ?? null;

    const isDev = process.env.NODE_ENV === 'development';

    // Start fully hidden (translated a full height below the clip window),
    // then lift the first-paint opacity guard.
    gsap.set(el, { yPercent: 100, opacity: 1, force3D: true });
    gsap.set(pupils, { x: 0 });

    let tl: gsap.core.Timeline | null = null;
    let nextCall: gsap.core.Tween | null = null;

    const runSequence = () => {
      tl?.kill();
      tl = gsap.timeline({
        onComplete: () => {
          const gap = isDev
            ? 3 + Math.random() * 2    // dev: 3–5s, easy to watch
            : 10 + Math.random() * 10; // prod: 10–20s, randomized
          nextCall = gsap.delayedCall(gap, runSequence);
        },
      });

      // Ears crest the wall, brief pause, then the rest follows.
      tl.to(el, { yPercent: 76, duration: 0.55, ease: 'power1.inOut' });
      tl.to(el, { yPercent: 58, duration: 0.35, ease: 'power1.inOut' }, '+=0.15');
      // Eyes + brows rise to peak (~40-50% of the head; nose/mouth stay
      // clipped behind the wall — it should still feel hidden).
      tl.to(el, { yPercent: 36, duration: 0.45, ease: 'power2.out' }, '+=0.1');
      // Freeze / lock gaze.
      tl.to({}, { duration: 0.25 });

      // Glance left, right, re-center.
      if (pupils.length) {
        tl.to(pupils, { x: -2.8, duration: 0.22, ease: 'power1.inOut' });
        tl.to(pupils, { x: 2.8, duration: 0.22, ease: 'power1.inOut' }, '+=0.2');
        tl.to(pupils, { x: 0, duration: 0.18, ease: 'power1.out' }, '+=0.15');
      } else {
        tl.to({}, { duration: 0.6 });
      }

      // Blink once.
      if (lLid && rLid) {
        tl.to([lLid, rLid], { attr: { height: 22 }, duration: 0.08, ease: 'none' });
        tl.to([lLid, rLid], { attr: { height: 0 }, duration: 0.1, ease: 'none' }, '+=0.04');
      } else {
        tl.to({}, { duration: 0.18 });
      }

      // Hold eye contact, then quick duck behind the wall.
      tl.to({}, { duration: 0.3 });
      tl.to(el, { yPercent: 100, duration: 0.22, ease: 'power2.in' });

      // Pause hidden, then a tiny "did anyone notice?" second peek, then hide.
      tl.to({}, { duration: 0.5 });
      tl.to(el, { yPercent: 62, duration: 0.28, ease: 'power1.out' });
      tl.to({}, { duration: 0.18 });
      tl.to(el, { yPercent: 100, duration: 0.2, ease: 'power1.in' });
    };

    const firstDelay = isDev ? 1.5 : 5;
    nextCall = gsap.delayedCall(firstDelay, runSequence);

    return () => {
      nextCall?.kill();
      tl?.kill();
      gsap.killTweensOf(el);
      gsap.killTweensOf(pupils);
      if (lLid) gsap.killTweensOf(lLid);
      if (rLid) gsap.killTweensOf(rLid);
    };
  }, []);

  return (
    <div className={`${styles.root} ${className}`} aria-hidden>
      <div ref={innerRef} className={styles.inner}>
        <UrbanPandaMark className={styles.mark} sticker={false} />
      </div>
    </div>
  );
}
