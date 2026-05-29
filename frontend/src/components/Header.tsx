'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './ClientProviders';
import styles from './Header.module.css';

const categories = ['Sneakers', 'Watches', 'Glasses', 'Handbags', 'Clothing'];

function ScrambleText() {
  const [displayText, setDisplayText] = useState('Shop Sneakers');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);

      // Scramble effect
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

export default function Header() {
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMenu = () => { setMenuOpen(false); setDropdownOpen(false); };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo} onClick={closeMenu}>
          <img
            src="/urbanex-logo.png"
            alt="UrbanEx"
            className={styles.logoImage}
          />
        </Link>

        <nav className={`${styles.nav} ${menuOpen ? styles.open : ''}`}>
          <Link href="/" className={styles.navLink} onClick={closeMenu}>HOME</Link>
          <Link href="/products" className={styles.navLink} onClick={closeMenu}><ScrambleText /></Link>
          <div className={styles.dropdown}>
            <span
              className={styles.navLink}
              onClick={() => setDropdownOpen(o => !o)}
            >
              CATEGORIES {dropdownOpen ? '▴' : '▾'}
            </span>
            <div className={`${styles.dropdownContent} ${dropdownOpen ? styles.dropdownOpen : ''}`}>
              <Link href="/products?category=sneakers" onClick={closeMenu}>👟 Sneakers</Link>
              <Link href="/products?category=watches" onClick={closeMenu}>⌚ Watches</Link>
              <Link href="/products?category=glasses" onClick={closeMenu}>🕶️ Glasses</Link>
              <Link href="/products?category=handbags" onClick={closeMenu}>👜 Handbags</Link>
              <Link href="/products?category=clothing" onClick={closeMenu}>👕 Clothing</Link>
              <Link href="/products?category=luxury-watches" onClick={closeMenu}>💎 Luxury Watches</Link>
            </div>
          </div>
          <Link href="/about" className={styles.navLink} onClick={closeMenu}>ABOUT</Link>
          <Link href="/track-order" className={styles.navLink} onClick={closeMenu}>TRACK</Link>
          <Link href="/return-exchange" className={styles.navLink} onClick={closeMenu}>RETURN</Link>
          <Link href="/contact" className={styles.navLink} onClick={closeMenu}>CONTACT</Link>
        </nav>

        <div className={styles.actions}>
          <button
            className={styles.iconBtn}
            onClick={() => setSearchOpen(!searchOpen)}
            title="Search"
          >
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

      {/* Search Bar */}
      <div className={`${styles.searchBar} ${searchOpen ? styles.searchOpen : ''}`}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            autoFocus={searchOpen}
          />
          <button type="submit" className={styles.searchBtn}>SEARCH</button>
        </form>
      </div>
    </header>
  );
}