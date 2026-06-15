import styles from './PdpTrustStrip.module.css';

const ITEMS = [
  { icon: '↩️', label: '7-DAY RETURNS', sub: 'Easy exchange' },
  { icon: '💵', label: 'COD AVAILABLE', sub: 'Pay on delivery' },
  { icon: '🔒', label: 'SECURE CHECKOUT', sub: 'Razorpay protected' },
  { icon: '🚚', label: 'FAST SHIPPING', sub: 'Dispatched in 24h' },
];

export default function PdpTrustStrip() {
  return (
    <div className={styles.strip}>
      {ITEMS.map((item) => (
        <div key={item.label} className={styles.item}>
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
          <span className={styles.subLabel}>{item.sub}</span>
        </div>
      ))}
    </div>
  );
}
