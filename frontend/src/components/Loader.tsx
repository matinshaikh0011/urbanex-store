'use client';

import { useState, useEffect } from 'react';
import styles from './Loader.module.css';

export default function Loader({ label = 'LOADING' }: { label?: string }) {
  const [percent, setPercent] = useState(0);
  const [tagId, setTagId] = useState('UEX-000000');

  useEffect(() => {
    setTagId(`UEX-${Math.random().toString().slice(2, 8)}`);
    const timer = setInterval(() => {
      setPercent(p => {
        if (p >= 99) return 99;
        const jump = Math.random() > 0.7 ? Math.floor(Math.random() * 15) : 1;
        return Math.min(99, p + jump);
      });
    }, 120);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.wrap} role="status" aria-label={label}>
      <div className={styles.shippingTag}>
        <div className={styles.tagHeader}>
          <span className={styles.tagId}>ID: {tagId}</span>
          <span className={styles.tagStatus}>AUTH_PENDING</span>
        </div>
        
        <div className={styles.barcodeWrap}>
          <div className={styles.barcodeLines} />
          <div className={styles.scannerLine} />
        </div>

        <div className={styles.tagBody}>
          <div className={styles.glitchText} data-text="URBANEX">URBANEX</div>
          <div className={styles.progressRow}>
            <span className={styles.targetLabel}>{label}</span>
            <span className={styles.percentage}>{percent.toString().padStart(2, '0')}%</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className={styles.tagFooter}>
          <span>EST. 2026</span>
          <span className={styles.blink}>● REC</span>
        </div>
      </div>
    </div>
  );
}
