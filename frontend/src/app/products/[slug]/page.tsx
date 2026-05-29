'use client';

import { useState, useEffect } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/ClientProviders';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import styles from './page.module.css';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  images: string[];
  brand: { name: string; slug: string };
  description: string;
  sizes: { US?: string[]; oneSize?: string[] };
  colors: { name: string; hex: string }[];
  category: string;
  inStock: boolean;
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { addToCart } = useCart();

  useEffect(() => {
    setMounted(true);
    setLoading(true);
    fetch(`/api/products/${params.slug}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        // Auto-select size for oneSize products
        if (data.sizes?.oneSize) {
          setSelectedSize(data.sizes.oneSize[0]);
        }
        setLoading(false);

        // Fetch recommendations using the product's REAL category
        const category = data?.category;
        fetch('/api/products')
          .then(res => res.json())
          .then((all: Product[]) => {
            if (!Array.isArray(all)) return;
            const others = all.filter((p) => p.slug !== params.slug);
            // Prefer same category, then top up with other picks
            const sameCat = others.filter((p) => p.category === category);
            const rest = others.filter((p) => p.category !== category);
            const combined = [...sameCat, ...rest].slice(0, 4);
            setRelatedProducts(combined);
          })
          .catch(() => {});
      })
      .catch(() => {
        setLoading(false);
      });
  }, [params.slug]);

  if (loading) {
    return (
      <>
        <GlobalPopup />
        <Header />
        <main className={styles.main}>
          <div className={styles.loading}>Loading...</div>
        </main>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <GlobalPopup />
        <Header />
        <main className={styles.main}>
          <div className={styles.notFound}>Product not found</div>
        </main>
      </>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(price);
  };

  const handleAddToCart = () => {
    if (!selectedSize) return;

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      size: selectedSize,
      quantity: 1,
    });

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!selectedSize) return;
    router.push(`/checkout?product=${product.slug}&size=${selectedSize}`);
  };

  return (
    <>
      <GlobalPopup />
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.gallery}>
            <div className={styles.mainImage}>
              <Image
                src={product.images[selectedImage] || '/placeholder.jpg'}
                alt={product.name}
                fill
                className={styles.image}
                priority
              />
              {product.originalPrice && <span className={styles.saleTag}>SALE</span>}
              <div className={styles.imageOverlay}></div>
            </div>
            {product.images.length > 1 && (
              <div className={styles.thumbnails}>
                {product.images.map((img, idx) => (
                  <button key={idx} className={`${styles.thumbnail} ${selectedImage === idx ? styles.active : ''}`} onClick={() => setSelectedImage(idx)}>
                    <Image src={img} alt={`View ${idx + 1}`} fill />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.details}>
            <div className={styles.breadcrumb}>
              <Link href="/">Home</Link>
              <span>/</span>
              <Link href="/products">Shop</Link>
              <span>/</span>
              <Link href={`/products?brand=${product.brand.slug}`}>{product.brand.name}</Link>
              <span>/</span>
              <span>{product.name}</span>
            </div>

            <Link href={`/products?brand=${product.brand.slug}`} className={styles.brand}>
              {product.brand.name}
            </Link>

            <h1 className={styles.name}>{product.name}</h1>

            <div className={styles.priceRow}>
              <span className={styles.price}>{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <>
                  <span className={styles.originalPrice}>{formatPrice(product.originalPrice)}</span>
                  <span className={styles.discount}>{Math.round((1 - product.price / product.originalPrice) * 100)}% OFF</span>
                </>
              )}
            </div>

            <p className={styles.description}>{product.description}</p>

            <div className={styles.sizeSection}>
              <label className={styles.sizeLabel}>
                {product.sizes.oneSize ? 'SIZE' : 'SELECT SIZE (US)'} <span className={styles.required}>*</span>
              </label>
              <div className={styles.sizeGrid}>
                {(product.sizes.US || product.sizes.oneSize || []).map((size: string) => (
                  <button key={size} className={`${styles.sizeBtn} ${selectedSize === size ? styles.selected : ''}`} onClick={() => setSelectedSize(size)}>
                    {size}
                  </button>
                ))}
              </div>
              {selectedSize && <p className={styles.selectedSize}>Size {selectedSize} selected</p>}
            </div>

            <div className={styles.actions}>
              <button className={`${styles.addToCartBtn} ${addedToCart ? styles.added : ''}`} onClick={handleAddToCart} disabled={!selectedSize}>
                {addedToCart ? '✓ ADDED TO CART' : 'ADD TO CART'}
              </button>
              <button className={styles.buyNowBtn} onClick={handleBuyNow} disabled={!selectedSize}>
                BUY NOW
              </button>
            </div>

            <a 
              href={`https://wa.me/919898285850?text=Hi, I would like to request a live video call for ${encodeURIComponent(product.name)}`}
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.videoCallBtn}
            >
              📹 REQUEST A LIVE VIDEO CALL
            </a>

            <div className={styles.features}>
              <div className={styles.feature}><span>✓</span> 100% Premium Guaranteed</div>
              <div className={styles.feature}><span>✓</span> Original Packaging</div>
              <div className={styles.feature}><span>✓</span> Bill Included</div>
              <div className={styles.feature}><span>✓</span> Fast Shipping</div>
              <div className={styles.feature}><span>✓</span> 7-Day Return Policy</div>
            </div>

            <div className={styles.info}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Category</span>
                <span className={styles.infoValue}>{product.category}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Availability</span>
                <span className={`${styles.infoValue} ${product.inStock ? styles.inStock : styles.outOfStock}`}>
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
            </div>

            <div className={styles.contact}>
              <p>Need help? <a href="https://wa.me/919898285850" target="_blank" rel="noopener">Chat on WhatsApp</a></p>
            </div>
          </div>
        </div>

        {/* You May Also Like */}
        {relatedProducts.length > 0 && (
          <div className={styles.relatedSection}>
            <div className={styles.relatedHead}>
              <span className={styles.relatedKicker}>HANDPICKED FOR YOU</span>
              <h2 className={styles.relatedTitle}>YOU MAY <span className={styles.accent}>ALSO LIKE</span></h2>
            </div>
            <div className={styles.relatedGrid}>
              {relatedProducts.map((item) => (
                <div key={item.id} className={styles.relatedItem} onClick={() => router.push(`/products/${item.slug}`)}>
                  <div className={styles.relatedImage}>
                    <img src={item.images[0]} alt={item.name} />
                    {item.originalPrice && <span className={styles.relatedSale}>SALE</span>}
                    <span className={styles.relatedView}>VIEW PRODUCT →</span>
                  </div>
                  <div className={styles.relatedInfo}>
                    <span className={styles.relatedBrand}>{item.brand?.name}</span>
                    <span className={styles.relatedName}>{item.name}</span>
                    <div className={styles.relatedPriceRow}>
                      <span className={styles.relatedPrice}>{formatPrice(item.price)}</span>
                      {item.originalPrice && (
                        <span className={styles.relatedOriginal}>{formatPrice(item.originalPrice)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <span className={styles.footerLogo}>URBAN<span className={styles.logoAccent}>EX</span></span>
            <p className={styles.footerTagline}>100% Premium Streetwear</p>
          </div>
          <div className={styles.footerLinks}>
            <Link href="/about">About Us</Link>
            <Link href="/track-order">Track Order</Link>
            <Link href="/return-exchange">Returns</Link>
            <p>WhatsApp: +91 9898285850</p>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© 2024 UrbanEx. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}