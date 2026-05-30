'use client';

import styles from './Loader.module.css';

export default function Loader({ label = 'LOADING' }: { label?: string }) {
  return (
    <div className={styles.wrap} role="status" aria-label={label}>
      {/* Orbiting neobrutalist cube loader */}
      <div className={styles.scene}>
        <div className={styles.ring} />
        <div className={styles.ring2} />
        <div className={styles.cube}>
          <span className={styles.face} data-f="front">UE</span>
          <span className={styles.face} data-f="back">UE</span>
          <span className={styles.face} data-f="right">UX</span>
          <span className={styles.face} data-f="left">UX</span>
          <span className={styles.face} data-f="top">★</span>
          <span className={styles.face} data-f="bottom">★</span>
        </div>
        <div className={styles.shadow} />
      </div>

      <div className={styles.label}>
        {label.split('').map((c, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.08}s` }}>{c === ' ' ? '\u00A0' : c}</span>
        ))}
      </div>
      <div className={styles.bar}><span /></div>
    </div>
  );
}
