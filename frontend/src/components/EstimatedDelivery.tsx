'use client';

import { useState } from 'react';
import styles from './EstimatedDelivery.module.css';

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function estimateDays(pincode: string): { min: number; max: number; zone: string } {
  const prefix = parseInt(pincode.slice(0, 2), 10);
  // Metros (approx): Mumbai 40, Delhi 11, Bangalore 56, Hyderabad 50, Kolkata 70, Chennai 60, Pune 41, Ahmedabad 38
  const metros = [11, 40, 41, 38, 50, 56, 60, 70];
  if (metros.includes(prefix)) return { min: 2, max: 4, zone: 'Metro' };
  // North-East + Far regions (J&K 18-19, NE 78-79, A&N 74, Lakshadweep 68)
  const remote = [18, 19, 74, 78, 79];
  if (remote.includes(prefix)) return { min: 6, max: 9, zone: 'Remote area' };
  return { min: 4, max: 6, zone: 'Standard zone' };
}

export default function EstimatedDelivery() {
  const [pincode, setPincode] = useState('');
  const [result, setResult] = useState<{ min: Date; max: Date; zone: string } | null>(null);
  const [error, setError] = useState('');

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      setError('Enter a valid 6-digit pincode');
      setResult(null);
      return;
    }
    setError('');
    const { min, max, zone } = estimateDays(pincode);
    const now = new Date();
    const minDate = new Date(now);
    minDate.setDate(now.getDate() + min);
    const maxDate = new Date(now);
    maxDate.setDate(now.getDate() + max);
    setResult({ min: minDate, max: maxDate, zone });
  };

  return (
    <div className={styles.wrap}>
      <span className={styles.icon}>🚚</span>
      <div className={styles.body}>
        <span className={styles.title}>Estimated Delivery</span>
        {result ? (
          <span className={styles.eta}>
            <span className={styles.etaHighlight}>{formatDate(result.min)} – {formatDate(result.max)}</span> · {result.zone}
          </span>
        ) : (
          <form className={styles.form} onSubmit={handleCheck}>
            <input
              className={styles.input}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
            />
            <button className={styles.button} type="submit">Check</button>
          </form>
        )}
        {error && <span className={styles.error}>{error}</span>}
      </div>
    </div>
  );
}
