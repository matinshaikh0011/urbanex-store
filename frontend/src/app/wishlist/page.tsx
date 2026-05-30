'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import { useWishlist } from '@/components/WishlistProvider';
import { useCart } from '@/components/ClientProviders';
import styles from './page.module.css';

export default function WishlistPage() {
  const { items, remove } = useWishlist();
  const { addToCart } = useCart();
  const router = useRouter();

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(price);

  const handleAddToCart = (item: typeof items[number]) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      size: '8',
      quantity: 1,
    });
  };

  return (
    <>
      <GlobalPopup />
      <Header />
      <main className={styles.main}>
        <div className={styles.pageHero}>
          <h1 className={styles.title}>MY <span className={styles.accent}>WISHLIST</span></h1>
          <p className={styles.count}>{items.length} {items.length === 1 ? 'ITEM' : 'ITEMS'} SAVED</p>
        </div>

        <div className={styles.container}>
          {items.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🤍</span>
              <h2>Your wishlist is empty</h2>
              <p>Your wishlist is empty. Start adding products you love!</p>
              <Link href="/products" className={styles.shopBtn}>BROWSE PRODUCTS</Link>
            </div>
          ) : (
            <div className={styles.grid}>
              {items.map(item => (
                <div key={item.id} className={styles.card}>
                  <div
                    className={styles.cardImage}
                    onClick={() => router.push(`/products/${item.slug}`)}
                  >
                    <img src={item.image} alt={item.name} />
                    {item.originalPrice && <span className={styles.saleTag}>SALE</span>}
                  </div>
                  <div className={styles.cardInfo}>
                    <span className={styles.cardBrand}>{item.brand}</span>
                    <h3 className={styles.cardName} onClick={() => router.push(`/products/${item.slug}`)}>{item.name}</h3>
                    <div className={styles.cardPriceRow}>
                      <span className={styles.cardPrice}>{formatPrice(item.price)}</span>
                      {item.originalPrice && (
                        <span className={styles.cardOriginal}>{formatPrice(item.originalPrice)}</span>
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      <button className={styles.addBtn} onClick={() => handleAddToCart(item)}>ADD TO CART</button>
                      <button className={styles.removeBtn} onClick={() => remove(item.id)}>♥ REMOVE</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
