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
  size?: string | null; product?: { name: string; brand?: { name: string } } | null;
}
interface Product {
  id: number; name: string; slug: string; category: string; price: number;
  originalPrice?: number | null; images: string[]; isFeatured: boolean;
  inStock: boolean; brand: { id: number; name: string; slug: string }; brandId: number;
  description?: string; sizes: Record<string, string[]>; colors: { name: string; hex: string }[];
  subcategory?: string | null;
  source?: string | null; sourceId?: string | null; lastSync?: string | null;
}
interface Brand { id: number; name: string; slug: string; logoUrl?: string | null; _count?: { products: number }; }
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
  const [section, setSection] = useState<'overview' | 'orders' | 'products' | 'brands' | 'coupons' | 'inventory' | 'csv'>('overview');
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
    { id: 'overview', icon: 'ðŸ“Š', label: 'Overview' },
    { id: 'orders', icon: 'ðŸ“¦', label: 'Orders' },
    { id: 'products', icon: 'ðŸ‘Ÿ', label: 'Products' },
    { id: 'brands', icon: 'ðŸ·ï¸', label: 'Brands' },
    { id: 'coupons', icon: 'ðŸŽŸï¸', label: 'Coupons' },
    { id: 'inventory', icon: 'ðŸ“ˆ', label: 'Inventory' },
    { id: 'csv', icon: 'ðŸ“¥', label: 'Import CSV' },
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
            <span>ðŸ•·</span> Product Scraper
          </a>
        </nav>
        <button className={styles.logoutSide} onClick={logout}>â» LOGOUT</button>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.hamburger} onClick={() => setSidebarOpen(o => !o)}>â˜°</button>
          <h1 className={styles.topTitle}>UrbanEx <span className={styles.red}>Admin</span></h1>
          <button className={styles.logoutBtn} onClick={logout}>LOGOUT</button>
        </header>

        <div className={styles.content}>
          {section === 'overview' && <OverviewSection show={show} />}
          {section === 'orders' && <OrdersSection show={show} />}
          {section === 'products' && <ProductsSection show={show} />}
          {section === 'brands' && <BrandsSection show={show} />}
          {section === 'coupons' && <CouponsSection show={show} />}
          {section === 'inventory' && <InventorySection show={show} />}
          {section === 'csv' && <CSVSection show={show} />}
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

  useEffect(() => {
    api('/api/admin/stats').then(r => r.json()).then(setStats).catch(() => show('Failed to load stats', 'err')).finally(() => setLoading(false));
  }, [show]);

  if (loading) return <div className={styles.loading}>Loading statsâ€¦</div>;
  if (!stats) return <div className={styles.loading}>Failed to load.</div>;

  const cards = [
    { label: 'Total Orders', value: stats.totalOrders, color: '#3B82F6' },
    { label: 'Pending Orders', value: stats.pendingOrders, color: '#F5C400' },
    { label: 'Total Revenue', value: fmt(stats.totalRevenue), color: '#22C55E' },
    { label: 'Total Products', value: stats.totalProducts, color: '#8B5CF6' },
    { label: 'Out of Stock', value: stats.outOfStock, color: '#CC0000' },
    { label: 'Active Coupons', value: stats.activeCoupons, color: '#F97316' },
  ];

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
            {stats.recentOrders.map(o => (
              <tr key={o.id}>
                <td className={styles.mono}>{o.orderId}</td>
                <td>{o.shippingName}</td>
                <td>{fmt(Number(o.totalAmount))}</td>
                <td><span className={styles.badge} style={{ background: statusColor(o.status) }}>{o.status}</span></td>
                <td>{fmtDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stats.outOfStockProducts.length > 0 && (
        <>
          <h3 className={styles.subTitle}>Out of Stock</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Product</th><th>Category</th><th>Brand</th></tr></thead>
              <tbody>
                {stats.outOfStockProducts.map(p => (
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
        <input className={styles.searchInput} placeholder="Search ID, name, phoneâ€¦" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className={styles.filterRow}>
        {STATUSES.map(s => <button key={s} className={`${styles.filterBtn} ${filter === s ? styles.filterActive : ''}`} onClick={() => setFilter(s)}>{s}</button>)}
      </div>
      {loading ? <div className={styles.loading}>Loadingâ€¦</div> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Order ID</th><th>Customer</th><th>Phone</th><th>Product</th><th>Size</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td className={styles.mono}>{o.orderId}</td>
                  <td>{o.shippingName}</td>
                  <td><a href={`https://wa.me/91${(o.shippingPhone || '').replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noopener" className={styles.phoneLink}>{o.shippingPhone}</a></td>
                  <td>{o.product?.name || 'â€”'}</td>
                  <td>{o.size || 'â€”'}</td>
                  <td>{fmt(Number(o.totalAmount))}</td>
                  <td><span className={styles.badge} style={{ background: statusColor(o.status) }}>{o.status}</span></td>
                  <td>{fmtDate(o.createdAt)}</td>
                  <td>
                    <div className={styles.actionRow}>
                      <select className={styles.statusSelect} value={o.status} onChange={e => updateStatus(o.orderId, e.target.value)}>
                        {['Confirmed', 'Shipped', 'Delivered', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                      </select>
                      <button className={styles.iconBtn} title="Add note" onClick={() => { setNoteOrder(o.orderId); setNoteText(''); }}>ðŸ“</button>
                      <button className={styles.iconBtn} title="View details" onClick={() => setDetailOrder(o)}>ðŸ‘</button>
                      <a className={styles.iconBtn} href={`https://wa.me/91${(o.shippingPhone || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hi, your UrbanEx order ${o.orderId} status: ${o.status}`)}`} target="_blank" rel="noopener">ðŸ’¬</a>
                      <button className={styles.iconBtnDanger} title="Delete" onClick={() => deleteOrder(o.orderId)}>ðŸ—‘</button>
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
            <h3 className={styles.modalTitle}>Add Note â€” {noteOrder}</h3>
            <textarea className={styles.noteInput} rows={4} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Internal note (not shown to customer)â€¦" autoFocus />
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
              {[['Customer', detailOrder.shippingName], ['Phone', detailOrder.shippingPhone], ['Email', detailOrder.shippingEmail], ['Address', detailOrder.shippingAddress], ['Product', detailOrder.product?.name], ['Size', detailOrder.size], ['Amount', fmt(Number(detailOrder.totalAmount))], ['Paid', detailOrder.amountPaid ? fmt(Number(detailOrder.amountPaid)) : 'â€”'], ['UTR', detailOrder.utrNumber || 'â€”'], ['Payment', detailOrder.paymentMethod || 'â€”'], ['Status', detailOrder.status], ['Date', fmtDate(detailOrder.createdAt)]].map(([k, v]) => (
                <div key={k as string} className={styles.detailRow}><span className={styles.detailKey}>{k}</span><span>{v || 'â€”'}</span></div>
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
              <p>{uploading ? 'Uploadingâ€¦' : 'Drag & drop images here, or'}</p>
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
            <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? 'SAVINGâ€¦' : 'SAVE PRODUCT'}</button>
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
        <input className={styles.searchInput} placeholder="Search name or brandâ€¦" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 220 }} />
        <select className={styles.statusSelect} value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: '8px 12px', fontSize: 13 }}>
          <option value="">All categories</option>
          {uniqueCategories.map(c => <option key={c} value={c!}>{c}</option>)}
        </select>
        {(search || filterCat) && <button className={styles.btnSmall} onClick={() => { setSearch(''); setFilterCat(''); }}>Clear</button>}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#888' }}>{filtered.length} shown</span>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className={styles.bulkBar}>
          <span style={{ fontWeight: 700, color: '#fff' }}>{selected.size} selected</span>
          <button className={styles.btnSmall} onClick={clearSelection}>Deselect All</button>
          <button className={styles.btnSmall} onClick={() => setBulkModal('brand')}>Change Brand</button>
          <button className={styles.btnSmall} onClick={() => setBulkModal('category')}>Change Category</button>
          <button className={styles.btnDanger} onClick={bulkDelete}>Delete Selected</button>
        </div>
      )}

      {loading ? <div className={styles.loading}>Loadingâ€¦</div> : (
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
                <tr key={p.id} style={selected.has(p.id) ? { background: 'rgba(204,0,0,0.06)' } : undefined}>
                  <td><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} /></td>
                  <td><img src={p.images?.[0]} alt="" className={styles.thumbImg} /></td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.brand?.name}</td>
                  <td>{fmt(p.price)}</td>
                  <td>{p.originalPrice ? fmt(p.originalPrice) : 'â€”'}</td>
                  <td>{p.source ? <span className={styles.badge} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#aaa', fontSize: 10 }}>{p.source}</span> : 'â€”'}</td>
                  <td><button className={`${styles.toggle} ${p.isFeatured ? styles.toggleOn : ''}`} onClick={() => toggleFeatured(p)}>{p.isFeatured ? 'â˜…' : 'â˜†'}</button></td>
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
            <h3 className={styles.modalTitle}>Change Brand â€” {selected.size} products</h3>
            <div className={styles.formGroup}>
              <label>New Brand</label>
              <select value={bulkBrandId} onChange={e => setBulkBrandId(e.target.value)}>
                <option value="">Select brandâ€¦</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={bulkApplyBrand} disabled={!bulkBrandId || bulkSaving}>{bulkSaving ? 'SAVINGâ€¦' : `APPLY TO ${selected.size} PRODUCTS`}</button>
              <button className={styles.btnSecondary} onClick={() => setBulkModal(null)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk change category modal */}
      {bulkModal === 'category' && (
        <div className={styles.modalOverlay} onClick={() => setBulkModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Change Category â€” {selected.size} products</h3>
            <div className={styles.formGroup}>
              <label>New Category</label>
              <select value={bulkCategory} onChange={e => setBulkCategory(e.target.value)}>
                <option value="">Select categoryâ€¦</option>
                {['sneakers','watches','luxury-watches','glasses','handbags','clothing','ua-batch'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={bulkApplyCategory} disabled={!bulkCategory || bulkSaving}>{bulkSaving ? 'SAVINGâ€¦' : `APPLY TO ${selected.size} PRODUCTS`}</button>
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
function BrandsSection({ show }: { show: (m: string, t?: 'ok' | 'err') => void }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', slug: '', logoUrl: '' });
  const [editing, setEditing] = useState<Brand | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    api('/api/brands').then(r => r.json()).then(d => setBrands(Array.isArray(d) ? d : [])).catch(() => show('Failed', 'err')).finally(() => setLoading(false));
  }, [show]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm({ name: '', slug: '', logoUrl: '' }); setEditing(null); setShowForm(true); };
  const openEdit = (b: Brand) => { setForm({ name: b.name, slug: b.slug, logoUrl: b.logoUrl || '' }); setEditing(b); setShowForm(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api(editing ? `/api/brands/${editing.id}` : '/api/brands', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { show(editing ? 'Brand updated' : 'Brand created'); setShowForm(false); load(); }
    else show('Failed to save', 'err');
  };

  const deleteBrand = async (id: number, name: string) => {
    if (!confirm(`Delete brand "${name}"?`)) return;
    const res = await api(`/api/brands/${id}`, { method: 'DELETE' });
    if (res.ok) { setBrands(b => b.filter(x => x.id !== id)); show('Deleted'); }
    else show('Failed to delete', 'err');
  };

  return (
    <div>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Brands</h2>
        <button className={styles.btnPrimary} onClick={openAdd}>+ ADD BRAND</button>
      </div>
      {loading ? <div className={styles.loading}>Loadingâ€¦</div> : (
        <div className={styles.brandGrid}>
          {brands.map(b => (
            <div key={b.id} className={styles.brandCard}>
              <img src={b.logoUrl || ''} alt={b.name} className={styles.brandLogo} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className={styles.brandName}>{b.name}</div>
              <div className={styles.brandCount}>{b._count?.products || 0} products</div>
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
              <div className={styles.formGroup}><label>Logo URL</label><input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://â€¦" /></div>
              {form.logoUrl && <img src={form.logoUrl} alt="preview" className={styles.logoPreview} />}
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
      {loading ? <div className={styles.loading}>Loadingâ€¦</div> : (
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
                  <td>{c.expiresAt ? fmtDate(c.expiresAt) : 'â€”'}</td>
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
      {loading ? <div className={styles.loading}>Loadingâ€¦</div> : (
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
        {results.map((r, i) => <div key={i} className={r.ok ? styles.importOk : styles.importErr}>{r.ok ? 'âœ…' : 'âŒ'} {r.name} â€” {r.msg}</div>)}
      </div>
      <div className={styles.importSummary}>{results.filter(r => r.ok).length} imported successfully</div>
      <button className={styles.btnPrimary} onClick={() => { setStep('upload'); setRows([]); setResults([]); }}>IMPORT MORE</button>
    </div>
  );

  return (
    <div>
      <h2 className={styles.sectionTitle}>Import CSV</h2>
      <div className={styles.csvActions}>
        <button className={styles.btnSecondary} onClick={downloadTemplate}>â¬‡ DOWNLOAD TEMPLATE</button>
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
          <div className={styles.importSummary}>{validCount} ready Â· {errorCount} errors</div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Name</th><th>Category</th><th>Brand ID</th><th>Price</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r._errors?.length ? styles.errorRow : ''}>
                    <td>{r.name}</td><td>{r.category}</td><td>{r.brand_id}</td><td>{r.price}</td>
                    <td>{r._errors?.length ? <span className={styles.errorText}>{r._errors.join(', ')}</span> : <span className={styles.okText}>âœ“ Ready</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {importing && <div className={styles.progressBar}><div style={{ width: `${progress}%` }} /></div>}
          <div className={styles.modalActions}>
            <button className={styles.btnPrimary} onClick={importAll} disabled={importing || validCount === 0}>{importing ? `Importingâ€¦ ${progress}%` : `IMPORT ${validCount} VALID`}</button>
            <button className={styles.btnSecondary} onClick={() => { setStep('upload'); setRows([]); }}>CANCEL</button>
          </div>
        </div>
      )}
    </div>
  );
}
