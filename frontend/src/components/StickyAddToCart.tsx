'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styles from './StickyAddToCart.module.css';

interface Props {
  image: string;
  name: string;
  price: number;
  selectedSize: string;
  onAdd: () => void;
  triggerSelector?: string;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(price);
}

export default function StickyAddToCart({ image, name, price, selectedSize, onAdd, triggerSelector = '[data-pdp-actions]' }: Props) {
  const [visible, setVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = document.querySelector(triggerSelector);
    if (!target) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '0px 0px -80px 0px' }
    );
    observerRef.current.observe(target);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [triggerSelector]);

  // Push the floating WhatsApp button above the bar while it's visible so
  // the two never overlap. Cleared on hide / unmount.
  useEffect(() => {
    const root = document.documentElement;
    const h = barRef.current?.offsetHeight ?? 0;
    if (visible && h > 0) {
      root.style.setProperty('--sticky-cart-clearance', `${h + 16}px`);
    } else {
      root.style.setProperty('--sticky-cart-clearance', '0px');
    }
    return () => {
      root.style.setProperty('--sticky-cart-clearance', '0px');
    };
  }, [visible]);

  return (
    <div ref={barRef} className={`${styles.bar} ${visible ? styles.barVisible : ''}`}>
      <div className={styles.thumb}>
        {image && <Image src={image} alt={name} fill sizes="44px" style={{ objectFit: 'cover' }} />}
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        <span className={styles.price}>{formatPrice(price)}</span>
      </div>
      <button className={styles.button} onClick={onAdd} disabled={!selectedSize}>
        {selectedSize ? 'ADD TO CART' : 'SELECT SIZE'}
      </button>
    </div>
  );
}
