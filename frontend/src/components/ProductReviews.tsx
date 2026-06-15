'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import UrbanExVerified from './UrbanExVerified';
import styles from './ProductReviews.module.css';

interface ApiReview {
  id: number;
  customerName: string;
  rating: number;
  text: string;
  source: 'direct' | 'whatsapp' | 'instagram';
  imageUrls: string[];
  videoUrl: string | null;
  whatsappScreenshotUrl: string | null;
  approved: boolean;
  featured: boolean;
  displayDate: string;
  createdAt: string;
}

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className={styles.stars} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= value ? styles.starOn : styles.starOff}>★</span>
      ))}
    </span>
  );
}

function sourceLabel(source: string) {
  if (source === 'whatsapp') return '💬 WhatsApp';
  if (source === 'instagram') return '📸 Instagram';
  return '✓ Verified Purchase';
}

export default function ProductReviews({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reviews?productSlug=${encodeURIComponent(slug)}&limit=50`)
      .then(res => res.json())
      .then(data => {
        setReviews(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (!loading && reviews.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.head}>
          <h2 className={styles.title}>CUSTOMER <span className={styles.accent}>REVIEWS</span></h2>
        </div>
        <p className={styles.emptyState}>Be the first to share your experience. Message us on WhatsApp after delivery to add your review.</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>CUSTOMER <span className={styles.accent}>REVIEWS</span></h2>
        <UrbanExVerified variant="dark" size="sm" />
      </div>

      <div className={styles.summary}>
        <div className={styles.avgBox}>
          <span className={styles.avgNum}>{avg.toFixed(1)}</span>
          <Stars value={Math.round(avg)} size={20} />
          <span className={styles.reviewCount}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className={styles.list}>
        {reviews.map((r) => (
          <div key={r.id} className={styles.review}>
            <div className={styles.reviewTop}>
              <span className={styles.reviewName}>{r.customerName}</span>
              <span className={styles.verified}>{sourceLabel(r.source)}</span>
            </div>
            <div className={styles.reviewMeta}>
              <Stars value={r.rating} />
              <span className={styles.reviewDate}>{formatDate(r.displayDate)}</span>
            </div>
            <p className={styles.reviewText}>{r.text}</p>

            {(r.imageUrls.length > 0 || r.videoUrl || r.whatsappScreenshotUrl) && (
              <div className={styles.media}>
                {r.imageUrls.map((url, i) => (
                  <button key={i} className={styles.mediaThumb} onClick={() => setLightbox(url)} type="button">
                    <Image src={url} alt={`Review by ${r.customerName} - ${i + 1}`} fill sizes="80px" style={{ objectFit: 'cover' }} />
                  </button>
                ))}
                {r.whatsappScreenshotUrl && (
                  <button className={styles.mediaThumb} onClick={() => setLightbox(r.whatsappScreenshotUrl!)} type="button">
                    <Image src={r.whatsappScreenshotUrl} alt="WhatsApp screenshot" fill sizes="80px" style={{ objectFit: 'cover' }} />
                    <span className={styles.mediaBadge}>💬</span>
                  </button>
                )}
                {r.videoUrl && (
                  <a href={r.videoUrl} target="_blank" rel="noopener noreferrer" className={styles.mediaThumb}>
                    <span className={styles.videoIcon}>▶</span>
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          <button className={styles.lightboxClose} onClick={() => setLightbox(null)} aria-label="Close">✕</button>
          <img src={lightbox} alt="Review media" />
        </div>
      )}
    </section>
  );
}
