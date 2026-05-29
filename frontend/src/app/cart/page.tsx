'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/ClientProviders';
import styles from './page.module.css';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCheckout = () => {
    // Store cart items in session storage for checkout
    if (items.length > 0) {
      sessionStorage.setItem('urbanex_cart_checkout', JSON.stringify(items));
      router.push('/checkout?type=cart');
    }
  };

  if (!mounted) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🛒</div>
            <h1 className={styles.emptyTitle}>YOUR CART IS EMPTY</h1>
            <p className={styles.emptyText}>
              Looks like you haven&apos;t added any items to your cart yet.
            </p>
            <Link href="/products" className={styles.shopBtn}>
              START SHOPPING
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>SHOPPING CART</h1>

        <div className={styles.content}>
          <div className={styles.items}>
            {items.map((item) => (
              <div key={`${item.id}-${item.size}`} className={styles.item}>
                <div className={styles.itemImage}>
                  <img src={item.image} alt={item.name} />
                </div>
                <div className={styles.itemDetails}>
                  <Link href={`/products/${item.id}`} className={styles.itemName}>
                    {item.name}
                  </Link>
                  <div className={styles.itemMeta}>
                    <span>Size: US {item.size}</span>
                  </div>
                  <div className={styles.quantity}>
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>
                </div>
                <div className={styles.itemPrice}>
                  <span className={styles.price}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                  <button className={styles.removeBtn} onClick={() => removeFromCart(item.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.summary}>
            <h2 className={styles.summaryTitle}>ORDER SUMMARY</h2>
            <div className={styles.summaryRow}>
              <span>Subtotal ({items.length} items)</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Shipping</span>
              <span className={styles.free}>FREE</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Advance Required</span>
              <span className={styles.advance}>₹300</span>
            </div>
            <div className={`${styles.summaryRow} ${styles.total}`}>
              <span>Total</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>

            <button className={styles.checkoutBtn} onClick={handleCheckout}>
              PROCEED TO CHECKOUT
            </button>

            <button className={styles.clearBtn} onClick={clearCart}>
              CLEAR CART
            </button>

            <div className={styles.notice}>
              <p>💳 Pay ₹300 advance to confirm order</p>
              <p>💰 Balance on delivery</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}