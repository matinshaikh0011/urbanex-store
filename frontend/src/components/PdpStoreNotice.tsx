'use client';

import styles from './PdpStoreNotice.module.css';

/**
 * PDP STORE NOTICE — inline, always-visible banner shown above the
 * Add to Cart / Buy Now buttons on the product detail page.
 *
 * Replaces the homepage GlobalPopup modal. Showing the ₹300 advance
 * notice at purchase decision time (on the PDP) is more relevant than
 * blocking the homepage with a full-screen modal.
 *
 * No dismiss/modal logic needed — it's part of the page layout.
 */
export default function PdpStoreNotice() {
  return (
    <div className={styles.notice} role="note" aria-label="Store notice">
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden>⚠️</span>
        <span className={styles.title}>STORE NOTICE</span>
      </div>

      <p className={styles.body}>
        A small advance of{' '}
        <strong className={styles.highlight}>₹300</strong>{' '}
        is required to confirm your order. This reserves your item exclusively for you.
      </p>

      <div className={styles.features}>
        <span className={styles.feature}><span className={styles.check}>✓</span>Original Packaging</span>
        <span className={styles.feature}><span className={styles.check}>✓</span>Bill Included</span>
        <span className={styles.feature}><span className={styles.check}>✓</span>7-Day Returns</span>
        <span className={styles.feature}><span className={styles.check}>✓</span>100% Premium</span>
      </div>
    </div>
  );
}
