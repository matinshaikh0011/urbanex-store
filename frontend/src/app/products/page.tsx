'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import ProductCard from '@/components/ProductCard';
import Loader from '@/components/Loader';
import styles from './page.module.css';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  images: string[];
  brand: { name: string; slug: string };
  category: string;
  subcategory?: string | null;
}

interface Brand {
  id: number;
  name: string;
  slug: string;
}

// Category to Brand mapping
const categoryBrands: Record<string, string[]> = {
  sneakers: ['nike', 'adidas', 'jordan', 'puma', 'new-balance', 'reebok', 'converse', 'vans', 'asics', 'skechers', 'fila'],
  watches: ['rolex', 'omega', 'hublot', 'tag-heuer', 'cartier'],
  glasses: ['ray-ban', 'oakley', 'gucci', 'prada'],
  handbags: ['louis-vuitton', 'gucci', 'michael-kors', 'prada'],
  clothing: ['nike', 'adidas', 'puma', 'under-armour', 'levis', 'hm'],
  'ua-batch': ['nike', 'adidas', 'jordan'],
  'luxury-watches': ['rolex', 'omega'],
};

// Subcategories per category (label + slug)
const categorySubcategories: Record<string, { slug: string; label: string }[]> = {
  watches: [
    { slug: 'mens-watches', label: "Men's Watches" },
    { slug: 'womens-watches', label: "Women's Watches" },
  ],
  glasses: [
    { slug: 'mens-glasses', label: "Men's Glasses" },
    { slug: 'womens-glasses', label: "Women's Glasses" },
  ],
  clothing: [
    { slug: 'track-pants', label: 'Track Pants' },
    { slug: 'jeans', label: 'Jeans' },
    { slug: 'shirts', label: 'Shirts' },
    { slug: 'tshirts', label: 'T-Shirts' },
    { slug: 'denims', label: 'Denims' },
  ],
};

