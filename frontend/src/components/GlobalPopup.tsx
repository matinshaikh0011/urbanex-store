'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import styles from './GlobalPopup.module.css';

export default function GlobalPopup() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Only show popup on homepage
    if (pathname !== '/') return;

    const timer = setTimeout(() => {
      setIsVisible(true);
      setIsLoaded(true);
    }, 7000);
    return () => clearTimeout(timer);
  }, [pathname]);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isLoaded) return null;

  return (
    <>
      {isVisible && <div className={styles.backdrop} onClick={handleClose} />}
      <div className={`${styles.popupWrapper} ${isVisible ? styles.visible : ''}`}>
        <div className={styles.popup}>
          <div className={styles.glow}></div>
          <div className={styles.content}>
            <div className={styles.icon}>⚠️</div>
            <h2 className={styles.headline}>STORE NOTICE</h2>

            <p className={styles.body}>
              To confirm your order, a small advance of <span className={styles.highlight}>₹300</span> is required. This ensures we reserve your pair exclusively for you.
            </p>

            <div className={styles.badge}>
              <span>💯</span> 100% Premium Pair Guaranteed
            </div>

            <p className={styles.body}>
              We deliver only verified and original products. Once your payment is confirmed, our team will process your order immediately.
            </p>

            <div className={styles.features}>
              <div className={styles.featureItem}>
                <span>✓</span> Original Packaging
              </div>
              <div className={styles.featureItem}>
                <span>✓</span> Bill Included
              </div>
              <div className={styles.featureItem}>
                <span>✓</span> 7-Day Return Policy
              </div>
            </div>

            <button className={styles.closeBtn} onClick={handleClose}>
              I UNDERSTAND
            </button>
          </div>
        </div>
      </div>
    </>
  );
}