'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './HomeReviewsCarousel.module.css';

interface ApiReview {
  id: number;
  customerName: string;
  rating: number;
  text: string;
  source: 'direct' | 'whatsapp' | 'instagram';
  imageUrls: string[];
  whatsappScreenshotUrl: string | null;
  displayDate: string;
  product?: { id: number; name: string; slug: string; image: string | null } | null;
}

function Stars({ value }: { value: number }) {
  return (
    <span className={styles.stars}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= value ? styles.starOn : styles.starOff}>★</span>
      ))}
    </span>
  );
}

function sourceLabel(source: string) {
  if (source === 'whatsapp') return '💬 WhatsApp';
  if (source === 'instagram') return '📸 Instagram';
  return '✓ Verified';
}

export default function HomeReviewsCarousel() {
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reviews?featured=true&limit=12')
      .then(res => res.json())
      .then(data => {
        setReviews(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (reviews.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <span className={styles.kicker}>REAL CUSTOMERS</span>
        <h2 className={styles.title}>WHAT THEY <span className={styles.accent}>SAY</span></h2>
        <p className={styles.sub}>Verified reviews from WhatsApp, Instagram and direct buyers</p>
      </div>

      <div className={styles.track}>
        <div className={styles.scroll}>
          {reviews.map((r) => (
            <article key={r.id} className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.name}>{r.customerName}</span>
                <span className={styles.source}>{sourceLabel(r.source)}</span>
              </div>
              <Stars value={r.rating} />
              <p className={styles.text}>&ldquo;{r.text}&rdquo;</p>

              {(r.imageUrls.length > 0 || r.whatsappScreenshotUrl) && (
                <div className={styles.media}>
                  {r.imageUrls.slice(0, 3).map((url, i) => (
                    <div key={i} className={styles.mediaThumb}>
                      <Image src={url} alt={`Review media ${i + 1}`} fill sizes="56px" style={{ objectFit: 'cover' }} />
                    </div>
                  ))}
                  {r.whatsappScreenshotUrl && (
                    <div className={styles.mediaThumb}>
                      <Image src={r.whatsappScreenshotUrl} alt="WhatsApp screenshot" fill sizes="56px" style={{ objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              )}

              {r.product && (
                <Link href={`/products/${r.product.slug}`} className={styles.product}>
                  <div className={styles.productThumb}>
                    {r.product.image && (
                      <Image src={r.product.image} alt={r.product.name} fill sizes="32px" style={{ objectFit: 'cover' }} />
                    )}
                  </div>
                  <span>on {r.product.name}</span>
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
