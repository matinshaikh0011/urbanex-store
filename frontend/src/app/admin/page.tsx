'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Order {
  id: number; orderId: string; shippingName: string; shippingPhone: string;
  shippingAddress?: string; shippingEmail?: string; totalAmount: number;
  amountPaid?: number | null; status: string; createdAt: string;
  utrNumber?: string | null; paymentMethod?: string | null; notes?: string | null;
  paymentScreenshot?: string | null;
  size?: string | null; product?: { name: string; brand?: { name: string } } | null;
  couponCode?: string | null; discountAmount?: number | null;
}
interface Product {
  id: number; name: string; slug: string; category: string; price: number;
  originalPrice?: number | null; images: string[]; isFeatured: boolean;
  inStock: boolean; brand: { id: number; name: string; slug: string }; brandId: number;
  description?: string; sizes: Record<string, string[]>; colors: { name: string; hex: string }[];
  subcategory?: string | null;
  source?: string | null; sourceId?: string | null; lastSync?: string | null;
}
interface Brand { id: number; name: string; slug: string; logoUrl?: string | null; isFeatured?: boolean; _count?: { products: number } }
interface Category {
  id: number; name: string; slug: string; description?: string | null;
  image?: string | null; parentId?: number | null; featured: boolean;
  active: boolean; sortOrder: number; productCount: number;
  createdAt: string; updatedAt: string;
}
interface Coupon {
  id: number; code: string; type: string; value: number; minimumOrder: number;
  maximumDiscount?: number | null; usageLimit: number; usedCount: number;
  isActive: boolean; expiresAt?: string | null; createdAt: string;
}
interface Stats {
  totalOrders: number; pendingOrders: number; totalRevenue: number;
  totalProducts: number; outOfStock: number; activeCoupons: number;
  recentOrders: Order[]; outOfStockProducts: Product[];
}
interface HeroSlide {
  id: number; image: string; label: string; tagline: string; spec: string;
  emoji: string; href: string; active: boolean; sortOrder: number;
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const STATUS_COLORS: Record<string, string> = {
  'pending advance': '#F5C400', 'pending verification': '#F5C400',
  'confirmed': '#3B82F6', 'verified': '#3B82F6',
  'shipped': '#8B5CF6', 'delivered': '#22C55E', 'cancelled': '#CC0000',
};

function statusColor(s: string) { return STATUS_COLORS[s.toLowerCase()] || '#888'; }

// â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useToast() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'ok' | 'err' }[]>([]);
  const show = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

// â”€â”€ API helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function api(path: string, opts?: RequestInit) {
  const res = await fetch(path, { credentials: 'include', ...opts });
  if (res.status === 401) { window.location.href = '/admin/login'; throw new Error('Unauthorized'); }
  return res;
}

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function AdminPage() {
  const router = useRouter();
  const { toasts, show } = useToast();
  const [section, setSection] = useState<'overview' | 'orders' | 'payments' | 'products' | 'brands' | 'categories' | 'hero' | 'coupons' | 'inventory' | 'csv'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Verify auth on mount
  useEffect(() => {
    api('/api/admin/verify').catch(() => router.replace('/admin/login'));
  }, [router]);

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    router.replace('/admin/login');
  };

  const NAV = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'orders', icon: '📦', label: 'Orders' },
    { id: 'payments', icon: '💳', label: 'Manage Payments' },
    { id: 'products', icon: '👟', label: 'Products' },
    { id: 'brands', icon: '🏷️', label: 'Brands' },
    { id: 'categories', icon: '🗂️', label: 'Categories' },
    { id: 'hero', icon: '🖼️', label: 'Hero Banners' },
    { id: 'coupons', icon: '🎟️', label: 'Coupons' },
    { id: 'inventory', icon: '📈', label: 'Inventory' },
    { id: 'csv', icon: '📥', label: 'Import CSV' },
  ] as const;

  return (
    <div className={styles.shell}>
      {/* Toasts */}
      <div className={styles.toastStack}>
        {toasts.map(t => (
          <div key={t.id} className={`${styles.toast} ${t.type === 'err' ? styles.toastErr : styles.toastOk}`}>{t.msg}</div>
        ))}
      </div>

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarLogo}>URBAN<span className={styles.red}>EX</span></div>
        <nav className={styles.nav}>
          {NAV.map(n => (
            <button key={n.id} className={`${styles.navItem} ${section === n.id ? styles.navActive : ''}`}
              onClick={() => { setSection(n.id as typeof section); setSidebarOpen(false); }}>
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
          <a href="/admin/scraper" className={styles.navItem} style={{ textDecoration: 'none' }}>
            <span>✦</span> Product Scraper
          </a>
        </nav>
        <button className={styles.logoutSide} onClick={logout}>⏻ LOGOUT</button>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.hamburger} onClick={() => setSidebarOpen(o => !o)}>≡</button>
          <h1 className={styles.topTitle}>UrbanEx <span className={styles.red}>Admin</span></h1>
          <button className={styles.logoutBtn} onClick={logout}>LOGOUT</button>
        </header>

        <div className={styles.content}>
          {section === 'overview' && <OverviewSection show={show} />}
          {section === 'orders' && <OrdersSection show={show} />}
          {section === 'payments' && <PaymentsSection show={show} />}
          {section === 'products' && <ProductsSection show={show} />}
          {section === 'brands' && <BrandsSection show={show} />}
          {section === 'categories' && <CategoriesSection show={show} />}
          {section === 'coupons' && <CouponsSection show={show} />}
          {section === 'inventory' && <InventorySection show={show} />}
          {section === 'csv' && <CSVSection show={show} />}
          {section === 'hero' && <HeroSection show={show} />}
        </div>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// OVERVIEW SECTION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function OverviewSection({ show }: { show: (m: string, t?: 'ok' | 'err') => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    api('/api/admin/stats')
      .then(r => r.json())
      .then(data => {
        // Guard: if the API returned an error object instead of stats, treat as failure
        if (data && data.error) {
          setApiError(data.error);
          setStats(null);
        } else {
          setStats(data);
        }
      })
      .catch(() => {
        setApiError('Could not reach the server.');
        show('Failed to load stats', 'err');
      })
      .finally(() => setLoading(false));
  }, [show]);

  if (loading) return <div className={styles.loading}>Loading stats…</div>;
  if (apiError || !stats) return (
    <div className={styles.loading} style={{ color: '#CC0000' }}>
      ⚠ Failed to load stats{apiError ? `: ${apiError}` : ''}.<br />
      <span style={{ fontSize: 12, color: '#888', marginTop: 8, display: 'block' }}>
        Check that the backend DATABASE_URL environment variable is set on Render.
      </span>
    </div>
  );

  const cards = [
    { label: 'Total Orders', value: stats.totalOrders, color: '#3B82F6' },
    { label: 'Pending Orders', value: stats.pendingOrders, color: '#F5C400' },
    { label: 'Total Revenue', value: fmt(stats.totalRevenue), color: '#22C55E' },
    { label: 'Total Products', value: stats.totalProducts, color: '#8B5CF6' },
    { label: 'Out of Stock', value: stats.outOfStock, color: '#CC0000' },
    { label: 'Active Coupons', value: stats.activeCoupons, color: '#F97316' },
  ];

  // Safe fallbacks — never crash if API returns partial data
  const recentOrders = Array.isArray(stats.recentOrders) ? stats.recentOrders : [];
  const outOfStockProducts = Array.isArray(stats.outOfStockProducts) ? stats.outOfStockProducts : [];

  return (
    <div>
      <h2 className={styles.sectionTitle}>Overview</h2>
      <div className={styles.statGrid}>
        {cards.map(c => (
          <div key={c.label} className={styles.statCard} style={{ borderTop: `3px solid ${c.color}` }}>
            <span className={styles.statLabel}>{c.label}</span>
            <span className={styles.statValue} style={{ color: c.color }}>{c.value}</span>
          </div>
        ))}
      </div>

      <h3 className={styles.subTitle}>Recent Orders</h3>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {recentOrders.length === 0
              ? <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: '20px' }}>No recent orders</td></tr>
              : recentOrders.map(o => (
                <tr key={o.id}>
                  <td className={styles.mono}>{o.orderId}</td>
                  <td>{o.shippingName}</td>
                  <td>{fmt(Number(o.totalAmount))}</td>
                  <td><span className={styles.badge} style={{ background: statusColor(o.status) }}>{o.status}</span></td>
                  <td>{fmtDate(o.createdAt)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {outOfStockProducts.length > 0 && (
        <>
          <h3 className={styles.subTitle}>Out of Stock</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Product</th><th>Category</th><th>Brand</th></tr></thead>
              <tbody>
                {outOfStockProducts.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td>{p.brand?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ORDERS SECTION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function OrdersSection({ show }: { show: (m: string, t?: 'ok' | 'err') => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [noteOrder, setNoteOrder] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api('/api/admin/orders').then(r => r.json()).then(d => { setOrders(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => { show('Failed to load orders', 'err'); setLoading(false); });
  }, [show]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId: string, status: string) => {
    setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status } : o));
    const res = await api(`/api/admin/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (!res.ok) { show('Failed to update status', 'err'); load(); } else show(`Status â†’ ${status}`);
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm(`Delete order ${orderId}?`)) return;
    const res = await api(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
    if (res.ok) { setOrders(prev => prev.filter(o => o.orderId !== orderId)); show('Order deleted'); }
    else show('Failed to delete', 'err');
  };

  const saveNote = async () => {
    if (!noteOrder || !noteText.trim()) return;
    const res = await api(`/api/admin/orders/${noteOrder}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: noteText.trim() }) });
    if (res.ok) { show('Note saved'); setNoteOrder(null); setNoteText(''); load(); }
    else show('Failed to save note', 'err');
  };

  const STATUSES = ['All', 'Pending', 'Verified', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
  const filtered = orders.filter(o => {
    if (filter !== 'All' && !o.status.toLowerCase().includes(filter.toLowerCase())) return false;
    const q = search.toLowerCase();
    return !q || o.orderId.toLowerCase().includes(q) || (o.shippingName || '').toLowerCase().includes(q) || (o.shippingPhone || '').includes(q);
  });

  return (
    <div>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Orders</h2>
        <input className={styles.searchInput} placeholder="Search ID, name, phone…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className={styles.filterRow}>
        {STATUSES.map(s => <button key={s} className={`${styles.filterBtn} ${filter === s ? styles.filterActive : ''}`} onClick={() => setFilter(s)}>{s}</button>)}
      </div>
      {loading ? <div className={styles.loading}>Loading…</div> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Order ID</th><th>Customer</th><th>Phone</th><th>Product</th><th>Size</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td className={styles.mono}>{o.orderId}</td>
                  <td>{o.shippingName}</td>
                  <td><a href={`https://wa.me/91${(o.shippingPhone || '').replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noopener" className={styles.phoneLink}>{o.shippingPhone}</a></td>
                  <td>{o.product?.name || '"”'}</td>
                  <td>{o.size || '"”'}</td>
                  <td>{fmt(Number(o.totalAmount))}</td>
                  <td><span className={styles.badge} style={{ background: statusColor(o.status) }}>{o.status}</span></td>
                  <td>{fmtDate(o.createdAt)}</td>
                  <td>
                    <div className={styles.actionRow}>
                      <select className={styles.statusSelect} value={o.status} onChange={e => updateStatus(o.orderId, e.target.value)}>
                        {['Confirmed', 'Shipped', 'Delivered', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                      </select>
                      <button className={styles.iconBtn} title="Add note" onClick={() => { setNoteOrder(o.orderId); setNoteText(''); }}>📝</button>
                      <button className={styles.iconBtn} title="View details" onClick={() => setDetailOrder(o)}>👁</button>
                      <a className={styles.iconBtn} href={`https://wa.me/91${(o.shippingPhone || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hi, your UrbanEx order ${o.orderId} status: ${o.status}`)}`} target="_blank" rel="noopener">💬</a>
                      <button className={styles.iconBtnDanger} title="Delete" onClick={() => deleteOrder(o.orderId)}>🗑</button>
                    </div>
                    {o.notes && (() => { try { const ns = JSON.parse(o.notes!); return ns.length > 0 ? <div className={styles.notesList}>{ns.map((n: { text: string; createdAt: string }, i: number) => <div key={i} className={styles.noteItem}><span>{n.text}</span><span className={styles.noteTime}>{fmtDate(n.createdAt)}</span></div>)}</div> : null; } catch { return null; } })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Note modal */}
      {noteOrder && (
        <div className={styles.modalOverlay} onClick={() => setNoteOrder(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Add Note "” {noteOrder}</h3>
            <textarea className={styles.noteInput} rows={4} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Internal note (not shown to customer)…" autoFocus />
            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={saveNote}>SAVE NOTE</button>
              <button className={styles.btnSecondary} onClick={() => setNoteOrder(null)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailOrder && (
        <div className={styles.modalOverlay} onClick={() => setDetailOrder(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Order {detailOrder.orderId}</h3>
            <div className={styles.detailGrid}>
              {[['Customer', detailOrder.shippingName], ['Phone', detailOrder.shippingPhone], ['Email', detailOrder.shippingEmail], ['Address', detailOrder.shippingAddress], ['Product', detailOrder.product?.name], ['Size', detailOrder.size], ['Amount', fmt(Number(detailOrder.totalAmount))], ['Paid', detailOrder.amountPaid ? fmt(Number(detailOrder.amountPaid)) : '"”'], ['UTR', detailOrder.utrNumber || '"”'], ['Payment', detailOrder.paymentMethod || '"”'], ['Coupon', detailOrder.couponCode ? `${detailOrder.couponCode} (-${fmt(Number(detailOrder.discountAmount))})` : '"”'], ['Status', detailOrder.status], ['Date', fmtDate(detailOrder.createdAt)]].map(([k, v]) => (
                <div key={k as string} className={styles.detailRow}><span className={styles.detailKey}>{k}</span><span>{v || '"”'}</span></div>
              ))}
            </div>
            <button className={styles.btnSecondary} onClick={() => setDetailOrder(null)}>CLOSE</button>
          </div>
        </div>
      )}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PRODUCTS SECTION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ════════════════════════════════════════════════════════════════
// MANAGE PAYMENTS SECTION — screenshots by customer
// ════════════════════════════════════════════════════════════════
function PaymentsSection({ show }: { show: (m: string, t?: 'ok' | 'err') => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyWithProof, setOnlyWithProof] = useState(false);
  const [zoom, setZoom] = useState<{ src: string; name: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api('/api/admin/orders').then(r => r.json()).then(d => { setOrders(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => { show('Failed to load payments', 'err'); setLoading(false); });
  }, [show]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId: string, status: string) => {
    setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status } : o));
    const res = await api(`/api/admin/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (!res.ok) { show('Failed to update', 'err'); load(); } else show(`Status -> ${status}`);
  };

  const filtered = orders.filter(o => {
    if (onlyWithProof && !o.paymentScreenshot) return false;
    const q = search.toLowerCase();
    return !q || (o.shippingName || '').toLowerCase().includes(q) || o.orderId.toLowerCase().includes(q) || (o.utrNumber || '').includes(q);
  });

  return (
    <div>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Manage Payments</h2>
        <input className={styles.searchInput} placeholder="Search name, order ID, UTR..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className={styles.filterRow}>
        <button className={`${styles.filterBtn} ${!onlyWithProof ? styles.filterActive : ''}`} onClick={() => setOnlyWithProof(false)}>All</button>
        <button className={`${styles.filterBtn} ${onlyWithProof ? styles.filterActive : ''}`} onClick={() => setOnlyWithProof(true)}>With Screenshot</button>
      </div>

      {loading ? <div className={styles.loading}>Loading...</div> : filtered.length === 0 ? (
        <div className={styles.loading} style={{ color: '#888' }}>No payments found.</div>
      ) : (
        <div className={styles.payGrid}>
          {filtered.map(o => (
            <div key={o.id} className={styles.payCard}>
              <div className={styles.payShot}>
                {o.paymentScreenshot ? (
                  <img src={o.paymentScreenshot} alt={`Payment by ${o.shippingName}`} onClick={() => setZoom({ src: o.paymentScreenshot!, name: o.shippingName })} />
                ) : (
                  <div className={styles.payNoShot}>No screenshot uploaded</div>
                )}
              </div>
              <div className={styles.payInfo}>
                <span className={styles.payName}>{o.shippingName}</span>
                <span className={styles.payMeta}>{o.orderId} · {fmt(Number(o.amountPaid || o.totalAmount))}</span>
                <span className={styles.payUtr}>UTR: {o.utrNumber || '-'}</span>
                <a className={styles.payPhone} href={`https://wa.me/91${(o.shippingPhone || '').replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noopener">{o.shippingPhone}</a>
                <span className={styles.badge} style={{ background: statusColor(o.status), alignSelf: 'flex-start' }}>{o.status}</span>
                <select className={styles.statusSelect} value={o.status} onChange={e => updateStatus(o.orderId, e.target.value)}>
                  {['Pending Verification', 'Verified', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {zoom && (
        <div className={styles.modalOverlay} onClick={() => setZoom(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3 className={styles.modalTitle}>{zoom.name} — Payment Proof</h3>
            <img src={zoom.src} alt="Payment screenshot" style={{ width: '100%', border: '2px solid #111' }} />
            <div className={styles.modalActions}>
              <a className={styles.btnPrimary} href={zoom.src} download target="_blank" rel="noopener" style={{ textDecoration: 'none', textAlign: 'center' }}>OPEN / DOWNLOAD</a>
              <button className={styles.btnSecondary} onClick={() => setZoom(null)}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CATEGORIES = ['sneakers', 'watches', 'luxury-watches', 'glasses', 'handbags', 'clothing', 'ua-batch'];
const SNEAKER_SIZES = ['6', '7', '8', '9', '10', '11', '12'];
const APPAREL_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

function ProductForm({ brands, initial, onSave, onClose }: { brands: Brand[]; initial?: Product | null; onSave: (data: Record<string, unknown>) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name || '', slug: initial?.slug || '', category: initial?.category || 'sneakers',
    brandId: initial?.brandId || (brands[0]?.id || 0), description: initial?.description || '',
    price: initial?.price || '', originalPrice: initial?.originalPrice || '',
    isFeatured: initial?.isFeatured || false, inStock: initial?.inStock ?? true,
    images: initial?.images || [] as string[], imageUrl: '',
    sizes: initial?.sizes || {} as Record<string, string[]>,
    colors: initial?.colors || [] as { name: string; hex: string }[],
    colorName: '', colorHex: '#000000',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const sizeOptions = form.category === 'sneakers' || form.category === 'ua-batch' ? SNEAKER_SIZES
    : form.category === 'clothing' ? APPAREL_SIZES : null;

  const toggleSize = (s: string) => {
    const key = sizeOptions === SNEAKER_SIZES ? 'US' : 'US';
    const cur: string[] = (form.sizes as Record<string, string[]>)[key] || [];
    const next = cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s];
    set('sizes', sizeOptions ? { [key]: next } : { oneSize: ['One Size'] });
  };

  // Append safely using a functional update so parallel uploads don't overwrite each other
  const appendImage = (url: string) => setForm(f => ({ ...f, images: [...f.images, url] }));

  const addImageUrl = () => {
    if (form.imageUrl.trim()) { appendImage(form.imageUrl.trim()); set('imageUrl', ''); }
  };

  const uploadToCloudinary = async (file: File) => {
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloud || !preset) {
      alert('Image upload isn\'t configured yet. Cloudinary environment variables are missing on this deployment. For now, paste an image URL below instead.');
      return;
    }
    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Image is too large (max 10MB).'); return; }
    setUploading(true);
    const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', preset);
    try {
      const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: fd });
      const d = await r.json();
      if (d.secure_url) {
        appendImage(d.secure_url);
      } else {
        const msg = d?.error?.message || 'Unknown error';
        alert(`Upload failed: ${msg}. Check that your upload preset is set to "Unsigned" in Cloudinary.`);
      }
    } catch {
      alert('Upload failed: could not reach Cloudinary. Check your internet connection.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const sizes = sizeOptions ? form.sizes : { oneSize: ['One Size'] };
    await onSave({ name: form.name, slug: form.slug, category: form.category, brandId: Number(form.brandId), description: form.description, price: Number(form.price), originalPrice: form.originalPrice ? Number(form.originalPrice) : null, isFeatured: form.isFeatured, inStock: form.inStock, images: form.images, sizes, colors: form.colors });
    setSaving(false);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalLarge} onClick={e => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>{initial ? 'Edit Product' : 'Add Product'}</h3>
        <form onSubmit={submit} className={styles.formGrid}>
          <div className={styles.formGroup}><label>Name *</label><input value={form.name} onChange={e => { set('name', e.target.value); set('slug', slugify(e.target.value)); }} required /></div>
          <div className={styles.formGroup}><label>Slug *</label><input value={form.slug} onChange={e => set('slug', e.target.value)} required /></div>
          <div className={styles.formGroup}><label>Category *</label><select value={form.category} onChange={e => set('category', e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
          <div className={styles.formGroup}><label>Brand *</label><select value={form.brandId} onChange={e => set('brandId', e.target.value)}>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div className={`${styles.formGroup} ${styles.fullWidth}`}><label>Description</label><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} /></div>
          <div className={styles.formGroup}><label>Price (â‚¹) *</label><input type="number" value={form.price} onChange={e => set('price', e.target.value)} required /></div>
          <div className={styles.formGroup}><label>Original Price (â‚¹)</label><input type="number" value={form.originalPrice} onChange={e => set('originalPrice', e.target.value)} /></div>

          {sizeOptions && (
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label>Sizes</label>
              <div className={styles.checkRow}>
                {sizeOptions.map(s => { const key = sizeOptions === SNEAKER_SIZES ? 'US' : 'US'; const sel = ((form.sizes as Record<string, string[]>)[key] || []).includes(s); return <label key={s} className={styles.checkLabel}><input type="checkbox" checked={sel} onChange={() => toggleSize(s)} />{s}</label>; })}
              </div>
            </div>
          )}

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Colors</label>
            <div className={styles.colorRow}>
              <input placeholder="Color name" value={form.colorName} onChange={e => set('colorName', e.target.value)} className={styles.colorNameInput} />
              <input type="color" value={form.colorHex} onChange={e => set('colorHex', e.target.value)} className={styles.colorPicker} />
              <button type="button" className={styles.btnSmall} onClick={() => { if (form.colorName) { set('colors', [...form.colors, { name: form.colorName, hex: form.colorHex }]); set('colorName', ''); } }}>+ Add</button>
            </div>
            <div className={styles.colorChips}>{form.colors.map((c, i) => <span key={i} className={styles.colorChip} style={{ background: c.hex }}>{c.name} <button type="button" onClick={() => set('colors', form.colors.filter((_, j) => j !== i))}>Ã—</button></span>)}</div>
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Images</label>
            <div className={styles.imageUploadArea} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); Array.from(e.dataTransfer.files).forEach(f => uploadToCloudinary(f)); }}>
              <p>{uploading ? 'Uploading…' : 'Drag & drop images here, or'}</p>
              <input type="file" accept="image/*" multiple onChange={e => Array.from(e.target.files || []).forEach(f => uploadToCloudinary(f))} className={styles.fileInput} />
            </div>
            <div className={styles.urlRow}>
              <input placeholder="Or paste image URL" value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} />
              <button type="button" className={styles.btnSmall} onClick={addImageUrl}>+ Add URL</button>
            </div>
            <div className={styles.imagePreviews}>{form.images.map((img, i) => <div key={i} className={styles.imgThumb}><img src={img} alt="" /><button type="button" onClick={() => set('images', form.images.filter((_, j) => j !== i))}>Ã—</button></div>)}</div>
          </div>

          <div className={styles.formGroup}><label className={styles.toggleLabel}><input type="checkbox" checked={form.isFeatured} onChange={e => set('isFeatured', e.target.checked)} /> Featured</label></div>
          <div className={styles.formGroup}><label className={styles.toggleLabel}><input type="checkbox" checked={form.inStock} onChange={e => set('inStock', e.target.checked)} /> In Stock</label></div>

          <div className={`${styles.modalActions} ${styles.fullWidth}`}>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? 'SAVING…' : 'SAVE PRODUCT'}</button>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>CANCEL</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProductsSection({ show }: { show: (m: string, t?: 'ok' | 'err') => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [bulkModal, setBulkModal] = useState<'brand' | 'category' | null>(null);
  const [bulkBrandId, setBulkBrandId] = useState('');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api('/api/products').then(r => r.json()), api('/api/brands').then(r => r.json())])
      .then(([p, b]) => { setProducts(Array.isArray(p) ? p : []); setBrands(Array.isArray(b) ? b : []); })
      .catch(() => show('Failed to load', 'err')).finally(() => setLoading(false));
  }, [show]);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.brand?.name || '').toLowerCase().includes(q);
    const matchCat = !filterCat || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const allFilteredIds = filtered.map(p => p.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const someSelected = allFilteredIds.some(id => selected.has(id));

  const toggleOne = (id: number) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll = () => {
    if (allSelected) setSelected(prev => { const s = new Set(prev); allFilteredIds.forEach(id => s.delete(id)); return s; });
    else setSelected(prev => { const s = new Set(prev); allFilteredIds.forEach(id => s.add(id)); return s; });
  };
  const clearSelection = () => setSelected(new Set());

  const saveProduct = async (data: Record<string, unknown>) => {
    const isEdit = editing && editing.id;
    const res = await api(isEdit ? `/api/products/${editing!.id}` : '/api/products', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (res.ok) { show(isEdit ? 'Product updated' : 'Product created'); setEditing(undefined); load(); }
    else show('Failed to save', 'err');
  };

  const deleteProduct = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await api(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) { setProducts(p => p.filter(x => x.id !== id)); setSelected(prev => { const s = new Set(prev); s.delete(id); return s; }); show('Deleted'); }
    else show('Failed to delete', 'err');
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} selected products? This cannot be undone.`)) return;
    let ok = 0, fail = 0;
    for (const id of Array.from(selected)) { const res = await api(`/api/products/${id}`, { method: 'DELETE' }); res.ok ? ok++ : fail++; }
    show(fail > 0 ? `Deleted ${ok}, failed ${fail}` : `Deleted ${ok} products`);
    clearSelection(); load();
  };

  const bulkApplyBrand = async () => {
    if (!bulkBrandId) return;
    setBulkSaving(true);
    let ok = 0, fail = 0;
    for (const id of Array.from(selected)) {
      const p = products.find(x => x.id === id); if (!p) continue;
      const res = await api(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, brandId: Number(bulkBrandId) }) });
      res.ok ? ok++ : fail++;
    }
    setBulkSaving(false); setBulkModal(null); setBulkBrandId('');
    show(fail > 0 ? `Updated ${ok}, failed ${fail}` : `Brand updated on ${ok} products`);
    clearSelection(); load();
  };

  const bulkApplyCategory = async () => {
    if (!bulkCategory) return;
    setBulkSaving(true);
    let ok = 0, fail = 0;
    for (const id of Array.from(selected)) {
      const p = products.find(x => x.id === id); if (!p) continue;
      const res = await api(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, category: bulkCategory }) });
      res.ok ? ok++ : fail++;
    }
    setBulkSaving(false); setBulkModal(null); setBulkCategory('');
    show(fail > 0 ? `Updated ${ok}, failed ${fail}` : `Category updated on ${ok} products`);
    clearSelection(); load();
  };

  const bulkSetFeatured = async (isFeatured: boolean) => {
    setBulkSaving(true);
    let ok = 0, fail = 0;
    for (const id of Array.from(selected)) {
      const p = products.find(x => x.id === id); if (!p) continue;
      const res = await api(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, isFeatured }) });
      res.ok ? ok++ : fail++;
    }
    setBulkSaving(false);
    const label = isFeatured ? 'Featured' : 'Unfeatured';
    show(fail > 0 ? `${label} ${ok}, failed ${fail}` : `${label} ${ok} products`);
    clearSelection(); load();
  };

  const toggleFeatured = async (p: Product) => {
    const res = await api(`/api/products/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, isFeatured: !p.isFeatured }) });
    if (res.ok) { setProducts(prev => prev.map(x => x.id === p.id ? { ...x, isFeatured: !x.isFeatured } : x)); }
  };

  const toggleStock = async (p: Product) => {
    const res = await api(`/api/products/${p.id}/stock`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inStock: !p.inStock }) });
    if (res.ok) { setProducts(prev => prev.map(x => x.id === p.id ? { ...x, inStock: !x.inStock } : x)); }
  };

  const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  return (
    <div>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Products ({products.length})</h2>
        <button className={styles.btnPrimary} onClick={() => setEditing(null)}>+ ADD PRODUCT</button>
      </div>

      {/* Search + filter */}
      <div className={styles.filterRow} style={{ marginBottom: 12 }}>
        <input className={styles.searchInput} placeholder="Search name or brand…" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 220 }} />
        <select className={styles.statusSelect} value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: '8px 12px', fontSize: 13 }}>
          <option value="">All categories</option>
          {uniqueCategories.map(c => <option key={c} value={c!}>{c}</option>)}
        </select>
        {(search || filterCat) && <button className={styles.btnSmall} onClick={() => { setSearch(''); setFilterCat(''); }}>Clear</button>}
        <button
          className={styles.btnSmall}
          onClick={() => setSelectionMode(m => !m)}
          style={{ marginLeft: 8, background: selectionMode ? '#CC0000' : undefined, color: selectionMode ? '#fff' : undefined, borderColor: selectionMode ? '#CC0000' : undefined }}
        >
          {selectionMode ? '✓ Selection Mode ON' : '☐ Selection Mode'}
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#888' }}>{filtered.length} shown</span>
      </div>
      {selectionMode && (
        <div style={{ fontSize: 12, color: '#CC0000', letterSpacing: 1, padding: '6px 14px', background: 'rgba(204,0,0,0.08)', border: '1px solid rgba(204,0,0,0.25)', marginBottom: 10 }}>
          Selection Mode ON — click anywhere on a row to select products
        </div>
      )}

      {/* Bulk action bar */}
      {someSelected && (
        <div className={styles.bulkBar}>
          <span style={{ fontWeight: 700, color: '#fff' }}>{selected.size} selected</span>
          <button className={styles.btnSmall} onClick={clearSelection}>Deselect All</button>
          <button className={styles.btnSmall} onClick={() => setBulkModal('brand')} disabled={bulkSaving}>Change Brand</button>
          <button className={styles.btnSmall} onClick={() => setBulkModal('category')} disabled={bulkSaving}>Change Category</button>
          <button className={styles.btnSmall} onClick={() => bulkSetFeatured(true)} disabled={bulkSaving}
            style={{ background: '#F5C400', color: '#111', borderColor: '#F5C400' }}>
            {bulkSaving ? '…' : '★ Feature Selected'}
          </button>
          <button className={styles.btnSmall} onClick={() => bulkSetFeatured(false)} disabled={bulkSaving}
            style={{ background: '#2a2a2a', color: '#aaa', borderColor: '#444' }}>
            {bulkSaving ? '…' : '☆ Unfeature Selected'}
          </button>
          <button className={styles.btnDanger} onClick={bulkDelete} disabled={bulkSaving}>Delete Selected</button>
        </div>
      )}

      {loading ? <div className={styles.loading}>Loading…</div> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll} title="Select all visible" />
                </th>
                <th>Image</th><th>Name</th><th>Category</th><th>Brand</th><th>Price</th><th>Orig.</th><th>Source</th><th>Featured</th><th>Stock</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr
                  key={p.id}
                  onClick={selectionMode ? () => toggleOne(p.id) : undefined}
                  style={{
                    ...(selected.has(p.id) ? { background: 'rgba(204,0,0,0.13)', outline: '1px solid rgba(204,0,0,0.4)' } : undefined),
                    ...(selectionMode ? { cursor: 'pointer' } : undefined),
                  }}
                >
                  <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} /></td>
                  <td><img src={p.images?.[0]} alt="" className={styles.thumbImg} /></td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.brand?.name}</td>
                  <td>{fmt(p.price)}</td>
                  <td>{p.originalPrice ? fmt(p.originalPrice) : '"”'}</td>
                  <td>{p.source ? <span className={styles.badge} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#aaa', fontSize: 10 }}>{p.source}</span> : '"”'}</td>
                  <td><button className={`${styles.toggle} ${p.isFeatured ? styles.toggleOn : ''}`} onClick={() => toggleFeatured(p)}>{p.isFeatured ? '★' : '☆'}</button></td>
                  <td><button className={`${styles.toggle} ${p.inStock ? styles.toggleOn : styles.toggleOff}`} onClick={() => toggleStock(p)}>{p.inStock ? 'IN' : 'OUT'}</button></td>
                  <td>
                    <div className={styles.actionRow}>
                      <button className={styles.btnSmall} onClick={() => setEditing(p)}>Edit</button>
                      <button className={styles.btnDanger} onClick={() => deleteProduct(p.id, p.name)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk change brand modal */}
      {bulkModal === 'brand' && (
        <div className={styles.modalOverlay} onClick={() => setBulkModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Change Brand "” {selected.size} products</h3>
            <div className={styles.formGroup}>
              <label>New Brand</label>
              <select value={bulkBrandId} onChange={e => setBulkBrandId(e.target.value)}>
                <option value="">Select brand…</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={bulkApplyBrand} disabled={!bulkBrandId || bulkSaving}>{bulkSaving ? 'SAVING…' : `APPLY TO ${selected.size} PRODUCTS`}</button>
              <button className={styles.btnSecondary} onClick={() => setBulkModal(null)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk change category modal */}
      {bulkModal === 'category' && (
        <div className={styles.modalOverlay} onClick={() => setBulkModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Change Category "” {selected.size} products</h3>
            <div className={styles.formGroup}>
              <label>New Category</label>
              <select value={bulkCategory} onChange={e => setBulkCategory(e.target.value)}>
                <option value="">Select category…</option>
                {['sneakers','watches','luxury-watches','glasses','handbags','clothing','ua-batch'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={bulkApplyCategory} disabled={!bulkCategory || bulkSaving}>{bulkSaving ? 'SAVING…' : `APPLY TO ${selected.size} PRODUCTS`}</button>
              <button className={styles.btnSecondary} onClick={() => setBulkModal(null)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {editing !== undefined && <ProductForm brands={brands} initial={editing} onSave={saveProduct} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ══════════════════════════════════════════════════════════════════
// CATEGORIES SECTION
// ══════════════════════════════════════════════════════════════════
function CategoriesSection({ show }: { show: (m: string, t?: 'ok' | 'err') => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api('/api/categories')
      .then(r => r.json())
      .then(d => setCategories(Array.isArray(d) ? d : []))
      .catch(() => show('Failed to load categories', 'err'))
      .finally(() => setLoading(false));
  }, [show]);

  useEffect(() => { load(); }, [load]);

  const filtered = categories.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
  });

  const allFilteredIds = filtered.map(c => c.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const someSelected = allFilteredIds.some(id => selected.has(id));

  const toggleOne = (id: number) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll = () => {
    if (allSelected) setSelected(prev => { const s = new Set(prev); allFilteredIds.forEach(id => s.delete(id)); return s; });
    else setSelected(prev => { const s = new Set(prev); allFilteredIds.forEach(id => s.add(id)); return s; });
  };
  const clearSelection = () => setSelected(new Set());

  const deleteCategory = async (id: number, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    const res = await api(`/api/categories/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (res.ok) { setCategories(prev => prev.filter(c => c.id !== id)); show('Category deleted'); }
    else show(d.error || 'Failed to delete', 'err');
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} selected categories?`)) return;
    setBulkSaving(true);
    let ok = 0, fail = 0;
    for (const id of Array.from(selected)) {
      const res = await api(`/api/categories/${id}`, { method: 'DELETE' });
      res.ok ? ok++ : fail++;
    }
    setBulkSaving(false);
    show(fail > 0 ? `Deleted ${ok}, failed ${fail}` : `Deleted ${ok} categories`);
    clearSelection(); load();
  };

  const bulkSetFeatured = async (featured: boolean) => {
    setBulkSaving(true);
    let ok = 0, fail = 0;
    for (const id of Array.from(selected)) {
      const cat = categories.find(c => c.id === id); if (!cat) continue;
      const res = await api(`/api/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...cat, featured }) });
      res.ok ? ok++ : fail++;
    }
    setBulkSaving(false);
    show(fail > 0 ? `Updated ${ok}, failed ${fail}` : `${featured ? 'Featured' : 'Unfeatured'} ${ok} categories`);
    clearSelection(); load();
  };

  const bulkSetActive = async (active: boolean) => {
    setBulkSaving(true);
    let ok = 0, fail = 0;
    for (const id of Array.from(selected)) {
      const cat = categories.find(c => c.id === id); if (!cat) continue;
      const res = await api(`/api/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...cat, active }) });
      res.ok ? ok++ : fail++;
    }
    setBulkSaving(false);
    show(fail > 0 ? `Updated ${ok}, failed ${fail}` : `${active ? 'Activated' : 'Deactivated'} ${ok} categories`);
    clearSelection(); load();
  };

  const saveCategory = async (data: Record<string, unknown>) => {
    const isEdit = editing && (editing as Category).id;
    const res = await api(
      isEdit ? `/api/categories/${(editing as Category).id}` : '/api/categories',
      { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
    );
    if (res.ok) { show(isEdit ? 'Category updated' : 'Category created'); setEditing(undefined); load(); }
    else { const d = await res.json(); show(d.error || 'Failed to save', 'err'); }
  };

  return (
    <div>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Categories ({categories.length})</h2>
        <button className={styles.btnPrimary} onClick={() => setEditing(null)}>+ ADD CATEGORY</button>
      </div>

      {/* Search + selection mode */}
      <div className={styles.filterRow} style={{ marginBottom: 12 }}>
        <input className={styles.searchInput} placeholder="Search categories\u2026" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 220 }} />
        {search && <button className={styles.btnSmall} onClick={() => setSearch('')}>Clear</button>}
        <button
          className={styles.btnSmall}
          onClick={() => setSelectionMode(m => !m)}
          style={{ marginLeft: 8, background: selectionMode ? '#CC0000' : undefined, color: selectionMode ? '#fff' : undefined, borderColor: selectionMode ? '#CC0000' : undefined }}
        >
          {selectionMode ? '\u2713 Selection Mode ON' : '\u2610 Selection Mode'}
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#888' }}>{filtered.length} shown</span>
      </div>

      {selectionMode && (
        <div style={{ fontSize: 12, color: '#CC0000', letterSpacing: 1, padding: '6px 14px', background: 'rgba(204,0,0,0.08)', border: '1px solid rgba(204,0,0,0.25)', marginBottom: 10 }}>
          Selection Mode ON \u2014 click anywhere on a row to select categories
        </div>
      )}

      {/* Bulk action bar */}
      {someSelected && (
        <div className={styles.bulkBar}>
          <span style={{ fontWeight: 700, color: '#fff' }}>{selected.size} selected</span>
          <button className={styles.btnSmall} onClick={clearSelection}>Deselect All</button>
          <button className={styles.btnSmall} onClick={() => bulkSetFeatured(true)} disabled={bulkSaving}
            style={{ background: '#F5C400', color: '#111', borderColor: '#F5C400' }}>
            {bulkSaving ? '\u2026' : '\u2605 Feature Selected'}
          </button>
          <button className={styles.btnSmall} onClick={() => bulkSetFeatured(false)} disabled={bulkSaving}>
            {bulkSaving ? '\u2026' : '\u2606 Unfeature Selected'}
          </button>
          <button className={styles.btnSmall} onClick={() => bulkSetActive(true)} disabled={bulkSaving}
            style={{ background: '#22C55E', color: '#fff', borderColor: '#22C55E' }}>
            {bulkSaving ? '\u2026' : '\u2713 Activate'}
          </button>
          <button className={styles.btnSmall} onClick={() => bulkSetActive(false)} disabled={bulkSaving}>
            {bulkSaving ? '\u2026' : '\u2715 Deactivate'}
          </button>
          <button className={styles.btnDanger} onClick={bulkDelete} disabled={bulkSaving}>Delete Selected</button>
        </div>
      )}

      {loading ? <div className={styles.loading}>Loading\u2026</div> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll} />
                </th>
                <th>Image</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Parent</th>
                <th>Products</th>
                <th>Featured</th>
                <th>Status</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.id}
                  onClick={selectionMode ? () => toggleOne(c.id) : undefined}
                  style={{
                    ...(selected.has(c.id) ? { background: 'rgba(204,0,0,0.13)', outline: '1px solid rgba(204,0,0,0.4)' } : undefined),
                    ...(selectionMode ? { cursor: 'pointer' } : undefined),
                  }}
                >
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} />
                  </td>
                  <td>
                    {c.image
                      ? <img src={c.image} alt={c.name} className={styles.thumbImg} />
                      : <div style={{ width: 48, height: 48, background: '#1a1a1a', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>\uD83D\uDDC2\uFE0F</div>
                    }
                  </td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className={styles.mono} style={{ fontSize: 12, color: '#888' }}>{c.slug}</td>
                  <td style={{ fontSize: 12, color: '#888' }}>
                    {c.parentId ? (categories.find(p => p.id === c.parentId)?.name || '\u2014') : '\u2014'}
                  </td>
                  <td>
                    <span className={styles.badge} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#aaa' }}>
                      {c.productCount}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`${styles.toggle} ${c.featured ? styles.toggleOn : ''}`}
                      onClick={async () => {
                        const res = await api(`/api/categories/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...c, featured: !c.featured }) });
                        if (res.ok) setCategories(prev => prev.map(x => x.id === c.id ? { ...x, featured: !x.featured } : x));
                      }}
                    >{c.featured ? '\u2605' : '\u2606'}</button>
                  </td>
                  <td>
                    <button
                      className={`${styles.toggle} ${c.active ? styles.toggleOn : styles.toggleOff}`}
                      onClick={async () => {
                        const res = await api(`/api/categories/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...c, active: !c.active }) });
                        if (res.ok) setCategories(prev => prev.map(x => x.id === c.id ? { ...x, active: !x.active } : x));
                      }}
                    >{c.active ? 'ACTIVE' : 'OFF'}</button>
                  </td>
                  <td style={{ fontSize: 12, color: '#888' }}>{c.sortOrder}</td>
                  <td>
                    <div className={styles.actionRow}>
                      <button className={styles.btnSmall} onClick={() => setEditing(c)}>Edit</button>
                      <button className={styles.btnDanger} onClick={() => deleteCategory(c.id, c.name)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== undefined && (
        <CategoryForm
          categories={categories}
          initial={editing}
          onSave={saveCategory}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}

function CategoryForm({ categories, initial, onSave, onClose }: {
  categories: Category[];
  initial?: Category | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    slug: initial?.slug || '',
    description: initial?.description || '',
    image: initial?.image || '',
    parentId: initial?.parentId || '',
    featured: initial?.featured ?? false,
    active: initial?.active ?? true,
    sortOrder: initial?.sortOrder ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const uploadToCloudinary = async (file: File) => {
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloud || !preset) {
      alert("Image upload isn't configured yet. Cloudinary environment variables are missing on this deployment. For now, paste an image URL below instead.");
      return;
    }
    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Image is too large (max 10MB).'); return; }
    setUploading(true);
    const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', preset);
    try {
      const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: fd });
      const d = await r.json();
      if (d.secure_url) {
        set('image', d.secure_url);
      } else {
        const msg = d?.error?.message || 'Unknown error';
        alert(`Upload failed: ${msg}. Check that your upload preset is set to "Unsigned" in Cloudinary.`);
      }
    } catch {
      alert('Upload failed: could not reach Cloudinary. Check your internet connection.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      image: form.image || null,
      parentId: form.parentId ? Number(form.parentId) : null,
      featured: form.featured,
      active: form.active,
      sortOrder: Number(form.sortOrder),
    });
    setSaving(false);
  };

  // Exclude self from parent options to prevent circular reference
  const parentOptions = categories.filter(c => !initial || c.id !== initial.id);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>{initial ? 'Edit Category' : 'Add Category'}</h3>
        <form onSubmit={submit} className={styles.formStack}>
          <div className={styles.formGroup}>
            <label>Name *</label>
            <input value={form.name} onChange={e => { set('name', e.target.value); if (!initial) set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')); }} required />
          </div>
          <div className={styles.formGroup}>
            <label>Slug *</label>
            <input value={form.slug} onChange={e => set('slug', e.target.value)} required />
          </div>
          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} />
          </div>
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Image (Upload or URL)</label>
            <div className={styles.imageUploadArea} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.[0]) uploadToCloudinary(e.dataTransfer.files[0]); }}>
              <p>{uploading ? 'Uploading...' : 'Drag & drop image here, or'}</p>
              <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) uploadToCloudinary(e.target.files[0]); }} className={styles.fileInput} />
            </div>
            <input value={form.image || ''} onChange={e => set('image', e.target.value)} placeholder="Or paste image https://..." style={{ marginTop: 8 }} />
            {form.image && <img src={form.image} alt="preview" className={styles.logoPreview} style={{ marginTop: 8 }} />}
          </div>
          <div className={styles.formGroup}>
            <label>Parent Category</label>
            <select value={form.parentId} onChange={e => set('parentId', e.target.value)}>
              <option value="">None (top-level)</option>
              {parentOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Sort Order</label>
            <input type="number" value={form.sortOrder} onChange={e => set('sortOrder', e.target.value)} min={0} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.toggleLabel}>
              <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} /> Featured
            </label>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.toggleLabel}>
              <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} /> Active
            </label>
          </div>
          <div className={styles.modalActions}>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? 'SAVING\u2026' : 'SAVE CATEGORY'}</button>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>CANCEL</button>
          </div>
        </form>
      </div>
    </div>
  );
}


