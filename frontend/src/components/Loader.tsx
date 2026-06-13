'use client';

import styles from './Loader.module.css';

export default function Loader({ label = 'LOADING DROPS' }: { label?: string }) {
  return (
    <div className={styles.wrap} role="status" aria-label={label}>
      <div className={styles.stamp}>
        <span className={styles.word} data-text="URBANEX">URBANEX</span>
        <span className={styles.underline} />
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
