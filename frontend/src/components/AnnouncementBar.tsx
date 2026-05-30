'use client';

import { useState, useEffect } from 'react';
import styles from './AnnouncementBar.module.css';

// Countdown target: 7 days from first visit (persisted so it doesn't reset each load)
const STORAGE_KEY = 'urbanex_flash_sale_end';
const DISMISS_KEY = 'urbanex_flash_sale_dismissed';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function getEndTime(): number {
  if (typeof window === 'undefined') return Date.now() + SEVEN_DAYS;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const n = parseInt(stored, 10);
    if (!Number.isNaN(n) && n > Date.now()) return n;
  }
  const end = Date.now() + SEVEN_DAYS;
  window.localStorage.setItem(STORAGE_KEY, String(end));
  return end;
}

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(false);
  const [remaining, setRemaining] = useState(SEVEN_DAYS);

  useEffect(() => {
    // Respect previous dismissal
    if (window.localStorage.getItem(DISMISS_KEY) === '1') return;
    setVisible(true);

    const end = getEndTime();
    const update = () => setRemaining(Math.max(0, end - Date.now()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    window.localStorage.setItem(DISMISS_KEY, '1');
  };

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  const message = '🔥 FLASH SALE — Extra 10% OFF on all orders above ₹5000 | Use code: URBANEX10';

  return (
    <div className={styles.bar} role="region" aria-label="Flash sale announcement">
      <div className={styles.inner}>
        {/* Desktop: static text. Mobile: marquee (handled via CSS) */}
        <div className={styles.messageWrap}>
          <span className={styles.message}>{message}</span>
          <span className={`${styles.message} ${styles.messageDup}`} aria-hidden>{message}</span>
        </div>

        <div className={styles.countdown} aria-label="Sale ends in">
          <span className={styles.countLabel}>ENDS IN</span>
          <span className={styles.timeBox}>{pad(days)}<i>d</i></span>
          <span className={styles.timeBox}>{pad(hours)}<i>h</i></span>
          <span className={styles.timeBox}>{pad(minutes)}<i>m</i></span>
          <span className={styles.timeBox}>{pad(seconds)}<i>s</i></span>
        </div>
      </div>

      <button className={styles.close} onClick={dismiss} aria-label="Dismiss announcement">
        ✕
      </button>
    </div>
  );
}
