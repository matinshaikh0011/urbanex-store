'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './InteractiveCursor.module.css';

export default function InteractiveCursor() {
  const pathname = usePathname();
  const dotRef   = useRef<HTMLDivElement>(null);
  const ringRef  = useRef<HTMLDivElement>(null);
  const [cursorText, setCursorText] = useState('');
  const [hasText,    setHasText]    = useState(false);
  const [isHidden,   setIsHidden]   = useState(true);
  const [isClicking, setIsClicking] = useState(false);
  const [isHovered,  setIsHovered]  = useState(false);
  const [isTextMode, setIsTextMode] = useState(false);
  const [ripples,    setRipples]    = useState<{ id: number; x: number; y: number }[]>([]);
  const [isTouch,    setIsTouch]    = useState<boolean | null>(null);

  const mouseRef    = useRef({ x: 0, y: 0 });
  const ringPosRef  = useRef({ x: 0, y: 0 });
  const dotPosRef   = useRef({ x: 0, y: 0 });
  const isTouchRef  = useRef(false);

  // Don't render custom cursor on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  // Detect touch
  useEffect(() => {
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouch(touch);
    isTouchRef.current = touch;
  }, []);

  useEffect(() => {
    if (isTouchRef.current) return;

    document.body.classList.add('custom-cursor-active');

    const handleMouseMove = (e: MouseEvent) => {
      setIsHidden(false);
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;

      const target = e.target as HTMLElement | null;
      if (!target?.closest) {
        setIsTextMode(false);
        return;
      }

      const isTextInput = target.closest(
        'input:not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select, [contenteditable]'
      );
      if (isTextInput) { setIsTextMode(true); return; }
      setIsTextMode(false);

      const interactiveEl = target.closest('[data-cursor]');
      if (interactiveEl) {
        const text = interactiveEl.getAttribute('data-cursor') || '';
        setCursorText(text.toUpperCase());
        setHasText(true);
        setIsHovered(true);
      } else {
        setHasText(false);
        const isLink = target.closest('a, button, [role="button"]');
        setIsHovered(!!isLink);
      }
    };

    const handleMouseDown = () => {
      setIsClicking(true);
      const ripple = { id: Date.now() + Math.random(), x: mouseRef.current.x, y: mouseRef.current.y };
      setRipples(p => [...p, ripple]);
      setTimeout(() => setRipples(p => p.filter(r => r.id !== ripple.id)), 450);
    };

    const handleMouseUp    = () => setIsClicking(false);
    const handleMouseLeave = () => setIsHidden(true);
    const handleMouseEnter = () => setIsHidden(false);

    window.addEventListener('mousemove',    handleMouseMove,  { passive: true });
    window.addEventListener('mousedown',    handleMouseDown,  { passive: true });
    window.addEventListener('mouseup',      handleMouseUp,    { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    document.addEventListener('mouseenter', handleMouseEnter, { passive: true });

    // Lean RAF loop — no layout reads inside, only style writes
    let rafId: number;
    const tick = () => {
      // ring lerps slower (trailing effect)
      ringPosRef.current.x += (mouseRef.current.x - ringPosRef.current.x) * 0.18;
      ringPosRef.current.y += (mouseRef.current.y - ringPosRef.current.y) * 0.18;
      // dot lerps fast (nearly instant)
      dotPosRef.current.x  += (mouseRef.current.x - dotPosRef.current.x)  * 0.6;
      dotPosRef.current.y  += (mouseRef.current.y - dotPosRef.current.y)  * 0.6;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPosRef.current.x}px,${ringPosRef.current.y}px,0)`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform  = `translate3d(${dotPosRef.current.x}px,${dotPosRef.current.y}px,0)`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      document.body.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove',    handleMouseMove);
      window.removeEventListener('mousedown',    handleMouseDown);
      window.removeEventListener('mouseup',      handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      cancelAnimationFrame(rafId);
    };
  }, []);   // ← empty deps: no re-runs that recreate the RAF loop

  if (isTouch === null || isTouch === true) return null;

  let ringClasses = styles.ring;
  if      (hasText)   ringClasses += ` ${styles.expanded}`;
  else if (isHovered) ringClasses += ` ${styles.hovered}`;

  return (
    <div className={`${styles.cursorWrapper} ${isHidden ? styles.hidden : ''} ${isClicking ? styles.clicking : ''} ${isTextMode ? styles.textMode : ''}`}>
      {ripples.map(r => (
        <div key={r.id} className={styles.rippleWrapper} style={{ transform: `translate3d(${r.x}px,${r.y}px,0)` }}>
          <div className={styles.rippleInner} />
        </div>
      ))}
      <div ref={ringRef} className={ringClasses}>
        <div className={styles.ringInner}>
          {hasText && <span className={styles.text}>{cursorText}</span>}
        </div>
      </div>
      <div ref={dotRef} className={styles.dot} />
    </div>
  );
}
