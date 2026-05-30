'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import { useCart } from '@/components/ClientProviders';
import styles from './page.module.css';

interface StoredUser { email: string; name: string; }
interface HistoryOrder {
  orderId: string;
  date: string;
  products: { name: string; slug?: string; size: string; quantity: number; price: number }[];
  status: string;
  total: number;
}

export default function LoginPage() {
  const router = useRouter();
  const { addToCart } = useCart();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [orders, setOrders] = useState<HistoryOrder[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('urbanex_user');
      if (saved) setUser(JSON.parse(saved));
      const hist = localStorage.getItem('urbanex_orders');
      if (hist) setOrders(JSON.parse(hist));
    } catch { /* ignore */ }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const u = { email: formData.email, name: formData.name || 'Customer' };
      localStorage.setItem('urbanex_user', JSON.stringify(u));
      setUser(u);
      setLoading(false);
    }, 800);
  };

  const logout = () => {
    localStorage.removeItem('urbanex_user');
    setUser(null);
  };

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const buyAgain = (order: HistoryOrder) => {
    order.products.forEach(p => {
      addToCart({ id: Math.floor(Math.random() * 1e9), name: p.name, price: p.price, image: '/placeholder.jpg', size: p.size, quantity: p.quantity });
    });
    router.push('/cart');
  };

  // ── Logged-in account view with order history ──
  if (user) {
    return (
      <>
        <GlobalPopup />
        <Header />
        <main className={styles.main}>
          <div className={styles.accountContainer}>
            <div className={styles.accountHead}>
              <div>
                <h1 className={styles.accountTitle}>MY <span className={styles.accent}>ACCOUNT</span></h1>
                <p className={styles.accountWelcome}>Welcome back, {user.name || user.email}</p>
              </div>
              <button className={styles.logoutBtn} onClick={logout}>LOGOUT</button>
            </div>

            <h2 className={styles.historyTitle}>ORDER HISTORY</h2>
            {orders.length === 0 ? (
              <div className={styles.noOrders}>
                <p>You haven&apos;t placed any orders yet.</p>
                <Link href="/products" className={styles.shopLink}>START SHOPPING</Link>
              </div>
            ) : (
              <div className={styles.orderList}>
                {orders.map((o) => (
                  <div key={o.orderId} className={styles.orderCard}>
                    <div className={styles.orderTop}>
                      <span className={styles.orderId}>{o.orderId}</span>
                      <span className={styles.orderStatus}>{o.status}</span>
                    </div>
                    <div className={styles.orderMeta}>
                      <span>{formatDate(o.date)}</span>
                      <span className={styles.orderTotal}>{formatPrice(o.total)}</span>
                    </div>
                    <div className={styles.orderProducts}>
                      {o.products.map((p, i) => (
                        <span key={i} className={styles.orderProduct}>
                          {p.name} {p.size && p.size !== 'One Size' ? `(${p.size})` : ''} ×{p.quantity}
                        </span>
                      ))}
                    </div>
                    <div className={styles.orderActions}>
                      <Link href={`/track-order?orderId=${o.orderId}`} className={styles.trackBtn}>TRACK ORDER</Link>
                      <button className={styles.buyAgainBtn} onClick={() => buyAgain(o)}>BUY AGAIN</button>
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

  return (
    <>
      <GlobalPopup />
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${isLogin ? styles.active : ''}`} onClick={() => setIsLogin(true)}>
                LOGIN
              </button>
              <button className={`${styles.tab} ${!isLogin ? styles.active : ''}`} onClick={() => setIsLogin(false)}>
                REGISTER
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {!isLogin && (
                <div className={styles.formGroup}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              {!isLogin && (
                <div className={styles.formGroup}>
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>

              {isLogin && (
                <div className={styles.forgot}>
                  <Link href="#">Forgot Password?</Link>
                </div>
              )}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'PLEASE WAIT...' : isLogin ? 'LOGIN' : 'CREATE ACCOUNT'}
              </button>
            </form>

            <div className={styles.divider}>
              <span>OR</span>
            </div>

            <div className={styles.whatsappLogin}>
              <p>Prefer to order via WhatsApp?</p>
              <a href="https://wa.me/919898285850" target="_blank" rel="noopener" className={styles.whatsappBtn}>
                💬 CHAT ON WHATSAPP
              </a>
            </div>

            <p className={styles.note}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}