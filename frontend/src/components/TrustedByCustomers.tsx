import { TRUST_STATS } from '@/lib/trustConfig';
import styles from './TrustedByCustomers.module.css';

function Stars({ value, scale = 5 }: { value: number; scale?: number }) {
  const full = Math.floor(value);
  return (
    <span className={styles.stars} aria-label={`${value} out of ${scale} stars`}>
      {Array.from({ length: scale }).map((_, i) => (
        <span key={i} className={i < full ? '' : styles.starOff}>★</span>
      ))}
    </span>
  );
}

export default function TrustedByCustomers() {
  const s = TRUST_STATS;
  return (
    <section className={styles.section} aria-label="Trusted by customers">
      <div className={styles.inner}>
        <div className={styles.statBlock}>
          <span className={styles.kicker}>Customer Rating</span>
          <span className={styles.ratingNum}>{s.rating.toFixed(1)}<span className={styles.statSuffix}>/{s.ratingScale}</span></span>
          <Stars value={s.rating} scale={s.ratingScale} />
          <span className={styles.ratingMeta}>Average across verified buyers</span>
        </div>

        <div className={styles.statBlock}>
          <span className={styles.kicker}>Trusted Across India</span>
          <span className={styles.statNum}>{s.happyCustomers.toLocaleString('en-IN')}<span className={styles.statSuffix}>+</span></span>
          <span className={styles.statLabel}>Happy Customers</span>
        </div>

        <div className={styles.statBlock}>
          <span className={styles.kicker}>Delivered Nationwide</span>
          <span className={styles.statNum}>{s.ordersDelivered.toLocaleString('en-IN')}<span className={styles.statSuffix}>+</span></span>
          <span className={styles.statLabel}>Orders Delivered</span>
        </div>
      </div>
    </section>
  );
}
