'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import ProductCard from '@/components/ProductCard';
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
}

interface Brand {
  id: number;
  name: string;
  slug: string;
}

// Category to Brand mapping
const categoryBrands: Record<string, string[]> = {
  sneakers: ['nike', 'adidas', 'jordan', 'puma', 'new-balance', 'reebok', 'converse', 'vans', 'asics', 'skechers'],
  watches: ['rolex', 'omega', 'hublot'],
  glasses: ['ray-ban', 'oakley', 'gucci'],
  handbags: ['louis-vuitton', 'gucci', 'michael-kors'],
  clothing: ['nike', 'adidas'],
  'ua-batch': ['nike', 'adidas', 'jordan'],
  'luxury-watches': ['rolex', 'omega'],
};

const priceRanges = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under ₹5,000', min: 0, max: 5000 },
  { label: '₹5,000 - ₹10,000', min: 5000, max: 10000 },
  { label: '₹10,000 - ₹25,000', min: 10000, max: 25000 },
  { label: '₹25,000 - ₹50,000', min: 25000, max: 50000 },
  { label: '₹50,000 - ₹1,00,000', min: 50000, max: 100000 },
  { label: 'Above ₹1,00,000', min: 100000, max: Infinity },
];

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const category = searchParams.get('category');
  const brandParam = searchParams.get('brand');
  const searchQuery = searchParams.get('search');

  const [selectedBrand, setSelectedBrand] = useState<string>(brandParam || '');
  const [selectedPriceRange, setSelectedPriceRange] = useState(0);

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
      fetch('/api/products').then(res => res.json()),
      fetch('/api/brands').then(res => res.json())
    ])
    .then(([productsData, brandsData]) => {
      setProducts(productsData);
      setBrands(brandsData);
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  // Reset brand filter when category changes via URL
  useEffect(() => {
    setSelectedBrand(brandParam || '');
    setSelectedPriceRange(0);
  }, [category, brandParam]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (category && category !== 'all') {
      // Case-insensitive comparison to handle mixed case from DB
      const catLower = category.toLowerCase();
      filtered = filtered.filter(p => p.category.toLowerCase() === catLower);
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

    const range = priceRanges[selectedPriceRange];
    filtered = filtered.filter(p => p.price >= range.min && p.price < range.max);

    return filtered;
  }, [products, category, searchQuery, selectedBrand, selectedPriceRange]);

  const getPageTitle = () => {
    if (searchQuery) return `SEARCH: "${searchQuery}"`;
    if (category) {
      const titles: Record<string, string> = {
        sneakers: 'SNEAKERS',
        watches: 'WATCHES',
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
              {(selectedBrand ? 1 : 0) + (selectedPriceRange > 0 ? 1 : 0)}
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
                  ⌚ Watches
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

            {/* Price Filter */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>PRICE</label>
              <select
                className={styles.filterSelect}
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(parseInt(e.target.value))}
              >
                {priceRanges.map((range, idx) => (
                  <option key={idx} value={idx}>{range.label}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(selectedBrand || selectedPriceRange > 0) && (
              <button
                className={styles.clearFilters}
                onClick={() => {
                  setSelectedBrand('');
                  setSelectedPriceRange(0);
                }}
              >
                ✕ CLEAR ALL FILTERS
              </button>
            )}
          </div>

          {/* Products Content */}
          <div className={styles.content}>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading products...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className={styles.grid}>
                {filteredProducts.map((product, idx) => (
                  <div
                    key={product.id}
                    className={styles.productWrapper}
                    style={{ animationDelay: `${idx * 0.04}s` }}
                  >
                    <ProductCard product={product} />
                  </div>
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
                    setSelectedPriceRange(0);
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
            <div className={styles.loading}>Loading Products...</div>
          </div>
        </main>
      </>
    }>
      <ProductsPageContent />
    </Suspense>
  );
}