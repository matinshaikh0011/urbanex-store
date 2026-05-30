'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './ClientProviders';
import { useWishlist } from './WishlistProvider';
import styles from './Header.module.css';

const categories = ['Sneakers', 'Watches', 'Glasses', 'Handbags', 'Clothing'];

interface SearchProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  images: string[];
  brand: { name: string; slug: string };
  category: string;
}

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
          setCurrentIndex((prev) => (prev + 1) % categories.length);
          setDisplayText(`Shop ${categories[(currentIndex + 1) % categories.length]}`);
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

// ── Live search overlay ──
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
      .then(data => {
        setAllProducts(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
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

  const goToProduct = (slug: string) => {
    onClose();
    router.push(`/products/${slug}`);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q) { onClose(); router.push(`/products?search=${encodeURIComponent(query.trim())}`); }
  };

  return (
    <div className={styles.searchOverlay} onMouseDown={onClose}>
      <div className={styles.searchModal} onMouseDown={(e) => e.stopPropagation()}>
        <form className={styles.searchTopBar} onSubmit={submitSearch}>
          <svg className={styles.searchTopIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, brands, categories..."
            className={styles.searchModalInput}
          />
          <button type="button" className={styles.searchClose} onClick={onClose} aria-label="Close search">✕</button>
        </form>

        <div className={styles.searchResults}>
          {!q && (
            <p className={styles.searchHint}>Start typing to search the store…</p>
          )}
          {q && loaded && results.length === 0 && (
            <div className={styles.searchEmpty}>
              <span className={styles.searchEmptyIcon}>🔍</span>
              <p>No results found for &quot;{query}&quot;</p>
            </div>
          )}
          {results.map(p => (
            <button key={p.id} className={styles.searchResult} onClick={() => goToProduct(p.slug)}>
              <span className={styles.searchResultImg}>
                <img src={p.images?.[0]} alt={p.name} />
              </span>
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

export default function Header() {
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMenu = () => { setMenuOpen(false); setDropdownOpen(false); };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo} onClick={closeMenu}>
          <img src="/urbanex-logo.png" alt="UrbanEx" className={styles.logoImage} />
        </Link>

        <nav className={`${styles.nav} ${menuOpen ? styles.open : ''}`}>
          <Link href="/" className={styles.navLink} onClick={closeMenu}>HOME</Link>
          <Link href="/products" className={styles.navLink} onClick={closeMenu}><ScrambleText /></Link>
          <div className={styles.dropdown}>
            <span className={styles.navLink} onClick={() => setDropdownOpen(o => !o)}>
              CATEGORIES {dropdownOpen ? '▴' : '▾'}
            </span>
            <div className={`${styles.dropdownContent} ${dropdownOpen ? styles.dropdownOpen : ''}`}>
              <Link href="/products?category=sneakers" onClick={closeMenu}>👟 Sneakers</Link>
              <Link href="/products?category=watches" onClick={closeMenu}>⌚ Luxury Watches</Link>
              <Link href="/products?category=watches&subcategory=mens-watches" onClick={closeMenu} className={styles.subItem}>— Men&apos;s Watches</Link>
              <Link href="/products?category=watches&subcategory=womens-watches" onClick={closeMenu} className={styles.subItem}>— Women&apos;s Watches</Link>
              <Link href="/products?category=glasses" onClick={closeMenu}>🕶️ Glasses</Link>
              <Link href="/products?category=glasses&subcategory=mens-glasses" onClick={closeMenu} className={styles.subItem}>— Men&apos;s Glasses</Link>
              <Link href="/products?category=glasses&subcategory=womens-glasses" onClick={closeMenu} className={styles.subItem}>— Women&apos;s Glasses</Link>
              <Link href="/products?category=handbags" onClick={closeMenu}>👜 Handbags</Link>
              <Link href="/products?category=clothing" onClick={closeMenu}>👕 Clothing</Link>
              <Link href="/products?category=clothing&subcategory=track-pants" onClick={closeMenu} className={styles.subItem}>— Track Pants</Link>
              <Link href="/products?category=clothing&subcategory=jeans" onClick={closeMenu} className={styles.subItem}>— Jeans</Link>
              <Link href="/products?category=clothing&subcategory=shirts" onClick={closeMenu} className={styles.subItem}>— Shirts</Link>
              <Link href="/products?category=clothing&subcategory=tshirts" onClick={closeMenu} className={styles.subItem}>— T-Shirts</Link>
              <Link href="/products?category=clothing&subcategory=denims" onClick={closeMenu} className={styles.subItem}>— Denims</Link>
            </div>
          </div>
          <Link href="/about" className={styles.navLink} onClick={closeMenu}>ABOUT</Link>
          <Link href="/track-order" className={styles.navLink} onClick={closeMenu}>TRACK</Link>
          <Link href="/return-exchange" className={styles.navLink} onClick={closeMenu}>RETURN</Link>
          <Link href="/contact" className={styles.navLink} onClick={closeMenu}>CONTACT</Link>
        </nav>

        <div className={styles.actions}>
          <button className={styles.iconBtn} onClick={() => setSearchOpen(true)} title="Search">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <Link href="/login" className={styles.iconBtn} title="Login">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
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
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {mounted && itemCount > 0 && <span className={styles.cartCount}>{itemCount}</span>}
          </Link>
          <button className={styles.menuToggle} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
