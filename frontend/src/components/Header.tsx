'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './ClientProviders';
import { useWishlist } from './WishlistProvider';
import styles from './Header.module.css';

// ── Category types ──────────────────────────────────────────────
interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  active: boolean;
  featured: boolean;
  sortOrder: number;
}



// ── Static fallback categories (used when API is down) ───────────
const FALLBACK_CATEGORIES: Category[] = [
  { id: 1,  name: 'Sneakers',       slug: 'sneakers',       parentId: null, active: true, featured: true,  sortOrder: 1 },
  { id: 11, name: "Men's Sneakers", slug: 'mens-sneakers',  parentId: 1,    active: true, featured: false, sortOrder: 1 },
  { id: 12, name: "Women's Sneakers",slug:'womens-sneakers',parentId: 1,    active: true, featured: false, sortOrder: 2 },
  { id: 2,  name: 'Watches',        slug: 'watches',        parentId: null, active: true, featured: true,  sortOrder: 2 },
  { id: 21, name: "Men's Watches",  slug: 'mens-watches',   parentId: 2,    active: true, featured: false, sortOrder: 1 },
  { id: 22, name: "Women's Watches",slug: 'womens-watches', parentId: 2,    active: true, featured: false, sortOrder: 2 },
  { id: 3,  name: 'Luxury Watches', slug: 'luxury-watches', parentId: null, active: true, featured: true,  sortOrder: 3 },
  { id: 31, name: "Men's Luxury",   slug: 'mens-luxury-watches',  parentId: 3, active: true, featured: false, sortOrder: 1 },
  { id: 32, name: "Women's Luxury", slug: 'womens-luxury-watches', parentId: 3, active: true, featured: false, sortOrder: 2 },
  { id: 4,  name: 'Glasses',        slug: 'glasses',        parentId: null, active: true, featured: true,  sortOrder: 4 },
  { id: 41, name: 'Sunglasses',     slug: 'sunglasses',     parentId: 4,    active: true, featured: false, sortOrder: 1 },
  { id: 42, name: 'Eyeglasses',     slug: 'eyeglasses',     parentId: 4,    active: true, featured: false, sortOrder: 2 },
  { id: 5,  name: 'Handbags',       slug: 'handbags',       parentId: null, active: true, featured: true,  sortOrder: 5 },
  { id: 51, name: "Women's Handbags",slug:'womens-handbags',parentId: 5,    active: true, featured: false, sortOrder: 1 },
  { id: 52, name: "Men's Bags",     slug: 'mens-bags',      parentId: 5,    active: true, featured: false, sortOrder: 2 },
  { id: 6,  name: 'Clothing',       slug: 'clothing',       parentId: null, active: true, featured: true,  sortOrder: 6 },
  { id: 61, name: 'T-Shirts',       slug: 'tshirts',        parentId: 6,    active: true, featured: false, sortOrder: 1 },
  { id: 62, name: 'Track Pants',    slug: 'track-pants',    parentId: 6,    active: true, featured: false, sortOrder: 2 },
  { id: 63, name: 'Jeans',          slug: 'jeans',          parentId: 6,    active: true, featured: false, sortOrder: 3 },
  { id: 64, name: 'Shirts',         slug: 'shirts',         parentId: 6,    active: true, featured: false, sortOrder: 4 },
  { id: 7,  name: 'Premium Edition', slug: 'ua-batch',      parentId: null, active: true, featured: false, sortOrder: 7 },
  { id: 71, name: "Men's Premium",  slug: 'mens-ua',        parentId: 7,    active: true, featured: false, sortOrder: 1 },
  { id: 72, name: "Women's Premium",slug: 'womens-ua',      parentId: 7,    active: true, featured: false, sortOrder: 2 },
];

// ── Scramble text ────────────────────────────────────────────────
const scrambleCategories = ['Sneakers', 'Watches', 'Glasses', 'Handbags', 'Clothing'];

function ScrambleText() {
  const [displayText, setDisplayText] = useState('Shop Sneakers');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      let scrambleCount = 0;
      const scrambleInterval = setInterval(() => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        const scrambled = 'Shop ' + Array(8).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
        setDisplayText(scrambled);
        scrambleCount++;
        if (scrambleCount > 5) {
          clearInterval(scrambleInterval);
          setCurrentIndex((prev) => (prev + 1) % scrambleCategories.length);
          setDisplayText(`Shop ${scrambleCategories[(currentIndex + 1) % scrambleCategories.length]}`);
          setTimeout(() => setIsAnimating(false), 500);
        }
      }, 50);
    }, 3000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <span className={`${styles.scrambleText} ${isAnimating ? styles.animating : ''}`}>
      {displayText}
    </span>
  );
}

// ── Utility tape strip — top dark marquee ────────────────────────
const UTILITY_NOTES = [
  'FREE SHIPPING OVER ₹999',
  '7-DAY EASY RETURNS',
  'COD AVAILABLE',
  '100% AUTHENTIC',
  'INSTANT WHATSAPP SUPPORT',
  'NEW DROP 2026',
];

