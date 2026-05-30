'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './SocialProof.module.css';

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Surat', 'Pune', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Jaipur', 'Kolkata', 'Lucknow', 'Indore', 'Chandigarh', 'Nagpur'];
const PRODUCTS = [
  'Air Jordan 1 "Chicago"', 'Nike Dunk Low "Panda"', 'Rolex Submariner', 'Ray-Ban Wayfarer',
  'Yeezy Boost 350', 'Gucci Marmont Bag', 'Omega Speedmaster', 'New Balance 550',
  'Louis Vuitton Neverfull', 'Oakley Holbrook', 'Air Max 90', 'Cartier Tank',
  'Converse Chuck 70', 'Prada Re-Edition', 'TAG Heuer Carrera',
];
const NAMES = ['Rahul', 'Priya', 'Arjun', 'Sneha', 'Vikram', 'Ananya', 'Karan', 'Neha', 'Rohan', 'Aisha', 'Aditya', 'Meera'];

interface Toast { name: string; city: string; product: string; mins: number; }

function randomToast(): Toast {
  const r = (a: string[]) => a[Math.floor(Math.random() * a.length)];
  return {
    name: r(NAMES),
    city: r(CITIES),
    product: r(PRODUCTS),
    mins: Math.floor(Math.random() * 30) + 2,
  };
}

export default function SocialProof() {
  const [toast, setToast] = useState<Toast | null>(null);
  const [visible, setVisible] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Don't show on checkout/admin
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/checkout') || path.startsWith('/admin')) return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let stopped = false;

    const cycle = () => {
      if (stopped) return;
      setToast(randomToast());
      setVisible(true);
      // hide after 5s
      timers.current.push(setTimeout(() => setVisible(false), 5000));
      // next toast in 12-20s
      const next = 12000 + Math.random() * 8000;
      timers.current.push(setTimeout(cycle, next + 5000));
    };

    // first toast after 6s
    timers.current.push(setTimeout(cycle, 6000));

    return () => {
      stopped = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  if (!toast) return null;

  return (
    <div className={`${styles.toast} ${visible ? styles.show : ''}`} role="status" aria-live="polite">
      <span className={styles.icon}>🛍️</span>
      <div className={styles.body}>
        <span className={styles.line}>
          <strong>{toast.name}</strong> in <strong>{toast.city}</strong> just bought
        </span>
        <span className={styles.product}>{toast.product}</span>
        <span className={styles.time}>{toast.mins} minutes ago · ✅ Verified</span>
      </div>
      <button className={styles.close} onClick={() => setVisible(false)} aria-label="Dismiss">✕</button>
    </div>
  );
}
