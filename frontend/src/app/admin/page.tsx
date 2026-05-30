'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const ADMIN_PASSWORD = 'urbanex@admin2026';
const AUTH_KEY = 'urbanex_admin_auth';

interface Order {
  id: number;
  orderId: string;
  shippingName: string;
  shippingPhone: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  utrNumber?: string;
  paymentMethod?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(AUTH_KEY) === '1') setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    Promise.all([
      fetch('/api/orders').then(r => r.json()).catch(() => []),
      fetch('/api/products').then(r => r.json()).catch(() => []),
    ]).then(([ordersData, productsData]) => {
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setProductCount(Array.isArray(productsData) ? productsData.length : 0);
      setLoading(false);
    });
  }, [authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, '1');
      setAuthed(true);
      setError('');
    } else {
      setError('Incorrect password. Access denied.');
    }
  };

  const logout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthed(false);
    setPasswordInput('');
  };

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status } : o));
      } else {
        alert('Failed to update status');
      }
    } catch {
      alert('Failed to update status. Is the backend running?');
    }
  };

  const totalRevenue = orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  const pendingCount = orders.filter(o => /pending/i.test(o.status)).length;

  // ── Login gate ──
  if (!authed) {
    return (
      <main className={styles.loginMain}>
        <form className={styles.loginCard} onSubmit={handleLogin}>
          <h1 className={styles.loginTitle}>ADMIN <span className={styles.accent}>LOGIN</span></h1>
          <p className={styles.loginSub}>Enter the admin password to continue</p>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => { setPasswordInput(e.target.value); setError(''); }}
            placeholder="Password"
            className={styles.loginInput}
            autoFocus
          />
          {error && <p className={styles.loginError}>{error}</p>}
          <button type="submit" className={styles.loginBtn}>UNLOCK DASHBOARD</button>
        </form>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.topbar}>
        <h1 className={styles.dashTitle}>URBANEX <span className={styles.accent}>ADMIN</span></h1>
        <button className={styles.logoutBtn} onClick={logout}>LOGOUT</button>
      </div>

      <div className={styles.container}>
        {/* SECTION A — Overview cards */}
        <div className={styles.cards}>
          <div className={styles.card}>
            <span className={styles.cardLabel}>TOTAL ORDERS</span>
            <span className={styles.cardValue}>{orders.length}</span>
          </div>
          <div className={`${styles.card} ${styles.cardWarn}`}>
            <span className={styles.cardLabel}>PENDING ORDERS</span>
            <span className={styles.cardValue}>{pendingCount}</span>
          </div>
          <div className={`${styles.card} ${styles.cardRed}`}>
            <span className={styles.cardLabel}>TOTAL REVENUE</span>
            <span className={styles.cardValue}>{formatPrice(totalRevenue)}</span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardLabel}>TOTAL PRODUCTS</span>
            <span className={styles.cardValue}>{productCount}</span>
          </div>
        </div>

        {/* SECTION C — Quick actions */}
        <div className={styles.quickActions}>
          <button className={styles.qaBtn} onClick={() => router.push('/products')}>📦 VIEW ALL PRODUCTS</button>
          <a className={styles.qaBtn} href="https://www.instagram.com/urbanex.store/" target="_blank" rel="noopener noreferrer">📸 INSTAGRAM</a>
          <a className={styles.qaBtn} href="https://wa.me/919265110277" target="_blank" rel="noopener noreferrer">💬 WHATSAPP</a>
        </div>

        {/* SECTION B — Recent orders table */}
        <div className={styles.tableWrap}>
          <h2 className={styles.sectionHeading}>RECENT ORDERS</h2>
          {loading ? (
            <p className={styles.tableMsg}>Loading orders…</p>
          ) : orders.length === 0 ? (
            <p className={styles.tableMsg}>No orders yet.</p>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td className={styles.mono}>{o.orderId}</td>
                      <td>{o.shippingName}</td>
                      <td>{o.shippingPhone}</td>
                      <td>{formatPrice(Number(o.totalAmount))}</td>
                      <td><span className={styles.statusBadge}>{o.status}</span></td>
                      <td>{formatDate(o.createdAt)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button className={styles.shipBtn} onClick={() => updateStatus(o.orderId, 'Shipped')}>Ship</button>
                          <button className={styles.deliverBtn} onClick={() => updateStatus(o.orderId, 'Delivered')}>Deliver</button>
                          <a
                            className={styles.waBtn}
                            href={`https://wa.me/91${(o.shippingPhone || '').replace(/\D/g, '').slice(-10)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >WA</a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
