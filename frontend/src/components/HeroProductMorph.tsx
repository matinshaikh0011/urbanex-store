'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './HeroProductMorph.module.css';

interface ProductItem {
  image: string;
  label: string;
  href: string;
}

const PRODUCTS: ProductItem[] = [
  { image: '/hero-morph-handbag.png', label: 'HANDBAGS', href: '/handbags' },
  { image: '/hero-morph-sneakers.png', label: 'SNEAKERS', href: '/sneakers' },
  { image: '/hero-morph-glasses.png', label: 'GLASSES', href: '/glasses' },
  { image: '/hero-morph-watch.png', label: 'WATCHES', href: '/watches' },
];

const DISPLAY_DURATION = 3000; // ms each product shows
const SPIN_DURATION = 700;    // ms for the spin animation

export default function HeroProductMorph() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [labelState, setLabelState] = useState<'entering' | 'idle' | 'exiting'>('entering');
  const [imageState, setImageState] = useState<'entering' | 'idle'>('entering');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerMorph = useCallback(() => {
    // Start label exit
    setLabelState('exiting');

    // After label exits, start spin
    setTimeout(() => {
      setIsSpinning(true);

      // Halfway through spin, swap the product
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % PRODUCTS.length);
        setImageState('entering');
      }, SPIN_DURATION / 2);

      // After spin completes, reset states
      setTimeout(() => {
        setIsSpinning(false);
        setLabelState('entering');
        setImageState('idle');

        // After a beat, set label to idle
        setTimeout(() => setLabelState('idle'), 500);
      }, SPIN_DURATION);

    }, 300); // small delay for label exit
  }, []);

  useEffect(() => {
    // Set label to idle after initial entering animation
    const initialTimeout = setTimeout(() => setLabelState('idle'), 500);
    return () => clearTimeout(initialTimeout);
  }, []);

  useEffect(() => {
    // Auto-cycle timer
    timeoutRef.current = setTimeout(triggerMorph, DISPLAY_DURATION);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, triggerMorph]);

  const handleDotClick = (index: number) => {
    if (index === currentIndex || isSpinning) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setLabelState('exiting');
    setTimeout(() => {
      setIsSpinning(true);
      setTimeout(() => {
        setCurrentIndex(index);
        setImageState('entering');
      }, SPIN_DURATION / 2);
      setTimeout(() => {
        setIsSpinning(false);
        setLabelState('entering');
        setImageState('idle');
        setTimeout(() => setLabelState('idle'), 500);
      }, SPIN_DURATION);
    }, 300);
  };

  const product = PRODUCTS[currentIndex];

  return (
    <div className={styles.morphContainer}>
      {/* Aura glow ring */}
      <div className={styles.auraRing}></div>

      {/* 3D spinning viewport */}
      <div
        className={`${styles.morphViewport} ${isSpinning ? styles.spinning : styles.idle}`}
      >
        <div className={styles.productPanel}>
          <img
            src={product.image}
            alt={product.label}
            className={`${styles.productImage} ${imageState === 'entering' ? styles.entering : ''}`}
            draggable={false}
          />
        </div>
        {/* Shine sweep */}
        <div className={styles.shineSweep}></div>
      </div>

      {/* Shadow */}
      <div className={styles.morphShadow}></div>

      {/* Category label */}
      <div className={styles.categoryLabel}>
        <span
          className={`${styles.categoryName} ${labelState === 'entering' ? styles.entering : ''} ${labelState === 'exiting' ? styles.exiting : ''}`}
        >
          {product.label}
        </span>
        <span className={styles.categoryLine}></span>
      </div>

      {/* Progress dots */}
      <div className={styles.progressDots}>
        {PRODUCTS.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === currentIndex ? styles.active : ''}`}
            onClick={() => handleDotClick(i)}
            aria-label={`Show ${PRODUCTS[i].label}`}
          />
        ))}
      </div>
    </div>
  );
}
