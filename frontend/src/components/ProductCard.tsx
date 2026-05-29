'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from './ClientProviders';
import styles from './ProductCard.module.css';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number | null;
  images: string[];
  brand: { name: string; slug: string };
}

export default function ProductCard({ product }: { product: Product }) {
  const [isHovered, setIsHovered] = useState(false);
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();
  const cardRef = useRef<HTMLAnchorElement>(null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(price);
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

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    
    // Max rotation 12 degrees
    const rotateX = -((y - yc) / yc) * 12;
    const rotateY = ((x - xc) / xc) * 12;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
    card.style.transition = 'transform 0.1s ease, border-color 0.4s ease, box-shadow 0.4s ease';
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)';
    card.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.4s ease, box-shadow 0.4s ease';
  };

  return (
    <Link
      ref={cardRef}
      href={`/products/${product.slug}`}
      className={styles.card}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      data-cursor="view"
    >
      <div className={styles.imageWrapper}>
        <Image src={product.images[0] || '/placeholder.jpg'} alt={product.name} fill className={styles.image} sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw" />
        {product.originalPrice && <span className={styles.saleTag}>SALE</span>}
        <div className={`${styles.overlay} ${isHovered ? styles.visible : ''}`}>
          <button className={`${styles.quickAdd} ${added ? styles.added : ''}`} onClick={handleAddToCart}>
            {added ? '✓ ADDED' : 'QUICK ADD'}
          </button>
        </div>
      </div>
      <div className={styles.info}>
        <span className={styles.brand}>{product.brand.name}</span>
        <h3 className={styles.name}>{product.name}</h3>
        <div className={styles.priceRow}>
          <span className={styles.price}>{formatPrice(product.price)}</span>
          {product.originalPrice && <span className={styles.originalPrice}>{formatPrice(product.originalPrice)}</span>}
        </div>
      </div>
    </Link>
  );
}