function BrandsSection({ show }: { show: (m: string, t?: 'ok' | 'err') => void }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', slug: '', logoUrl: '', isFeatured: false });
  const [editing, setEditing] = useState<Brand | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    api('/api/brands').then(r => r.json()).then(d => setBrands(Array.isArray(d) ? d : [])).catch(() => show('Failed', 'err')).finally(() => setLoading(false));
  }, [show]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm({ name: '', slug: '', logoUrl: '', isFeatured: false }); setEditing(null); setShowForm(true); };
  const openEdit = (b: Brand) => { setForm({ name: b.name, slug: b.slug, logoUrl: b.logoUrl || '', isFeatured: b.isFeatured || false }); setEditing(b); setShowForm(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api(editing ? `/api/brands/${editing.id}` : '/api/brands', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { show(editing ? 'Brand updated' : 'Brand created'); setShowForm(false); load(); }
    else show('Failed to save', 'err');
  };

  const deleteBrand = async (id: number, name: string) => {
    try {
      // First attempt - check if confirmation needed
      const res = await api(`/api/brands/${id}`, { method: 'DELETE' });
      
      if (res.status === 409) {
        // Confirmation required
        const errorData = await res.json();
        if (errorData.error === 'confirmation_required') {
          const productCount = errorData.productCount || 0;
          const confirmMsg = `⚠️ WARNING: This brand "${name}" has ${productCount} product(s).\n\nDeleting this brand will PERMANENTLY DELETE all ${productCount} products.\n\nDo you want to continue?`;
          
          if (confirm(confirmMsg)) {
            // User confirmed - delete with confirmation
            const confirmRes = await api(`/api/brands/${id}?confirm=true`, { method: 'DELETE' });
            if (confirmRes.ok) {
              const result = await confirmRes.json();
              setBrands(b => b.filter(x => x.id !== id));
              show(`Deleted brand and ${result.deletedProducts} product(s)`);
            } else {
              const errData = await confirmRes.json().catch(() => ({}));
              show(errData.error || 'Failed to delete', 'err');
            }
          }
          return;
        }
      }
      
      if (res.ok) {
        // No products, deleted directly
        setBrands(b => b.filter(x => x.id !== id));
        show('Brand deleted');
      } else {
        const errorData = await res.json().catch(() => ({}));
        show(errorData.error || errorData.message || 'Failed to delete', 'err');
      }
    } catch (err) {
      console.error('Delete brand error:', err);
      show('Failed to delete', 'err');
    }
  };

  return (
    <div>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Brands</h2>
        <button className={styles.btnPrimary} onClick={openAdd}>+ ADD BRAND</button>
      </div>
      {loading ? <div className={styles.loading}>Loading…</div> : (
        <div className={styles.brandGrid}>
          {brands.map(b => (
            <div key={b.id} className={styles.brandCard}>
              <img src={b.logoUrl || ''} alt={b.name} className={styles.brandLogo} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className={styles.brandName}>{b.name}</div>
              <div className={styles.brandCount}>{b._count?.products || 0} products</div>
              <div className={styles.actionRow} style={{ marginTop: 8 }}>
                <button
                  className={`${styles.toggle} ${b.isFeatured ? styles.toggleOn : ''}`}
                  onClick={async () => {
                    const res = await api(`/api/brands/${b.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...b, isFeatured: !b.isFeatured }) });
                    if (res.ok) setBrands(prev => prev.map(x => x.id === b.id ? { ...x, isFeatured: !x.isFeatured } : x));
                  }}
                  style={{ width: '100%', marginBottom: 8 }}
                >{b.isFeatured ? '\u2605 Featured' : '\u2606 Feature'}</button>
              </div>
              <div className={styles.actionRow}>
                <button className={styles.btnSmall} onClick={() => openEdit(b)}>Edit</button>
                <button className={styles.btnDanger} onClick={() => deleteBrand(b.id, b.name)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{editing ? 'Edit Brand' : 'Add Brand'}</h3>
            <form onSubmit={save} className={styles.formStack}>
              <div className={styles.formGroup}><label>Name *</label><input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) })); }} required /></div>
              <div className={styles.formGroup}><label>Slug *</label><input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required /></div>
              <div className={styles.formGroup}><label>Logo URL</label><input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://…" /></div>
              {form.logoUrl && <img src={form.logoUrl} alt="preview" className={styles.logoPreview} />}
              <div className={styles.formGroup}><label className={styles.toggleLabel}><input type="checkbox" checked={form.isFeatured} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))} /> Featured</label></div>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.btnPrimary}>SAVE</button>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowForm(false)}>CANCEL</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// COUPONS SECTION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function CouponsSection({ show }: { show: (m: string, t?: 'ok' | 'err') => void }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const blank = { code: '', type: 'percentage', value: '', minimumOrder: '', maximumDiscount: '', usageLimit: '100', isActive: true, expiresAt: '' };
  const [form, setForm] = useState(blank);

  const load = useCallback(() => {
    api('/api/admin/coupons').then(r => r.json()).then(d => setCoupons(Array.isArray(d) ? d : [])).catch(() => show('Failed', 'err')).finally(() => setLoading(false));
  }, [show]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(blank); setEditing(null); setShowForm(true); };
  const openEdit = (c: Coupon) => {
    setForm({ code: c.code, type: c.type, value: String(c.value), minimumOrder: String(c.minimumOrder), maximumDiscount: c.maximumDiscount ? String(c.maximumDiscount) : '', usageLimit: String(c.usageLimit), isActive: c.isActive, expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '' });
    setEditing(c); setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { code: form.code.toUpperCase(), type: form.type, value: Number(form.value), minimumOrder: Number(form.minimumOrder) || 0, maximumDiscount: form.maximumDiscount ? Number(form.maximumDiscount) : null, usageLimit: Number(form.usageLimit) || 100, isActive: form.isActive, expiresAt: form.expiresAt || null };
    const res = await api(editing ? `/api/admin/coupons/${editing.id}` : '/api/admin/coupons', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { show(editing ? 'Coupon updated' : 'Coupon created'); setShowForm(false); load(); }
    else show('Failed to save', 'err');
  };

  const deleteCoupon = async (id: number, code: string) => {
    if (!confirm(`Delete coupon "${code}"?`)) return;
    const res = await api(`/api/admin/coupons/${id}`, { method: 'DELETE' });
    if (res.ok) { setCoupons(c => c.filter(x => x.id !== id)); show('Deleted'); }
    else show('Failed', 'err');
  };

  const toggleActive = async (c: Coupon) => {
    const res = await api(`/api/admin/coupons/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...c, isActive: !c.isActive }) });
    if (res.ok) setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, isActive: !x.isActive } : x));
  };

  return (
    <div>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Coupons</h2>
        <button className={styles.btnPrimary} onClick={openAdd}>+ ADD COUPON</button>
      </div>
      {loading ? <div className={styles.loading}>Loading…</div> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min Order</th><th>Usage</th><th>Active</th><th>Expires</th><th>Actions</th></tr></thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id}>
                  <td><span className={styles.couponCode} onClick={() => { navigator.clipboard.writeText(c.code); show('Copied!'); }}>{c.code}</span></td>
                  <td>{c.type === 'percentage' ? 'Percentage' : 'Fixed'}</td>
                  <td>{c.type === 'percentage' ? `${c.value}%` : fmt(Number(c.value))}</td>
                  <td>{fmt(Number(c.minimumOrder))}</td>
                  <td>{c.usedCount}/{c.usageLimit}</td>
                  <td><button className={`${styles.toggle} ${c.isActive ? styles.toggleOn : styles.toggleOff}`} onClick={() => toggleActive(c)}>{c.isActive ? 'ON' : 'OFF'}</button></td>
                  <td>{c.expiresAt ? fmtDate(c.expiresAt) : '"”'}</td>
                  <td>
                    <div className={styles.actionRow}>
                      <button className={styles.btnSmall} onClick={() => openEdit(c)}>Edit</button>
                      <button className={styles.btnDanger} onClick={() => deleteCoupon(c.id, c.code)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{editing ? 'Edit Coupon' : 'Add Coupon'}</h3>
            <form onSubmit={save} className={styles.formStack}>
              <div className={styles.formGroup}><label>Code *</label><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required /></div>
              <div className={styles.formGroup}><label>Type *</label><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select></div>
              <div className={styles.formGroup}><label>Value *</label><input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required /></div>
              <div className={styles.formGroup}><label>Min Order (â‚¹)</label><input type="number" value={form.minimumOrder} onChange={e => setForm(f => ({ ...f, minimumOrder: e.target.value }))} /></div>
              <div className={styles.formGroup}><label>Max Discount (â‚¹)</label><input type="number" value={form.maximumDiscount} onChange={e => setForm(f => ({ ...f, maximumDiscount: e.target.value }))} /></div>
              <div className={styles.formGroup}><label>Usage Limit</label><input type="number" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} /></div>
              <div className={styles.formGroup}><label>Expiry Date</label><input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} /></div>
              <div className={styles.formGroup}><label className={styles.toggleLabel}><input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} /> Active</label></div>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.btnPrimary}>SAVE</button>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowForm(false)}>CANCEL</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// INVENTORY SECTION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function InventorySection({ show }: { show: (m: string, t?: 'ok' | 'err') => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all');
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    api('/api/products').then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : [];
      setProducts(list);
      const p: Record<number, string> = {};
      list.forEach((x: Product) => { p[x.id] = String(x.price); });
      setPrices(p);
    }).catch(() => show('Failed', 'err')).finally(() => setLoading(false));
  }, [show]);

  useEffect(() => { load(); }, [load]);

  const toggleStock = async (p: Product) => {
    const res = await api(`/api/products/${p.id}/stock`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inStock: !p.inStock }) });
    if (res.ok) { setProducts(prev => prev.map(x => x.id === p.id ? { ...x, inStock: !x.inStock } : x)); show(p.inStock ? 'Marked out of stock' : 'Marked in stock'); }
    else show('Failed', 'err');
  };

  const savePrice = async (p: Product) => {
    const newPrice = Number(prices[p.id]);
    if (!newPrice || newPrice === p.price) return;
    const res = await api(`/api/products/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, price: newPrice }) });
    if (res.ok) { setProducts(prev => prev.map(x => x.id === p.id ? { ...x, price: newPrice } : x)); show('Price updated'); }
    else show('Failed', 'err');
  };

  const bulkStock = async (inStock: boolean) => {
    for (const id of Array.from(selected)) {
      await api(`/api/products/${id}/stock`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inStock }) });
    }
    show(`${selected.size} products updated`);
    setSelected(new Set());
    load();
  };

  const visible = products.filter(p => filter === 'all' ? true : filter === 'in' ? p.inStock : !p.inStock);
  const allSel = visible.length > 0 && visible.every(p => selected.has(p.id));

  return (
    <div>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Inventory</h2>
        <div className={styles.filterRow}>
          {(['all', 'in', 'out'] as const).map(f => <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'in' ? 'In Stock' : 'Out of Stock'}</button>)}
        </div>
      </div>
      {selected.size > 0 && (
        <div className={styles.bulkBar}>
          <span>{selected.size} selected</span>
          <button className={styles.btnSmall} onClick={() => bulkStock(true)}>Mark In Stock</button>
          <button className={styles.btnDanger} onClick={() => bulkStock(false)}>Mark Out of Stock</button>
          <button className={styles.btnSecondary} onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
      {loading ? <div className={styles.loading}>Loading…</div> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>
              <th><input type="checkbox" checked={allSel} onChange={e => setSelected(e.target.checked ? new Set(visible.map(p => p.id)) : new Set())} /></th>
              <th>Product</th><th>Category</th><th>Stock</th><th>Price (â‚¹)</th><th>Save</th>
            </tr></thead>
            <tbody>
              {visible.map(p => (
                <tr key={p.id}>
                  <td><input type="checkbox" checked={selected.has(p.id)} onChange={e => { const s = new Set(selected); e.target.checked ? s.add(p.id) : s.delete(p.id); setSelected(s); }} /></td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td><button className={`${styles.toggle} ${p.inStock ? styles.toggleOn : styles.toggleOff}`} onClick={() => toggleStock(p)}>{p.inStock ? 'IN STOCK' : 'OUT'}</button></td>
                  <td><input type="number" value={prices[p.id] || ''} onChange={e => setPrices(prev => ({ ...prev, [p.id]: e.target.value }))} className={styles.priceInput} /></td>
                  <td><button className={styles.btnSmall} onClick={() => savePrice(p)}>Save</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CSV IMPORT SECTION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const CSV_HEADERS = 'name,slug,category,brand_id,description,price,original_price,sizes,colors,is_featured,in_stock,images';
const CSV_EXAMPLE = '"Nike Air Force 1","nike-air-force-1","sneakers",1,"Classic white sneaker",8999,11999,"{""US"":[""7"",""8"",""9"",""10"",""11""]}","[{""name"":""White"",""hex"":""#FFFFFF""}]",true,true,"https://image1.jpg,https://image2.jpg"';
const VALID_CATS = new Set(['sneakers', 'watches', 'luxury-watches', 'glasses', 'handbags', 'clothing', 'ua-batch']);

interface CSVRow { name: string; slug: string; category: string; brand_id: string; description: string; price: string; original_price: string; sizes: string; colors: string; is_featured: string; in_stock: string; images: string; _errors?: string[]; }

function CSVSection({ show }: { show: (m: string, t?: 'ok' | 'err') => void }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [rows, setRows] = useState<CSVRow[]>([]);
  const [results, setResults] = useState<{ name: string; ok: boolean; msg: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');

  useEffect(() => { api('/api/brands').then(r => r.json()).then(d => setBrands(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  const downloadTemplate = () => {
    const blob = new Blob([CSV_HEADERS + '\n' + CSV_EXAMPLE], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'urbanex_products_template.csv'; a.click();
  };

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const vals: string[] = []; let cur = ''; let inQ = false;
      for (const ch of line) { if (ch === '"') inQ = !inQ; else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; } else cur += ch; }
      vals.push(cur.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = (vals[i] || '').replace(/^"|"$/g, ''); });
      const errors: string[] = [];
      if (!row.name) errors.push('Missing name');
      if (!row.category || !VALID_CATS.has(row.category)) errors.push('Invalid category');
      if (!row.brand_id || !brands.find(b => b.id === Number(row.brand_id))) errors.push('Invalid brand_id');
      if (!row.price || isNaN(Number(row.price))) errors.push('Invalid price');
      return { ...row, _errors: errors } as CSVRow;
    }).filter(r => r.name || r.category);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => { const parsed = parseCSV(e.target?.result as string); setRows(parsed); setStep('preview'); };
    reader.readAsText(file);
  };

  const importAll = async () => {
    const valid = rows.filter(r => !r._errors?.length);
    setImporting(true); setResults([]); setProgress(0);
    const res: typeof results = [];
    for (let i = 0; i < valid.length; i++) {
      const r = valid[i];
      try {
        let images: string[] = [];
        try { images = r.images ? r.images.split(',').map(s => s.trim()) : []; } catch { images = []; }
        let sizes = {}; try { sizes = JSON.parse(r.sizes); } catch { sizes = { oneSize: ['One Size'] }; }
        let colors: { name: string; hex: string }[] = []; try { colors = JSON.parse(r.colors); } catch { colors = []; }
        const resp = await api('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: r.name.trim(), slug: r.slug.trim() || slugify(r.name), category: r.category.trim(), brandId: Number(r.brand_id), description: r.description?.trim() || '', price: Number(r.price), originalPrice: r.original_price ? Number(r.original_price) : null, sizes, colors, isFeatured: r.is_featured === 'true', inStock: r.in_stock !== 'false', images }) });
        res.push({ name: r.name, ok: resp.ok, msg: resp.ok ? 'Imported' : (await resp.json()).error || 'Failed' });
      } catch (e: unknown) { res.push({ name: r.name, ok: false, msg: e instanceof Error ? e.message : 'Error' }); }
      setProgress(Math.round(((i + 1) / valid.length) * 100));
      setResults([...res]);
    }
    setImporting(false); setStep('done'); show(`${res.filter(r => r.ok).length} imported`);
  };

  const validCount = rows.filter(r => !r._errors?.length).length;
  const errorCount = rows.filter(r => r._errors?.length).length;

  if (step === 'done') return (
    <div>
      <h2 className={styles.sectionTitle}>Import Results</h2>
      <div className={styles.importResults}>
        {results.map((r, i) => <div key={i} className={r.ok ? styles.importOk : styles.importErr}>{r.ok ? '✅' : 'âŒ'} {r.name} "” {r.msg}</div>)}
      </div>
      <div className={styles.importSummary}>{results.filter(r => r.ok).length} imported successfully</div>
      <button className={styles.btnPrimary} onClick={() => { setStep('upload'); setRows([]); setResults([]); }}>IMPORT MORE</button>
    </div>
  );

  return (
    <div>
      <h2 className={styles.sectionTitle}>Import CSV</h2>
      <div className={styles.csvActions}>
        <button className={styles.btnSecondary} onClick={downloadTemplate}>⬇ DOWNLOAD TEMPLATE</button>
      </div>

      <div className={styles.brandRef}>
        <h4>Brand ID Reference</h4>
        <table className={styles.table}><thead><tr><th>ID</th><th>Name</th><th>Slug</th></tr></thead>
          <tbody>{brands.map(b => <tr key={b.id}><td>{b.id}</td><td>{b.name}</td><td>{b.slug}</td></tr>)}</tbody>
        </table>
      </div>

      {step === 'upload' && (
        <div className={styles.dropZone} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.csv')) handleFile(f); }}>
          <p>Drag & drop a .csv file here, or</p>
          <input type="file" accept=".csv" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} className={styles.fileInput} />
          <label className={styles.btnSecondary} style={{ cursor: 'pointer' }}>CHOOSE FILE</label>
        </div>
      )}

      {step === 'preview' && (
        <div>
          <div className={styles.importSummary}>{validCount} ready · {errorCount} errors</div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Name</th><th>Category</th><th>Brand ID</th><th>Price</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r._errors?.length ? styles.errorRow : ''}>
                    <td>{r.name}</td><td>{r.category}</td><td>{r.brand_id}</td><td>{r.price}</td>
                    <td>{r._errors?.length ? <span className={styles.errorText}>{r._errors.join(', ')}</span> : <span className={styles.okText}>❌“ Ready</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {importing && <div className={styles.progressBar}><div style={{ width: `${progress}%` }} /></div>}
          <div className={styles.modalActions}>
            <button className={styles.btnPrimary} onClick={importAll} disabled={importing || validCount === 0}>{importing ? `Importing… ${progress}%` : `IMPORT ${validCount} VALID`}</button>
            <button className={styles.btnSecondary} onClick={() => { setStep('upload'); setRows([]); }}>CANCEL</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HERO SLIDES SECTION
// ════════════════════════════════════════════════════════════════
function HeroSection({ show }: { show: (m: string, t?: 'ok' | 'err') => void }) {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<HeroSlide | Partial<HeroSlide> | null>(null);

  const fetchSlides = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api('/api/admin/hero-slides');
      if (res.ok) setSlides(await res.json());
      else show('Failed to fetch hero slides', 'err');
    } catch { show('Network error fetching slides', 'err'); }
    setLoading(false);
  }, [show]);

  useEffect(() => { fetchSlides(); }, [fetchSlides]);

  const saveSlide = async (s: Partial<HeroSlide>) => {
    try {
      const isNew = !s.id;
      const res = await api(isNew ? '/api/admin/hero-slides' : `/api/admin/hero-slides/${s.id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s)
      });
      if (res.ok) {
        show(isNew ? 'Slide added' : 'Slide updated');
        setEditing(null);
        fetchSlides();
      } else show('Failed to save slide', 'err');
    } catch { show('Network error', 'err'); }
  };

  const delSlide = async (id: number) => {
    if (!confirm('Delete this slide?')) return;
    try {
      const res = await api(`/api/admin/hero-slides/${id}`, { method: 'DELETE' });
      if (res.ok) { show('Slide deleted'); fetchSlides(); }
      else show('Failed to delete', 'err');
    } catch { show('Network error', 'err'); }
  };

  if (loading) return <div className={styles.loading}>Loading hero slides...</div>;

  return (
    <div>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Hero Banners</h2>
        <button className={styles.btnPrimary} onClick={() => setEditing({ active: true, sortOrder: 0, image: '', label: '', tagline: '', spec: '', emoji: '', href: '' })}>+ ADD SLIDE</button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Image</th><th>Label</th><th>Tagline</th><th>Status</th><th>Order</th><th>Actions</th></tr></thead>
          <tbody>
            {slides.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>No slides configured</td></tr> : slides.map(s => (
              <tr key={s.id}>
                <td>{s.image && <img src={s.image} alt={s.label} style={{ height: 40, borderRadius: 4, objectFit: 'cover' }} />}</td>
                <td><strong>{s.emoji} {s.label}</strong></td>
                <td>{s.tagline}</td>
                <td><span className={styles.badge} style={{ background: s.active ? '#22c55e' : '#888' }}>{s.active ? 'ACTIVE' : 'HIDDEN'}</span></td>
                <td>{s.sortOrder}</td>
                <td>
                  <div className={styles.actionRow}>
                    <button className={styles.actionBtn} onClick={() => setEditing(s)}>Edit</button>
                    <button className={styles.actionBtn} onClick={() => delSlide(s.id)} style={{ color: '#CC0000' }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <HeroSlideForm initial={editing} onClose={() => setEditing(null)} onSave={saveSlide} />}
    </div>
  );
}

function HeroSlideForm({ initial, onClose, onSave }: { initial: Partial<HeroSlide>; onClose: () => void; onSave: (s: Partial<HeroSlide>) => Promise<void> }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const uploadToCloudinary = async (file: File) => {
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloud || !preset) {
      alert("Image upload isn't configured yet. Cloudinary environment variables are missing on this deployment. For now, paste an image URL below instead.");
      return;
    }
    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Image is too large (max 10MB).'); return; }
    setUploading(true);
    const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', preset);
    try {
      const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: fd });
      const d = await r.json();
      if (d.secure_url) set('image', d.secure_url);
      else alert(d?.error?.message || 'Unknown error');
    } catch { alert('Network error during upload'); } finally { setUploading(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); await onSave(form); setSaving(false);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
        <h3 className={styles.modalTitle}>{initial.id ? 'Edit Slide' : 'Add Slide'}</h3>
        <form onSubmit={submit} className={styles.formStack}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Label (e.g. SNEAKERS) *</label>
              <input value={form.label || ''} onChange={e => set('label', e.target.value.toUpperCase())} required />
            </div>
            <div className={styles.formGroup} style={{ flex: '0 0 100px' }}>
              <label>Emoji *</label>
              <input value={form.emoji || ''} onChange={e => set('emoji', e.target.value)} required placeholder="👟" />
            </div>
          </div>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Tagline (e.g. FRESH KICKS) *</label>
              <input value={form.tagline || ''} onChange={e => set('tagline', e.target.value.toUpperCase())} required />
            </div>
            <div className={styles.formGroup}>
              <label>Specs/Details (e.g. VULCANIZED RUBBER) *</label>
              <input value={form.spec || ''} onChange={e => set('spec', e.target.value.toUpperCase())} required />
            </div>
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Image (Upload or URL) - Recommended size: 900x900px</label>
            <div className={styles.imageUploadArea} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.[0]) uploadToCloudinary(e.dataTransfer.files[0]); }}>
              <p>{uploading ? 'Uploading...' : 'Drag & drop image here, or'}</p>
              <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) uploadToCloudinary(e.target.files[0]); }} className={styles.fileInput} />
            </div>
            <input value={form.image || ''} onChange={e => set('image', e.target.value)} placeholder="Or paste image https://..." style={{ marginTop: 8 }} required />
            {form.image && <img src={form.image} alt="preview" className={styles.logoPreview} style={{ marginTop: 8, maxHeight: 120, objectFit: 'contain' }} />}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Link / URL *</label>
              <input value={form.href || ''} onChange={e => set('href', e.target.value)} required placeholder="/products?category=sneakers" />
            </div>
            <div className={styles.formGroup} style={{ flex: '0 0 100px' }}>
              <label>Sort Order</label>
              <input type="number" value={form.sortOrder || 0} onChange={e => set('sortOrder', Number(e.target.value))} />
            </div>
          </div>

          <div className={styles.formRow}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={form.active ?? true} onChange={e => set('active', e.target.checked)} />
              ACTIVE
            </label>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={saving}>CANCEL</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? 'SAVING...' : 'SAVE SLIDE'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
