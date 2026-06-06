'use client';

import { useState, useEffect } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/ClientProviders';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import RecentlyViewed from '@/components/RecentlyViewed';
import ProductReviews from '@/components/ProductReviews';
import Loader from '@/components/Loader';
import { addRecentlyViewed } from '@/lib/recentlyViewed';
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
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });
  const router = useRouter();
  const { addToCart } = useCart();

  // Scroll to top on every product navigation
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [params.slug]);

  // Reset selected image when product changes
  useEffect(() => { setSelectedImage(0); }, [params.slug]);

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
        // Scraped products with no sizes stored (sizes={}) — treat as One Size
        // so the purchase flow is never blocked for already-imported products.
        const hasSizes = data.sizes && (
          (data.sizes.US && data.sizes.US.length > 0) ||
          (data.sizes.oneSize && data.sizes.oneSize.length > 0) ||
          Object.values(data.sizes).some((v: unknown) => Array.isArray(v) && (v as string[]).length > 0)
        );
        if (!hasSizes) {
          data.sizes = { oneSize: ['One Size'] };
          setSelectedSize('One Size');
        }
        setLoading(false);

        // Track in recently viewed
        if (data && data.id) {
          addRecentlyViewed({
            id: data.id,
            name: data.name,
            slug: data.slug,
            price: data.price,
            originalPrice: data.originalPrice ?? null,
            image: data.images?.[0] || '',
            brand: data.brand?.name || '',
          });
        }

        // Related products — same category, exclude current
        const category = data?.category;
        if (category) {
          fetch(`/api/products?category=${encodeURIComponent(category)}`)
            .then(res => res.json())
            .then((sameCat: Product[]) => {
              if (!Array.isArray(sameCat)) return;
              setRelatedProducts(sameCat.filter((p) => p.slug !== params.slug).slice(0, 4));
            })
            .catch(() => {});
        }
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
          <Loader label="LOADING" />
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

      {/* Size Guide Modal */}
      {sizeGuideOpen && (
        <div className={styles.sizeModalOverlay} onClick={() => setSizeGuideOpen(false)}>
          <div className={styles.sizeModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sizeModalHead}>
              <h3>SIZE <span className={styles.accent}>GUIDE</span></h3>
              <button className={styles.sizeModalClose} onClick={() => setSizeGuideOpen(false)} aria-label="Close size guide">✕</button>
            </div>

            <div className={styles.sizeChartBlock}>
              <h4>👟 SNEAKERS SIZE CHART</h4>
              <table className={styles.sizeTable}>
                <thead>
                  <tr><th>UK</th><th>US</th><th>EU</th></tr>
                </thead>
                <tbody>
                  <tr><td>6</td><td>7</td><td>40</td></tr>
                  <tr><td>7</td><td>8</td><td>41</td></tr>
                  <tr><td>8</td><td>9</td><td>42</td></tr>
                  <tr><td>9</td><td>10</td><td>43</td></tr>
                  <tr><td>10</td><td>11</td><td>44</td></tr>
                  <tr><td>11</td><td>12</td><td>45</td></tr>
                </tbody>
              </table>
            </div>

            <div className={styles.sizeChartBlock}>
              <h4>👕 CLOTHING SIZE CHART</h4>
              <table className={styles.sizeTable}>
                <thead>
                  <tr><th>SIZE</th><th>CHEST</th><th>WAIST</th></tr>
                </thead>
                <tbody>
                  <tr><td>S</td><td>36&quot;</td><td>30&quot;</td></tr>
                  <tr><td>M</td><td>38&quot;</td><td>32&quot;</td></tr>
                  <tr><td>L</td><td>40&quot;</td><td>34&quot;</td></tr>
                  <tr><td>XL</td><td>42&quot;</td><td>36&quot;</td></tr>
                  <tr><td>XXL</td><td>44&quot;</td><td>38&quot;</td></tr>
                </tbody>
              </table>
            </div>

            <p className={styles.sizeNote}>Sizes may vary slightly by brand. Need help? Chat with us on WhatsApp.</p>
          </div>
        </div>
      )}

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.gallery}>
            <div
              className={styles.mainImage}
              onMouseEnter={() => setZoom(z => ({ ...z, active: true }))}
              onMouseLeave={() => setZoom(z => ({ ...z, active: false }))}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setZoom({ active: true, x, y });
              }}
            >
              <div
                className={styles.zoomLayer}
                style={{
                  backgroundImage: `url(${product.images[selectedImage] || '/placeholder.jpg'})`,
                  backgroundPosition: `${zoom.x}% ${zoom.y}%`,
                  backgroundSize: zoom.active ? '210%' : 'cover',
                }}
              />
              {!zoom.active && (
                <span className={styles.zoomHint}>🔍 Hover to zoom</span>
              )}
              {product.originalPrice && <span className={styles.saleTag}>SALE</span>}
            </div>
            {product.images.length > 1 && (
              <div className={styles.thumbnails}>
                {product.images.map((img, idx) => (
                  <button key={idx} className={`${styles.thumbnail} ${selectedImage === idx ? styles.active : ''}`} onClick={() => setSelectedImage(idx)}>
                    <Image src={img} alt={`${product.name} view ${idx + 1}`} fill sizes="100px" />
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
              <Link href={`/products?category=${product.category}`}>{product.category}</Link>
              <span>/</span>
              <span className={styles.crumbCurrent}>{product.name}</span>
            </div>

            <Link href={`/products?category=${product.category}`} className={styles.backToCategory}>
              ← Back to {product.category}
            </Link>

            {product.brand ? (
              <Link href={`/products?brand=${product.brand.slug}`} className={styles.brand}>
                {product.brand.name}
              </Link>
            ) : (
              <span className={styles.brand}>Unbranded</span>
            )}

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
              <div className={styles.sizeLabelRow}>
                <label className={styles.sizeLabel}>
                  {product.sizes.oneSize ? 'SIZE' : 'SELECT SIZE (US)'} <span className={styles.required}>*</span>
                </label>
                <button type="button" className={styles.sizeGuideBtn} onClick={() => setSizeGuideOpen(true)}>
                  📏 SIZE GUIDE
                </button>
              </div>
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
                <div key={item.id} className={styles.relatedItem} onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); router.push(`/products/${item.slug}`); }}>                  <div className={styles.relatedImage}>
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

        {/* Reviews */}
        <ProductReviews slug={product.slug} />

        {/* Recently Viewed */}
        <RecentlyViewed currentSlug={product.slug} />
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
          <p>© 2026 UrbanEx. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}