// Overall price bounds for the slider (INR)
const PRICE_MIN = 0;
const PRICE_MAX = 600000;
const PRICE_STEP = 1000;

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const category = searchParams.get('category');
  const brandParam = searchParams.get('brand');
  const searchQuery = searchParams.get('search');
  const subcategoryParam = searchParams.get('subcategory');

  const [selectedBrand, setSelectedBrand] = useState<string>(brandParam || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(subcategoryParam || '');
  const [priceMin, setPriceMin] = useState(PRICE_MIN);
  const [priceMax, setPriceMax] = useState(PRICE_MAX);

  const formatINR = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L` : `₹${n.toLocaleString('en-IN')}`;

  // Subcategories for the active category
  const availableSubcategories = category ? (categorySubcategories[category] || []) : [];

  // Get brands relevant to current category
  const availableBrands = useMemo(() => {
    if (!category || !categoryBrands[category]) {
      return brands;
    }
    return brands.filter(b => categoryBrands[category]?.includes(b.slug));
  }, [brands, category]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/products').then(res => res.json()).catch(() => []),
      fetch('/api/brands').then(res => res.json()).catch(() => [])
    ])
    .then(([productsData, brandsData]) => {
      setProducts(Array.isArray(productsData) ? productsData : []);
      setBrands(Array.isArray(brandsData) ? brandsData : []);
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  // Reset filters when category/brand/subcategory changes via URL
  useEffect(() => {
    setSelectedBrand(brandParam || '');
    setSelectedSubcategory(subcategoryParam || '');
    setPriceMin(PRICE_MIN);
    setPriceMax(PRICE_MAX);
  }, [category, brandParam, subcategoryParam]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (category && category !== 'all') {
      // Case-insensitive comparison to handle mixed case from DB
      const catLower = category.toLowerCase();
      filtered = filtered.filter(p => p.category.toLowerCase() === catLower);
    }

    if (selectedSubcategory) {
      filtered = filtered.filter(p => p.subcategory === selectedSubcategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.brand.name.toLowerCase().includes(query)
      );
    }

    if (selectedBrand) {
      filtered = filtered.filter(p => p.brand.slug === selectedBrand);
    }

    filtered = filtered.filter(p => p.price >= priceMin && p.price <= priceMax);

    return filtered;
  }, [products, category, searchQuery, selectedBrand, selectedSubcategory, priceMin, priceMax]);

  const hasActiveFilters = !!selectedBrand || !!selectedSubcategory || priceMin > PRICE_MIN || priceMax < PRICE_MAX;

  const getPageTitle = () => {
    if (searchQuery) return `SEARCH: "${searchQuery}"`;
    if (category) {
      const titles: Record<string, string> = {
        sneakers: 'SNEAKERS',
        watches: 'LUXURY WATCHES',
        glasses: 'GLASSES',
        handbags: 'HANDBAGS',
        clothing: 'CLOTHING',
        'ua-batch': 'UA BATCH SNEAKERS',
        'luxury-watches': 'LUXURY WATCHES'
      };
      return titles[category] || 'PRODUCTS';
    }
    return 'ALL PRODUCTS';
  };

  const handleBrandClick = (slug: string) => {
    setSelectedBrand(selectedBrand === slug ? '' : slug);
  };

  const [showScrollTop, setShowScrollTop] = useState(false);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <GlobalPopup />
      <Header />
      <main className={styles.main}>
        {/* Animated Hero Banner */}
        <div className={styles.pageHero}>
          <div className={styles.pageHeroContent}>
            <h1 className={styles.pageHeroTitle}>
              {searchQuery ? (
                <>SEARCH: <span className="heroAccent">&quot;{searchQuery}&quot;</span></>
              ) : category ? (
                <><span className="heroAccent">{getPageTitle()}</span> COLLECTION</>
              ) : (
                <>ALL <span className="heroAccent">PRODUCTS</span></>
              )}
            </h1>
            {!loading && (
              <div className={styles.pageHeroCount}>
                <strong>{filteredProducts.length}</strong> ITEMS
              </div>
            )}
          </div>
        </div>

        <div className={styles.container}>
          {/* Mobile Filter Toggle */}
          <button
            className={styles.mobileFilterBtn}
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          >
            <span>🎛️ FILTERS</span>
            <span className={styles.filterCount}>
              {(selectedBrand ? 1 : 0) + (selectedSubcategory ? 1 : 0) + ((priceMin > PRICE_MIN || priceMax < PRICE_MAX) ? 1 : 0)}
            </span>
          </button>

          {/* Filters Panel */}
          <div className={`${styles.filtersPanel} ${mobileFiltersOpen ? styles.open : ''}`}>
            {/* Category Display */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>CATEGORY</label>
              <div className={styles.categoryTags}>
                <Link
                  href={`/products${category ? `?category=${category}` : ''}`}
                  className={`${styles.categoryTag} ${!category ? styles.active : ''}`}
                >
                  ALL
                </Link>
                <Link
                  href={`/products?category=sneakers`}
                  className={`${styles.categoryTag} ${category === 'sneakers' ? styles.active : ''}`}
                >
                  👟 Sneakers
                </Link>
                <Link
                  href={`/products?category=watches`}
                  className={`${styles.categoryTag} ${category === 'watches' ? styles.active : ''}`}
                >
                  ⌚ Luxury Watches
                </Link>
                <Link
                  href={`/products?category=glasses`}
                  className={`${styles.categoryTag} ${category === 'glasses' ? styles.active : ''}`}
                >
                  🕶️ Glasses
                </Link>
                <Link
                  href={`/products?category=handbags`}
                  className={`${styles.categoryTag} ${category === 'handbags' ? styles.active : ''}`}
                >
                  👜 Handbags
                </Link>
                <Link
                  href={`/products?category=clothing`}
                  className={`${styles.categoryTag} ${category === 'clothing' ? styles.active : ''}`}
                >
                  👕 Clothing
                </Link>
              </div>
            </div>

            {/* Subcategory Filter (only for categories that have them) */}
            {availableSubcategories.length > 0 && (
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>TYPE</label>
                <div className={styles.brandButtons}>
                  <button
                    className={`${styles.brandBtn} ${!selectedSubcategory ? styles.active : ''}`}
                    onClick={() => setSelectedSubcategory('')}
                  >
                    ALL
                  </button>
                  {availableSubcategories.map(sub => (
                    <button
                      key={sub.slug}
                      className={`${styles.brandBtn} ${selectedSubcategory === sub.slug ? styles.active : ''}`}
                      onClick={() => setSelectedSubcategory(selectedSubcategory === sub.slug ? '' : sub.slug)}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Brand Filter - Buttons */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>BRAND</label>
              <div className={styles.brandButtons}>
                <button
                  className={`${styles.brandBtn} ${!selectedBrand ? styles.active : ''}`}
                  onClick={() => setSelectedBrand('')}
                >
                  ALL
                </button>
                {availableBrands.map(brand => (
                  <button
                    key={brand.id}
                    className={`${styles.brandBtn} ${selectedBrand === brand.slug ? styles.active : ''}`}
                    onClick={() => handleBrandClick(brand.slug)}
                  >
                    {brand.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter — dual range slider */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>PRICE RANGE</label>
              <div className={styles.priceValues}>
                <span>{formatINR(priceMin)}</span>
                <span>{priceMax >= PRICE_MAX ? `${formatINR(PRICE_MAX)}+` : formatINR(priceMax)}</span>
              </div>
              <div
                className={styles.slider}
                style={{
                  ['--lo' as string]: `${(priceMin / PRICE_MAX) * 100}%`,
                  ['--hi' as string]: `${(priceMax / PRICE_MAX) * 100}%`,
                }}
              >
                <div className={styles.sliderTrack} />
                <div className={styles.sliderFill} />
                <input
                  type="range"
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={PRICE_STEP}
                  value={priceMin}
                  onChange={(e) => {
                    const v = Math.min(parseInt(e.target.value), priceMax - PRICE_STEP);
                    setPriceMin(v);
                  }}
                  className={styles.sliderInput}
                  aria-label="Minimum price"
                />
                <input
                  type="range"
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={PRICE_STEP}
                  value={priceMax}
                  onChange={(e) => {
                    const v = Math.max(parseInt(e.target.value), priceMin + PRICE_STEP);
                    setPriceMax(v);
                  }}
                  className={styles.sliderInput}
                  aria-label="Maximum price"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                className={styles.clearFilters}
                onClick={() => {
                  setSelectedBrand('');
                  setSelectedSubcategory('');
                  setPriceMin(PRICE_MIN);
                  setPriceMax(PRICE_MAX);
                }}
              >
                ✕ CLEAR ALL FILTERS
              </button>
            )}
          </div>

          {/* Products Content */}
          <div className={styles.content}>
            {loading ? (
              <Loader label="LOADING PRODUCTS" />
            ) : filteredProducts.length > 0 ? (
              <div className={styles.grid}>
                {filteredProducts.map((product, idx) => (
                  <ProductCard key={product.id} product={product} index={idx} />
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🔍</div>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search terms</p>
                <button
                  className={styles.resetBtn}
                  onClick={() => {
                    setSelectedBrand('');
                    setSelectedSubcategory('');
                    setPriceMin(PRICE_MIN);
                    setPriceMax(PRICE_MAX);
                  }}
                >
                  RESET FILTERS
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scroll to Top */}
        {showScrollTop && (
          <button className={styles.scrollTopBtn} onClick={scrollToTop} title="Back to top">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        )}
      </main>
    </>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <>
        <GlobalPopup />
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <Loader label="LOADING PRODUCTS" />
          </div>
        </main>
      </>
    }>
      <ProductsPageContent />
    </Suspense>
  );
}