// ── Search overlay ───────────────────────────────────────────────
interface SearchProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  images: string[];
  brand: { name: string; slug: string };
  category: string;
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [allProducts, setAllProducts] = useState<SearchProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
    fetch('/api/products')
      .then(res => res.json())
      .then(data => { setAllProducts(Array.isArray(data) ? data : []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const results = q
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand?.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      ).slice(0, 8)
    : [];

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(price);

  const goToProduct = (slug: string) => { onClose(); router.push(`/products/${slug}`); };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q) { onClose(); router.push(`/products?search=${encodeURIComponent(query.trim())}`); }
  };

  return (
    <div className={styles.searchOverlay} onMouseDown={onClose}>
      <div className={styles.searchModal} onMouseDown={(e) => e.stopPropagation()}>
        <form className={styles.searchTopBar} onSubmit={submitSearch}>
          <svg className={styles.searchTopIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, brands, categories..." className={styles.searchModalInput} />
          <button type="button" className={styles.searchClose} onClick={onClose} aria-label="Close search">✕</button>
        </form>
        <div className={styles.searchResults}>
          {!q && <p className={styles.searchHint}>Start typing to search the store…</p>}
          {q && loaded && results.length === 0 && (
            <div className={styles.searchEmpty}>
              <span className={styles.searchEmptyIcon}>🔍</span>
              <p>No results found for &quot;{query}&quot;</p>
            </div>
          )}
          {results.map(p => (
            <button key={p.id} className={styles.searchResult} onClick={() => goToProduct(p.slug)}>
              <span className={styles.searchResultImg}><img src={p.images?.[0]} alt={p.name} /></span>
              <span className={styles.searchResultInfo}>
                <span className={styles.searchResultName}>{p.name}</span>
                <span className={styles.searchResultMeta}>
                  <span className={styles.searchResultBrand}>{p.brand?.name}</span>
                  <span className={styles.searchResultCat}>{p.category}</span>
                </span>
              </span>
              <span className={styles.searchResultPrice}>{formatPrice(p.price)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mega Menu ────────────────────────────────────────────────────
interface MegaMenuProps {
  categories: Category[];
  onClose: () => void;
}

function MegaMenu({ categories, onClose }: MegaMenuProps) {
  // Build parent → children map
  const parents = categories.filter(c => c.active && c.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder);
  const childrenOf = (parentId: number) =>
    categories.filter(c => c.active && c.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className={styles.megaMenu} role="navigation" aria-label="Category mega menu">
      <div className={styles.megaInner}>
        {parents.map(parent => {
          const children = childrenOf(parent.id);
          return (
            <div key={parent.id} className={styles.megaCol}>
              {/* Parent heading — links to category page */}
              <Link
                href={`/products?category=${parent.slug}`}
                className={styles.megaParent}
                onClick={onClose}
              >
                <span className={styles.megaParentIcon}>▸</span>
                {parent.name}
              </Link>
              {/* Children */}
              {children.length > 0 && (
                <ul className={styles.megaChildren}>
                  {children.map(child => (
                    <li key={child.id}>
                      <Link
                        href={`/products?category=${parent.slug}&subcategory=${child.slug}`}
                        className={styles.megaChild}
                        onClick={onClose}
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {/* "View All" CTA column */}
        <div className={styles.megaColCta}>
          <Link href="/products" className={styles.megaViewAll} onClick={onClose}>
            VIEW ALL<br />PRODUCTS
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Mobile accordion categories ──────────────────────────────────
interface MobileAccordionProps {
  categories: Category[];
  onClose: () => void;
}

function MobileAccordion({ categories, onClose }: MobileAccordionProps) {
  const [openId, setOpenId] = useState<number | null>(null);
  const parents = categories.filter(c => c.active && c.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder);
  const childrenOf = (parentId: number) =>
    categories.filter(c => c.active && c.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className={styles.mobileAccordion}>
      {parents.map(parent => {
        const children = childrenOf(parent.id);
        const isOpen = openId === parent.id;
        return (
          <div key={parent.id} className={styles.accordionItem}>
            <div className={styles.accordionHeader}>
              <Link
                href={`/products?category=${parent.slug}`}
                className={styles.accordionParentLink}
                onClick={onClose}
              >
                <span>▸</span>
                {parent.name}
              </Link>
              {children.length > 0 && (
                <button
                  className={`${styles.accordionToggle} ${isOpen ? styles.accordionToggleOpen : ''}`}
                  onClick={() => setOpenId(isOpen ? null : parent.id)}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${parent.name}`}
                >
                  ▾
                </button>
              )}
            </div>
            {children.length > 0 && (
              <div className={`${styles.accordionBody} ${isOpen ? styles.accordionBodyOpen : ''}`}>
                {children.map(child => (
                  <Link
                    key={child.id}
                    href={`/products?category=${parent.slug}&subcategory=${child.slug}`}
                    className={styles.accordionChild}
                    onClick={onClose}
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Header ──────────────────────────────────────────────────
export default function Header() {
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileAccordionOpen, setMobileAccordionOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Hover intent refs — prevent flicker when moving mouse from trigger to panel
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const megaRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 960);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fetch categories from API — fall back to static list if API is down
  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        } else {
          setCategories(FALLBACK_CATEGORIES);
        }
      })
      .catch(() => setCategories(FALLBACK_CATEGORIES));
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const closeAll = useCallback(() => {
    setMenuOpen(false);
    setMegaOpen(false);
    setMobileAccordionOpen(false);
  }, []);

  // Desktop hover handlers with delay to prevent flicker
  const handleCatMouseEnter = () => {
    if (isMobile) return;
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setMegaOpen(true);
  };

  const handleCatMouseLeave = () => {
    if (isMobile) return;
    hoverTimeout.current = setTimeout(() => setMegaOpen(false), 150);
  };

  const handleMegaMouseEnter = () => {
    if (isMobile) return;
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setMegaOpen(true);
  };

  const handleMegaMouseLeave = () => {
    if (isMobile) return;
    hoverTimeout.current = setTimeout(() => setMegaOpen(false), 150);
  };

  // Close mega on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMegaOpen(false); setMenuOpen(false); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Close mega on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) {
        setMegaOpen(false);
      }
    };
    if (megaOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [megaOpen]);

  return (
    <header className={`${styles.header} ${menuOpen ? styles.mobileOpen : ''}`}>
      {/* Utility tape — dark marquee strip above the main bar */}
      <div className={styles.utilityTape} aria-hidden>
        <div className={styles.utilityTrack}>
          {[...UTILITY_NOTES, ...UTILITY_NOTES, ...UTILITY_NOTES].map((note, i) => (
            <span key={i} className={styles.utilityItem}>
              {note}<i>✦</i>
            </span>
          ))}
        </div>
      </div>

      <div className={styles.container}>
        {/* Logo */}
        <Link href="/" className={styles.logo} onClick={closeAll}>
          <img src="/urbanex-logo.png" alt="UrbanEx" className={styles.logoImage} />
        </Link>

        {/* Desktop nav */}
        <nav className={`${styles.nav} ${menuOpen ? styles.open : ''}`}>
          <Link href="/" className={styles.navLink} onClick={closeAll}>HOME</Link>
          <Link href="/products" className={styles.navLink} onClick={closeAll}><ScrambleText /></Link>

          {/* Categories trigger — desktop: hover mega menu, mobile: accordion */}
          {isMobile ? (
            // Mobile: tap to toggle accordion inline in the drawer
            <div className={styles.mobileCatWrapper}>
              <button
                className={`${styles.navLink} ${styles.mobileCatBtn}`}
                onClick={() => setMobileAccordionOpen(o => !o)}
                aria-expanded={mobileAccordionOpen}
              >
                CATEGORIES <span className={styles.chevron}>{mobileAccordionOpen ? '▴' : '▾'}</span>
              </button>
              {mobileAccordionOpen && (
                <MobileAccordion categories={categories} onClose={closeAll} />
              )}
            </div>
          ) : (
            // Desktop: hover mega menu
            <div
              ref={megaRef}
              className={`${styles.catTrigger} ${megaOpen ? styles.catTriggerActive : ''}`}
              onMouseEnter={handleCatMouseEnter}
              onMouseLeave={handleCatMouseLeave}
            >
              <button
                className={`${styles.navLink} ${styles.catBtn}`}
                aria-haspopup="true"
                aria-expanded={megaOpen}
                onClick={() => setMegaOpen(o => !o)}
              >
                CATEGORIES <span className={styles.chevron}>{megaOpen ? '▴' : '▾'}</span>
              </button>

              {megaOpen && (
                <div
                  className={styles.megaWrapper}
                  onMouseEnter={handleMegaMouseEnter}
                  onMouseLeave={handleMegaMouseLeave}
                >
                  <MegaMenu categories={categories} onClose={closeAll} />
                </div>
              )}
            </div>
          )}

          <Link href="/about" className={styles.navLink} onClick={closeAll}>ABOUT</Link>
          <Link href="/track-order" className={styles.navLink} onClick={closeAll}>TRACK</Link>
          <Link href="/faq" className={styles.navLink} onClick={closeAll}>FAQ</Link>
          <Link href="/return-exchange" className={styles.navLink} onClick={closeAll}>RETURN</Link>
          <Link href="/contact" className={styles.navLink} onClick={closeAll}>CONTACT</Link>
        </nav>

        {/* Action icons */}
        <div className={styles.actions}>
          <button className={styles.iconBtn} onClick={() => setSearchOpen(true)} title="Search">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <Link href="/login" className={styles.iconBtn} title="Login">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
          <Link href="/wishlist" className={styles.iconBtn} title="Wishlist">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {mounted && wishlistCount > 0 && <span className={styles.cartCount}>{wishlistCount}</span>}
          </Link>
          <Link href="/cart" className={styles.cartLink} title="Cart">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {mounted && itemCount > 0 && <span className={styles.cartCount}>{itemCount}</span>}
          </Link>
          <button className={`${styles.menuToggle} ${menuOpen ? styles.open : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
