'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from './ClientProviders';
import { useWishlist } from './WishlistProvider';
import styles from './ProductCard.module.css';

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

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const [added, setAdded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { addToCart } = useCart();
  const { has, toggle } = useWishlist();
  const cardRef = useRef<HTMLAnchorElement>(null);

  const inWishlist = has(product.id);

  // Scroll-reveal: animate the card in when it enters the viewport
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(price);
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

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <Link
      ref={cardRef}
      href={`/products/${product.slug}`}
      className={`${styles.card} ${styles.reveal} ${revealed ? styles.revealed : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      data-cursor="view"
    >
      <div className={styles.imageWrapper}>
        <Image src={product.images[0] || '/placeholder.jpg'} alt={product.name} fill className={styles.image} sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw" />
        {product.images[1] && (
          <Image src={product.images[1]} alt={`${product.name} alternate view`} fill className={`${styles.image} ${styles.secondImage}`} sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw" />
        )}
        {product.originalPrice && <span className={styles.saleTag}>SALE</span>}
        <button
          className={`${styles.wishlistBtn} ${inWishlist ? styles.wishlisted : ''}`}
          onClick={handleWishlist}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {inWishlist ? '♥' : '♡'}
        </button>
        <div className={`${styles.overlay} ${isHovered ? styles.visible : ''}`}>
          <button className={`${styles.quickAdd} ${added ? styles.added : ''}`} onClick={handleAddToCart}>
            {added ? '✓ ADDED' : 'QUICK ADD'}
          </button>
        </div>
      </div>
      <div className={styles.info}>
        {product.brand && <span className={styles.brand}>{product.brand.name}</span>}
        <h3 className={styles.name}>{product.name}</h3>
        <div className={styles.priceRow}>
          <span className={styles.price}>{formatPrice(product.price)}</span>
          {product.originalPrice && <span className={styles.originalPrice}>{formatPrice(product.originalPrice)}</span>}
          {/* Touch devices have no hover. A compact icon add-button sits at
              the end of the price row — keeps the image fully visible and
              adds no extra height to the card. Hidden on hover devices. */}
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