'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './CustomerGallery.module.css';

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

interface GalleryItem {
  url: string;
  review: ApiReview;
}

function sourceLabel(source: string) {
  if (source === 'whatsapp') return '💬';
  if (source === 'instagram') return '📸';
  return '✓';
}

export default function CustomerGallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<GalleryItem | null>(null);

  useEffect(() => {
    fetch('/api/reviews?limit=50')
      .then(res => res.json())
      .then((reviews: ApiReview[]) => {
        if (!Array.isArray(reviews)) return setLoading(false);
        const all: GalleryItem[] = [];
        for (const r of reviews) {
          for (const url of r.imageUrls || []) all.push({ url, review: r });
          if (r.whatsappScreenshotUrl) all.push({ url: r.whatsappScreenshotUrl, review: r });
        }
        setItems(all.slice(0, 9));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <span className={styles.kicker}>SHARED BY CUSTOMERS</span>
        <h2 className={styles.title}>UNBOXED & <span className={styles.accent}>STYLED</span></h2>
        <p className={styles.sub}>Real photos from buyers · Tag us @urbanex.store</p>
      </div>

      <div className={styles.grid}>
        {items.map((item, i) => (
          <button key={i} className={styles.cell} onClick={() => setActive(item)} type="button">
            <Image src={item.url} alt={`Customer photo by ${item.review.customerName}`} fill sizes="(max-width: 540px) 50vw, 33vw" style={{ objectFit: 'cover' }} />
            <span className={styles.sourceBadge}>{sourceLabel(item.review.source)}</span>
            <div className={styles.overlay}>
              <span className={styles.overlayName}>{item.review.customerName}</span>
              <span className={styles.overlayMeta}>{'★'.repeat(item.review.rating)}</span>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div className={styles.lightbox} onClick={() => setActive(null)}>
          <button className={styles.lightboxClose} onClick={() => setActive(null)} aria-label="Close">✕</button>
          <div className={styles.lightboxCard} onClick={(e) => e.stopPropagation()}>
            <img className={styles.lightboxImg} src={active.url} alt={`Photo by ${active.review.customerName}`} />
            <div className={styles.lightboxBody}>
              <span className={styles.lightboxName}>{active.review.customerName}</span>
              <span>{'★'.repeat(active.review.rating)}{'☆'.repeat(5 - active.review.rating)}</span>
              <p className={styles.lightboxText}>&ldquo;{active.review.text}&rdquo;</p>
              {active.review.product && (
                <a href={`/products/${active.review.product.slug}`} style={{ fontSize: 12, color: 'var(--accent-primary)' }}>
                  Shop {active.review.product.name} →
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
