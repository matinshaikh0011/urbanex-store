'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const ADMIN_PASSWORD = 'urbanex@admin2026';
const AUTH_KEY = 'urbanex_admin_auth';

interface Order {
  id: number;
  orderId: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress?: string;
  totalAmount: number;
  amountPaid?: number | null;
  status: string;
  createdAt: string;
  utrNumber?: string | null;
  paymentMethod?: string | null;
}

const FILTERS = ['All', 'Pending', 'Verified', 'Shipped', 'Delivered', 'Cancelled'];

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem(AUTH_KEY) === '1') setAuthed(true);
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/orders').then(r => r.json()).catch(() => []),
      fetch('/api/products').then(r => r.json()).catch(() => []),
    ]).then(([ordersData, productsData]) => {
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setProductCount(Array.isArray(productsData) ? productsData.length : 0);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (authed) loadData();
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
    // optimistic update
    setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status } : o));
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { alert('Failed to update status'); loadData(); }
    } catch {
      alert('Failed to update status. Is the backend running?');
      loadData();
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm(`Delete order ${orderId}? This permanently removes it (use for fake/spam orders).`)) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.orderId !== orderId));
      } else {
        alert(
          `Couldn't delete order ${orderId} (server returned ${res.status}).\n\n` +
          `This usually means the live backend hasn't been updated with the delete feature yet. ` +
          `Redeploy the backend, then try again. Meanwhile you can use "Cancel" to mark it as cancelled.`
        );
      }
    } catch {
      alert('Failed to reach the server. Make sure the backend is running, then try again.');
    }
  };

  const totalRevenue = orders
    .filter(o => !/cancelled/i.test(o.status))
    .reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  const pendingCount = orders.filter(o => /pending/i.test(o.status)).length;

  // Heuristic: flag possibly-fake orders (no UTR, or UTR not 12 digits)
  const isSuspicious = (o: Order) => {
    const utr = (o.utrNumber || '').trim();
    return !/^\d{12}$/.test(utr);
  };
  const suspiciousCount = orders.filter(o => isSuspicious(o) && /pending/i.test(o.status)).length;

  const filteredOrders = useMemo(() => {
    let list = [...orders];
    if (filter !== 'All') {
      list = list.filter(o => o.status.toLowerCase().includes(filter.toLowerCase()));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(o =>
        o.orderId.toLowerCase().includes(q) ||
        (o.shippingName || '').toLowerCase().includes(q) ||
        (o.shippingPhone || '').includes(q) ||
        (o.utrNumber || '').includes(q)
      );
    }
    return list;
  }, [orders, filter, search]);

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
        <div className={styles.topActions}>
          <button className={styles.refreshBtn} onClick={loadData}>↻ REFRESH</button>
          <button className={styles.logoutBtn} onClick={logout}>LOGOUT</button>
        </div>
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
            <span className={styles.cardLabel}>NEEDS REVIEW</span>
            <span className={styles.cardValue}>{suspiciousCount}</span>
          </div>
        </div>

        {/* SECTION C — Quick actions */}
        <div className={styles.quickActions}>
          <button className={styles.qaBtn} onClick={() => router.push('/products')}>📦 VIEW ALL PRODUCTS</button>
          <a className={styles.qaBtn} href="https://www.instagram.com/urbanex.store/" target="_blank" rel="noopener noreferrer">📸 INSTAGRAM</a>
          <a className={styles.qaBtn} href="https://wa.me/919898285850" target="_blank" rel="noopener noreferrer">💬 WHATSAPP</a>
        </div>

        {/* SECTION B — Order management */}
        <div className={styles.tableWrap}>
          <div className={styles.manageHead}>
            <h2 className={styles.sectionHeading}>MANAGE ORDERS</h2>
            <input
              className={styles.searchInput}
              placeholder="Search by ID, name, phone, UTR…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter tabs */}
          <div className={styles.filterTabs}>
            {FILTERS.map(f => (
              <button
                key={f}
                className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <p className={styles.tableMsg}>Loading orders…</p>
          ) : filteredOrders.length === 0 ? (
            <p className={styles.tableMsg}>No orders match this view.</p>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Amount</th>
                    <th>Payment / UTR</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => {
                    const suspicious = isSuspicious(o);
                    const cancelled = /cancelled/i.test(o.status);
                    return (
                      <tr key={o.id} className={suspicious && !cancelled ? styles.suspiciousRow : ''}>
                        <td className={styles.mono}>
                          {o.orderId}
                          {suspicious && !cancelled && <span className={styles.flag} title="No valid 12-digit UTR — possibly fake">⚠ CHECK</span>}
                        </td>
                        <td>{o.shippingName}</td>
                        <td>{o.shippingPhone}</td>
                        <td>{formatPrice(Number(o.totalAmount))}</td>
                        <td>
                          <span className={styles.payMethod}>{(o.paymentMethod || 'cod').toUpperCase()}</span>
                          <span className={styles.utrCell}>{o.utrNumber || '— no UTR —'}</span>
                        </td>
                        <td><span className={`${styles.statusBadge} ${cancelled ? styles.statusCancelled : ''}`}>{o.status}</span></td>
                        <td>{formatDate(o.createdAt)}</td>
                        <td>
                          <div className={styles.rowActions}>
                            <button className={styles.verifyBtn} onClick={() => updateStatus(o.orderId, 'Verified')}>Verify</button>
                            <button className={styles.shipBtn} onClick={() => updateStatus(o.orderId, 'Shipped')}>Ship</button>
                            <button className={styles.deliverBtn} onClick={() => updateStatus(o.orderId, 'Delivered')}>Deliver</button>
                            <button className={styles.cancelBtn} onClick={() => updateStatus(o.orderId, 'Cancelled')}>Cancel</button>
                            <button className={styles.deleteBtn} onClick={() => deleteOrder(o.orderId)} title="Permanently delete (fake/spam)">🗑</button>
                            <a
                              className={styles.waBtn}
                              href={`https://wa.me/91${(o.shippingPhone || '').replace(/\D/g, '').slice(-10)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >WA</a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
