'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from './ClientProviders';
import { useWishlist } from './WishlistProvider';
import { cld, SHOWCASE_4x5 } from '@/lib/cloudinary';
import styles from './ShowcaseCard.module.css';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number | null;
  images: string[];
  brand?: { name: string; slug: string } | null;
  category?: string;
}

// 'float'   — transparent, product floats on the slab (soft contact shadow)
// 'plate'   — product sits on a subtle neutral rounded plate
// 'refined' — the current card, but lighter: thin border, no hard shadow
export type ShowcaseVariant = 'float' | 'plate' | 'refined';

export default function ShowcaseCard({
  product,
  index = 0,
  variant = 'float',
  tone = 'light',
}: {
  product: Product;
  index?: number;
  variant?: ShowcaseVariant;
  tone?: 'light' | 'dark';
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [added, setAdded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { addToCart } = useCart();
  const { has, toggle } = useWishlist();
  const cardRef = useRef<HTMLAnchorElement>(null);

  const inWishlist = has(product.id);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(price);

  // Homepage presentation cleanup: scraped names are noisy (underscores,
  // dot-separators, ALL-CAPS codes, glued words, trailing SKU bits). Tidy
  // them into a clean editorial label without touching underlying data.
  const displayName = (raw: string): string => {
    let s = raw
      .replace(/[._]+/g, ' ')              // dots/underscores → spaces
      .replace(/-+/g, ' ')                  // hyphens → spaces
      .replace(/\(\s*\d+\s*\)/g, ' ')       // "(1154)" codes
      .replace(/\b[A-Z0-9]*\d[A-Z0-9]*\b/g, ' ') // alphanumeric SKU tokens (have a digit)
      .replace(/\bwith\b.*$/i, '')          // drop "With OriginalBox DustCover…" tails
      .replace(/\s+/g, ' ')                  // collapse whitespace
      .trim();
    s = s.replace(/^sale\s+/i, '').trim();  // strip leading "sale"
    // Split glued CamelCase words: "ShoulderBag" → "Shoulder Bag"
    s = s.replace(/([a-z])([A-Z])/g, '$1 $2');
    // Normalise ALL-CAPS tokens to Title Case, keep short acronyms (≤3) as-is
    s = s
      .split(' ')
      .filter(Boolean)
      .map((w) =>
        w.length > 3 && w === w.toUpperCase()
          ? w.charAt(0) + w.slice(1).toLowerCase()
          : w
      )
      .join(' ');
    return s.trim();
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      originalPrice: product.originalPrice ?? null,
      image: product.images[0],
      brand: product.brand?.name || 'Unbranded',
      category: product.category,
    });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      size: '8',
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Link
      ref={cardRef}
      href={`/products/${product.slug}`}
      className={`${styles.card} ${styles[variant]} ${styles.reveal} ${revealed ? styles.revealed : ''}`}
      data-tone={tone}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-cursor="view"
    >
      <div className={styles.stage}>
        <div className={styles.imageWrap}>
          <Image
            src={cld(product.images[0], SHOWCASE_4x5) || '/placeholder.jpg'}
            alt={product.name}
            fill
            className={styles.image}
            sizes="(max-width: 600px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
          {product.images[1] && (
            <Image
              src={cld(product.images[1], SHOWCASE_4x5)}
              alt={`${product.name} alternate view`}
              fill
              className={`${styles.image} ${styles.secondImage}`}
              sizes="(max-width: 600px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          )}
        </div>

        {/* Wishlist — ghost circle, top-right */}
        <button
          className={`${styles.wishlistBtn} ${inWishlist ? styles.wishlisted : ''}`}
          onClick={handleWishlist}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {inWishlist ? '♥' : '♡'}
        </button>

        {/* Quick add — desktop reveal on hover */}
        <button
          className={`${styles.quickAdd} ${isHovered ? styles.quickAddVisible : ''} ${added ? styles.added : ''}`}
          onClick={handleAddToCart}
          aria-label={added ? 'Added to cart' : 'Add to cart'}
        >
          {added ? 'ADDED ✓' : 'QUICK ADD'}
        </button>
      </div>

      <div className={styles.info}>
        {product.brand && <span className={styles.brand}>{product.brand.name}</span>}
        <h3 className={styles.name}>{displayName(product.name)}</h3>
        <div className={styles.priceRow}>
          <span className={styles.price}>{formatPrice(product.price)}</span>
          {/* Touch-only compact add icon (mobile) */}
          <button
            className={`${styles.touchAdd} ${added ? styles.touchAdded : ''}`}
            onClick={handleAddToCart}
            aria-label={added ? 'Added to cart' : 'Add to cart'}
          >
            {added ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}
