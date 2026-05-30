'use client';

import { useEffect, useState } from 'react';
import styles from './ProductReviews.module.css';

interface Review {
  name: string;
  rating: number;
  text: string;
  date: string;
  verified: boolean;
}

const SAMPLE_REVIEWS: Review[] = [
  { name: 'Rahul S.', rating: 5, text: 'Amazing quality! Exactly as described. Fast delivery too.', date: '2026-04-18', verified: true },
  { name: 'Priya M.', rating: 5, text: 'Love it! Great packaging and authentic product.', date: '2026-04-10', verified: true },
  { name: 'Arjun K.', rating: 4, text: 'Good product, slightly delayed delivery but worth it.', date: '2026-03-29', verified: true },
];

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className={styles.stars} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= value ? styles.starOn : styles.starOff}>★</span>
      ))}
    </span>
  );
}

export default function ProductReviews({ slug }: { slug: string }) {
  const storageKey = `urbanex_reviews_${slug}`;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', rating: 0, text: '' });
  const [hoverStar, setHoverStar] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const custom: Review[] = saved ? JSON.parse(saved) : [];
      setReviews([...custom, ...SAMPLE_REVIEWS]);
    } catch {
      setReviews(SAMPLE_REVIEWS);
    }
  }, [storageKey]);

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
    : 0;

  const submitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.rating === 0 || !form.text.trim()) {
      alert('Please fill in your name, a star rating, and your review.');
      return;
    }
    // Format name as "First L."
    const parts = form.name.trim().split(/\s+/);
    const displayName = parts.length > 1
      ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
      : parts[0];

    const newReview: Review = {
      name: displayName,
      rating: form.rating,
      text: form.text.trim(),
      date: new Date().toISOString().slice(0, 10),
      verified: true,
    };
    try {
      const saved = localStorage.getItem(storageKey);
      const custom: Review[] = saved ? JSON.parse(saved) : [];
      const updated = [newReview, ...custom];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setReviews([newReview, ...reviews]);
    } catch {
      setReviews([newReview, ...reviews]);
    }
    setForm({ name: '', rating: 0, text: '' });
    setModalOpen(false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>CUSTOMER <span className={styles.accent}>REVIEWS</span></h2>
        <button className={styles.writeBtn} onClick={() => setModalOpen(true)}>✍️ WRITE A REVIEW</button>
      </div>

      <div className={styles.summary}>
        <div className={styles.avgBox}>
          <span className={styles.avgNum}>{avg.toFixed(1)}</span>
          <Stars value={Math.round(avg)} size={20} />
          <span className={styles.reviewCount}>{reviews.length} reviews</span>
        </div>
      </div>

      <div className={styles.list}>
        {reviews.map((r, i) => (
          <div key={i} className={styles.review}>
            <div className={styles.reviewTop}>
              <span className={styles.reviewName}>{r.name}</span>
              {r.verified && <span className={styles.verified}>✓ Verified Purchase</span>}
            </div>
            <div className={styles.reviewMeta}>
              <Stars value={r.rating} />
              <span className={styles.reviewDate}>{formatDate(r.date)}</span>
            </div>
            <p className={styles.reviewText}>{r.text}</p>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3>WRITE A <span className={styles.accent}>REVIEW</span></h3>
              <button className={styles.modalClose} onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={submitReview} className={styles.form}>
              <label className={styles.label}>Your Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className={styles.input}
              />

              <label className={styles.label}>Your Rating *</label>
              <div className={styles.starPicker}>
                {[1, 2, 3, 4, 5].map(i => (
                  <button
                    type="button"
                    key={i}
                    className={(hoverStar || form.rating) >= i ? styles.pickOn : styles.pickOff}
                    onClick={() => setForm({ ...form, rating: i })}
                    onMouseEnter={() => setHoverStar(i)}
                    onMouseLeave={() => setHoverStar(0)}
                  >★</button>
                ))}
              </div>

              <label className={styles.label}>Your Review *</label>
              <textarea
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                placeholder="Share your experience with this product..."
                rows={4}
                className={styles.textarea}
              />

              <button type="submit" className={styles.submitBtn}>SUBMIT REVIEW</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
