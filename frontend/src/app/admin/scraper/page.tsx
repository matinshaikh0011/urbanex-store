'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '../page.module.css';
import styles from './page.module.css';

// ── Types ──────────────────────────────────────────────────────
interface ScrapedProduct {
  name: string;
  sourcePrice: number;
  originalPrice: number | null;
  description: string | null;
  images: string[];
  brandName: string | null;
  productUrl: string;
  sourceId: string;
  cartpeCategory: string | null;
  suggestedCategory: string | null;
  suggestedSubcategory: string | null;
  duplicateStatus: 'new' | 'already-imported' | 'slug-duplicate' | 'possible-duplicate';
  duplicateMatch: { name: string; slug: string } | null;
  inStock: boolean;
}

type PricingMode = 'fixed-markup' | 'percent-markup' | 'combined' | 'manual';

interface PricingRule {
  mode: PricingMode;
  fixedAmount: number;
  percentage: number;
}

interface Brand { id: number; name: string; slug: string; }

interface ImportHistoryRecord {
  id: number; source: string; sourceUrl: string; importedAt: string;
  totalScraped: number; successCount: number; updatedCount: number;
  failureCount: number; skippedCount: number;
  log?: Array<{ sourceId: string; operation: string; errorMessage?: string }>;
}

// ── Helpers ───────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'ok' | 'err' | 'info' }[]>([]);
  const show = useCallback((msg: string, type: 'ok' | 'err' | 'info' = 'ok') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(path, { credentials: 'include', ...opts });
  if (res.status === 401) { window.location.href = '/admin/login'; throw new Error('Unauthorized'); }
  return res;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/["']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function calculatePrice(sourcePrice: number, rule: PricingRule, rounding: string, manualOverride?: number): number {
  if (manualOverride !== undefined && manualOverride > 0) return manualOverride;
  if (sourcePrice <= 0) return 0;
  let price = sourcePrice;
  if (rule.mode === 'fixed-markup') price = sourcePrice + rule.fixedAmount;
  else if (rule.mode === 'percent-markup') price = sourcePrice * (1 + rule.percentage / 100);
  else if (rule.mode === 'combined') price = (sourcePrice + rule.fixedAmount) * (1 + rule.percentage / 100);
  else return manualOverride ?? 0;
  if (rounding === '49') return Math.floor(price / 100) * 100 + 49;
  if (rounding === '99') return Math.floor(price / 100) * 100 + 99;
  if (rounding === '100') return Math.round(price / 100) * 100;
  return Math.round(price);
}

function similarity(a: string, b: string): number {
  const s1 = a.toLowerCase(); const s2 = b.toLowerCase();
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastVal = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) { costs[j] = j; continue; }
      if (j > 0) {
        let newVal = costs[j - 1];
        if (s1[i - 1] !== s2[j - 1]) newVal = Math.min(newVal, lastVal, costs[j]) + 1;
        costs[j - 1] = lastVal; lastVal = newVal;
      }
    }
    if (i > 0) costs[longer.length] = lastVal;
  }
  return (longer.length - costs[longer.length]) / longer.length;
}

const VALID_CATEGORIES = ['sneakers','watches','luxury-watches','glasses','handbags','clothing','ua-batch'];
const SUBCATEGORY_MAP: Record<string, string[]> = {
  watches: ['mens-watches','womens-watches'],
  glasses: ['mens-glasses','womens-glasses'],
  clothing: ['track-pants','jeans','shirts','tshirts','denims'],
};
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// ── Main Page ─────────────────────────────────────────────────
export default function ScraperPage() {
  const router = useRouter();
  const { toasts, show } = useToast();
  const [activeTab, setActiveTab] = useState<'wizard' | 'history' | 'sync'>('wizard');
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState('');
  const [scope, setScope] = useState<'full' | 'category' | 'product'>('category');
  const [delayMs, setDelayMs] = useState(500);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanPagesScanned, setScanPagesScanned] = useState(0);
  const [scanProductsLive, setScanProductsLive] = useState(0);
  const scanAbortRef = useRef(false);
  const [scannedProducts, setScannedProducts] = useState<ScrapedProduct[]>([]);
  const [scanStats, setScanStats] = useState<{ total: number; failed: number; productsFound?: number; productsReturned?: number; duplicateCount?: number; failedCount?: number; pagesFetched?: number; scanDuration?: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dupResolutions, setDupResolutions] = useState<Map<string, 'skip' | 'update' | 'import'>>(new Map());
  const [brandResolutions, setBrandResolutions] = useState<Map<string, number | 'skip'>>(new Map());
  const [categoryAssignments, setCategoryAssignments] = useState<Map<string, { category: string; subcategory: string | null }>>(new Map());
  const [brandAssignments, setBrandAssignments] = useState<Map<string, number | 'no-brand'>>(new Map());
  const [pricingRule, setPricingRule] = useState<PricingRule>({ mode: 'fixed-markup', fixedAmount: 0, percentage: 0 });
  const [rounding, setRounding] = useState('none');
  const [imageMode, setImageMode] = useState<'cloudinary' | 'supplier-url'>('supplier-url');
  const [manualPrices, setManualPrices] = useState<Map<string, number>>(new Map());
  const [brands, setBrands] = useState<Brand[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ successCount: number; updatedCount: number; failureCount: number; skippedCount: number; log: Array<{ sourceId: string; operation: string; errorMessage?: string }> } | null>(null);
  const [providerKey, setProviderKey] = useState('cartpe');

  useEffect(() => {
    api('/api/admin/verify').catch(() => router.replace('/admin/login'));
    api('/api/brands').then(r => r.json()).then(d => setBrands(Array.isArray(d) ? d : []));
  }, [router]);

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    router.replace('/admin/login');
  };

  const selectedProducts = scannedProducts.filter(p => selectedIds.has(p.sourceId));

  const STEPS = ['Scanner','Preview','Brand Mapping','Category','Brand Assignment','Settings','Import'];

  return (
    <div className={adminStyles.shell}>
      <div className={adminStyles.toastStack}>
        {toasts.map(t => <div key={t.id} className={`${adminStyles.toast} ${t.type === 'err' ? adminStyles.toastErr : t.type === 'info' ? adminStyles.toastInfo : adminStyles.toastOk}`}>{t.msg}</div>)}
      </div>
      <aside className={adminStyles.sidebar}>
        <div className={adminStyles.sidebarLogo}>URBAN<span className={adminStyles.red}>EX</span></div>
        <nav className={adminStyles.nav}>
          {[
            { label: 'Overview', icon: '📊', href: '/admin' },
            { label: 'Orders', icon: '📦', href: '/admin' },
            { label: 'Products', icon: '👟', href: '/admin' },
            { label: 'Brands', icon: '🏷️', href: '/admin' },
            { label: 'Coupons', icon: '🎟️', href: '/admin' },
            { label: 'Inventory', icon: '📈', href: '/admin' },
            { label: 'Import CSV', icon: '📥', href: '/admin' },
          ].map(n => (
            <a key={n.label} href={n.href} className={adminStyles.navItem} style={{ textDecoration: 'none' }}>
              <span>{n.icon}</span> {n.label}
            </a>
          ))}
          <a href="/admin/scraper" className={`${adminStyles.navItem} ${adminStyles.navActive}`} style={{ textDecoration: 'none' }}>
            <span>🕷</span> Product Scraper
          </a>
        </nav>
        <button className={adminStyles.logoutSide} onClick={logout}>⏻ LOGOUT</button>
      </aside>
      <div className={adminStyles.main}>
        <header className={adminStyles.topbar}>
          <h1 className={adminStyles.topTitle}>Product <span className={adminStyles.red}>Scraper</span></h1>
          <button className={adminStyles.logoutBtn} onClick={logout}>LOGOUT</button>
        </header>
        <div className={adminStyles.content}>
          <div className={styles.tabRow}>
            {(['wizard','history','sync'] as const).map(t => (
              <button key={t} className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`} onClick={() => setActiveTab(t)}>
                {t === 'wizard' ? '🕷 Import Wizard' : t === 'history' ? '📋 History' : '🔄 Sync'}
              </button>
            ))}
          </div>
          {activeTab === 'wizard' && (
            <>
              <div className={styles.stepper}>
                {STEPS.map((s, i) => (
                  <div key={s} className={`${styles.stepItem} ${step === i + 1 ? styles.stepActive : step > i + 1 ? styles.stepDone : ''}`}
                    onClick={() => { if (step > i + 1) setStep(i + 1); }}>
                    {step > i + 1 ? '✓ ' : ''}{s}
                  </div>
                ))}
              </div>
              {step === 1 && <ScannerStep url={url} setUrl={setUrl} scope={scope} setScope={setScope} delayMs={delayMs} setDelayMs={setDelayMs} scanning={scanning} scanProgress={scanProgress} scanPagesScanned={scanPagesScanned} scanProductsLive={scanProductsLive} scanStats={scanStats} providerKey={providerKey} setProviderKey={setProviderKey}
                onCancelScan={() => { scanAbortRef.current = true; }}
                onScan={async () => {
                  if (!url.trim()) { show('Enter a supplier URL', 'err'); return; }
                  setScanning(true);
                  setScanProgress(5);
                  setScanPagesScanned(0);
                  setScanProductsLive(0);
                  setScannedProducts([]);
                  setScanStats(null);
                  scanAbortRef.current = false;

                  try {
                    // 1. Start the background scan job
                    const startRes = await api('/api/admin/scraper/scan', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ url, scope, provider: providerKey, delayMs }),
                    });

                    let startData: { jobId?: string; error?: string } = {};
                    try {
                      startData = await startRes.json();
                    } catch {
                      // Backend returned non-JSON (e.g. HTML 500 page)
                      throw new Error(`Backend error (HTTP ${startRes.status}) — check server logs`);
                    }
                    if (!startRes.ok) { show(startData.error || `Server error ${startRes.status}`, 'err'); return; }
                    const jobId = startData.jobId;
                    if (!jobId) { show('No job ID returned from server', 'err'); return; }

                    // 2. Poll until done
                    let pollInterval: ReturnType<typeof setInterval> | null = null;
                    await new Promise<void>((resolve, reject) => {
                      pollInterval = setInterval(async () => {
                        // User cancelled
                        if (scanAbortRef.current) {
                          if (pollInterval) clearInterval(pollInterval);
                          reject(new Error('Scan cancelled'));
                          return;
                        }
                        try {
                          const statusRes = await api(`/api/admin/scraper/scan/status/${jobId}`);
                          const statusData = await statusRes.json();

                          if (statusData.status === 'running') {
                            setScanPagesScanned(statusData.pagesScanned || 0);
                            setScanProductsLive(statusData.productsFound || 0);
                            // Indeterminate progress — animate up to 90%
                            setScanProgress(p => Math.min(p + 2, 90));
                            return;
                          }

                          if (pollInterval) clearInterval(pollInterval);

                          if (statusData.status === 'error') {
                            reject(new Error(statusData.error || 'Scan failed'));
                            return;
                          }

                          // status === 'done'
                          setScanProgress(100);
                          setScannedProducts(statusData.products || []);
                          setScanStats({
                            total: statusData.stats?.productsReturned || statusData.stats?.total || 0,
                            failed: statusData.stats?.failedCount || statusData.stats?.failed || 0,
                            productsFound: statusData.stats?.productsFound,
                            productsReturned: statusData.stats?.productsReturned,
                            duplicateCount: statusData.stats?.duplicateCount,
                            failedCount: statusData.stats?.failedCount,
                            pagesFetched: statusData.stats?.pagesFetched,
                            scanDuration: statusData.stats?.scanDuration,
                          });
                          setSelectedIds(new Set((statusData.products || []).filter((p: ScrapedProduct) => p.duplicateStatus === 'new').map((p: ScrapedProduct) => p.sourceId)));
                          const dur = statusData.stats?.scanDuration ? ` in ${(statusData.stats.scanDuration / 1000).toFixed(1)}s` : '';
                          const failMsg = (statusData.stats?.failedCount || 0) > 0 ? ` (${statusData.stats.failedCount} failed)` : '';
                          show(`Found ${statusData.stats?.productsReturned || statusData.stats?.total || 0} products${dur}${failMsg}`);
                          setTimeout(() => { setStep(2); setScanProgress(0); }, 500);
                          resolve();
                        } catch (pollErr) {
                          if (pollInterval) clearInterval(pollInterval);
                          reject(pollErr);
                        }
                      }, 2000);
                    });
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : 'Scan failed';
                    if (msg !== 'Scan cancelled') show(msg, 'err');
                    else show('Scan cancelled', 'err');
                  } finally {
                    setScanning(false);
                  }
                }} />}
              {step === 2 && <PreviewStep products={scannedProducts} selectedIds={selectedIds} setSelectedIds={setSelectedIds} dupResolutions={dupResolutions} setDupResolutions={setDupResolutions} onNext={() => setStep(3)} />}
              {step === 3 && <BrandMappingStep products={selectedProducts} brands={brands} brandResolutions={brandResolutions} setBrandResolutions={setBrandResolutions} providerKey={providerKey} show={show} onNext={() => setStep(4)} />}
              {step === 4 && <CategoryStep products={selectedProducts} categoryAssignments={categoryAssignments} setCategoryAssignments={setCategoryAssignments} onNext={() => setStep(5)} show={show} />}
              {step === 5 && <BrandAssignmentStep products={selectedProducts} brands={brands} brandResolutions={brandResolutions} brandAssignments={brandAssignments} setBrandAssignments={setBrandAssignments} show={show} onNext={() => setStep(6)} />}
              {step === 6 && <ImportSettingsStep products={selectedProducts} pricingRule={pricingRule} setPricingRule={setPricingRule} rounding={rounding} setRounding={setRounding} imageMode={imageMode} setImageMode={setImageMode} manualPrices={manualPrices} setManualPrices={setManualPrices} onNext={() => setStep(7)} />}
              {step === 7 && <ImportStep products={selectedProducts} categoryAssignments={categoryAssignments} brandAssignments={brandAssignments} pricingRule={pricingRule} rounding={rounding} imageMode={imageMode} manualPrices={manualPrices} source={providerKey} sourceUrl={url} importing={importing} importResult={importResult} show={show}
                onImport={async () => {
                  setImporting(true); setImportResult(null);
                  const payload = selectedProducts.map(p => {
                    const cat = categoryAssignments.get(p.sourceId);
                    const brandId = brandAssignments.get(p.sourceId);
                    const manualPrice = manualPrices.get(p.sourceId);
                    const price = calculatePrice(p.sourcePrice, pricingRule, rounding, manualPrice);
                    // originalPrice = CartPe's MRP (struck-through price on their page).
                    // If CartPe has no MRP, or MRP <= our selling price,
                    // buildProductData will enforce originalPrice = Math.round(price * 1.4).
                    const originalPrice = p.originalPrice ?? null;
                    return {
                      name: p.name, sourceId: p.sourceId, productUrl: p.productUrl,
                      sourcePrice: p.sourcePrice, price, originalPrice,
                      description: p.description, images: p.images,
                      brandId: brandId === 'no-brand' ? 'no-brand' : brandId,
                      category: cat?.category || p.suggestedCategory || 'sneakers',
                      subcategory: cat?.subcategory || p.suggestedSubcategory || null,
                      sizes: {}, colors: [], inStock: p.inStock, isFeatured: false,
                      slug: slugify(p.name) + '-' + p.sourceId,
                    };
                  });
                  try {
                    const BATCH_SIZE = 50;
                    const batches: typeof payload[] = [];
                    for (let i = 0; i < payload.length; i += BATCH_SIZE) {
                      batches.push(payload.slice(i, i + BATCH_SIZE));
                    }

                    let totalSuccess = 0, totalUpdated = 0, totalFailed = 0, totalSkipped = 0;
                    const allLogs: unknown[] = [];
                    const allImageFailures: unknown[] = [];
                    let lastHistoryId: string | null = null;

                    for (let bi = 0; bi < batches.length; bi++) {
                      show(`Importing batch ${bi + 1}/${batches.length} (${batches[bi].length} products)…`, 'ok');
                      const r = await api('/api/admin/scraper/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ products: batches[bi], source: providerKey, sourceUrl: url, imageMode }),
                      });
                      const d = await r.json();
                      if (!r.ok) { show(d.error || `Batch ${bi + 1} failed`, 'err'); setImporting(false); return; }
                      totalSuccess += d.successCount ?? 0;
                      totalUpdated += d.updatedCount ?? 0;
                      totalFailed += d.failureCount ?? 0;
                      totalSkipped += d.skippedCount ?? 0;
                      if (d.log) allLogs.push(...d.log);
                      if (d.imageFailures) allImageFailures.push(...d.imageFailures);
                      if (d.historyId) lastHistoryId = d.historyId;
                    }

                    const combined = { successCount: totalSuccess, updatedCount: totalUpdated, failureCount: totalFailed, skippedCount: totalSkipped, log: allLogs as Array<{ sourceId: string; operation: string; errorMessage?: string }> };
                    setImportResult(combined);
                    show(`Import complete: ${totalSuccess} created, ${totalUpdated} updated, ${totalFailed} failed`);
                  } catch { show('Import failed', 'err'); } finally { setImporting(false); }
                }}
                onViewHistory={() => setActiveTab('history')} />}
            </>
          )}
          {activeTab === 'history' && <HistoryTab show={show} onReimport={(u) => { setUrl(u); setActiveTab('wizard'); setStep(1); }} />}
          {activeTab === 'sync' && <SyncTab show={show} brands={brands} />}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Scanner ───────────────────────────────────────────
function ScannerStep({ url, setUrl, scope, setScope, delayMs, setDelayMs, scanning, scanProgress, scanPagesScanned, scanProductsLive, scanStats, providerKey, setProviderKey, onScan, onCancelScan }: {
  url: string; setUrl: (v: string) => void; scope: 'full' | 'category' | 'product'; setScope: (v: 'full' | 'category' | 'product') => void;
  delayMs: number; setDelayMs: (v: number) => void; scanning: boolean; scanProgress: number;
  scanPagesScanned: number; scanProductsLive: number;
  scanStats: { total: number; failed: number; productsFound?: number; productsReturned?: number; duplicateCount?: number; failedCount?: number; pagesFetched?: number; scanDuration?: number } | null;
  providerKey: string; setProviderKey: (v: string) => void; onScan: () => void; onCancelScan: () => void;
}) {
  return (
    <div>
      <div className={styles.stepHeader}><div className={styles.stepTitle}>SCAN SUPPLIER WEBSITE</div><div className={styles.stepDesc}>Enter any <strong>*.cartpe.in</strong> store URL to extract products. Scans run in the background — safe for 1000+ products.</div></div>
      <div className={adminStyles.formStack} style={{ maxWidth: 600 }}>
        <div className={adminStyles.formGroup}><label>Supplier URL *</label><input className={adminStyles.formGroup} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yourstore.cartpe.in/allproduct.html" style={{ background: '#111', border: '1px solid #333', color: '#fff', padding: '10px 12px', fontSize: 14, outline: 'none', width: '100%' }} /></div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className={adminStyles.formGroup} style={{ flex: 1 }}><label>Scope</label>
            <select className={styles.selectInput} value={scope} onChange={e => setScope(e.target.value as 'full' | 'category' | 'product')}>
              <option value="full">Full Site</option><option value="category">Single Category Page</option><option value="product">Single Product URL</option>
            </select>
          </div>
          <div className={adminStyles.formGroup} style={{ flex: 1 }}><label>Provider</label>
            <select className={styles.selectInput} value={providerKey} onChange={e => setProviderKey(e.target.value)}>
              <option value="cartpe">CartPe</option><option value="selloship">Selloship (stub)</option><option value="shopify">Shopify (stub)</option>
            </select>
          </div>
          <div className={adminStyles.formGroup}><label>Delay (ms)</label><input type="number" className={styles.numInput} value={delayMs} min={100} max={10000} onChange={e => setDelayMs(Number(e.target.value))} /></div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className={adminStyles.btnPrimary} onClick={onScan} disabled={scanning} style={{ alignSelf: 'flex-start' }}>{scanning ? 'SCANNING…' : 'SCAN WEBSITE'}</button>
          {scanning && <button className={adminStyles.btnSecondary} onClick={onCancelScan} style={{ alignSelf: 'flex-start' }}>CANCEL</button>}
        </div>
      </div>
      {scanning && (
        <div style={{ marginTop: 20 }}>
          <div className={styles.progressWrap}><div className={styles.progressFill} style={{ width: `${scanProgress}%`, transition: 'width 0.5s ease' }} /></div>
          <div style={{ marginTop: 10, display: 'flex', gap: 24, fontSize: 14, color: '#aaa' }}>
            <span>📄 Pages scanned: <strong style={{ color: '#fff' }}>{scanPagesScanned}</strong></span>
            <span>📦 Products found: <strong style={{ color: '#22C55E' }}>{scanProductsLive}</strong></span>
            <span style={{ color: '#555', fontSize: 12 }}>Scanning in background — safe to wait...</span>
          </div>
        </div>
      )}
      {scanStats && (
        <div className={styles.scanStats}>
          <div><strong>{scanStats.productsFound ?? scanStats.total}</strong>Products Found</div>
          <div><strong style={{ color: '#22C55E' }}>{scanStats.productsReturned ?? scanStats.total}</strong>Returned</div>
          {(scanStats.duplicateCount ?? 0) > 0 && <div><strong style={{ color: '#F5C400' }}>{scanStats.duplicateCount}</strong>Duplicates</div>}
          {(scanStats.failedCount ?? scanStats.failed ?? 0) > 0 && <div><strong style={{ color: '#CC0000' }}>{scanStats.failedCount ?? scanStats.failed}</strong>Failed</div>}
          {scanStats.pagesFetched && <div><strong style={{ color: '#888' }}>{scanStats.pagesFetched}</strong>Pages</div>}
          {scanStats.scanDuration && <div><strong style={{ color: '#888' }}>{(scanStats.scanDuration / 1000).toFixed(1)}s</strong>Duration</div>}
        </div>
      )}
    </div>
  );
}

// ── Step 2: Preview ───────────────────────────────────────────
function PreviewStep({ products, selectedIds, setSelectedIds, dupResolutions, setDupResolutions, onNext }: {
  products: ScrapedProduct[]; selectedIds: Set<string>; setSelectedIds: (s: Set<string>) => void;
  dupResolutions: Map<string, 'skip' | 'update' | 'import'>; setDupResolutions: (m: Map<string, 'skip' | 'update' | 'import'>) => void; onNext: () => void;
}) {
  const [selectionMode, setSelectionMode] = useState(false);

  const toggle = (id: string) => { const s = new Set(selectedIds); s.has(id) ? s.delete(id) : s.add(id); setSelectedIds(s); };
  const badgeClass = (status: string) => status === 'new' ? styles.badgeNew : status === 'already-imported' ? styles.badgeDuplicate : status === 'slug-duplicate' ? styles.badgeSlugDuplicate : styles.badgePossible;
  const badgeLabel = (status: string) => status === 'new' ? 'New' : status === 'already-imported' ? 'Imported' : status === 'slug-duplicate' ? 'Slug Dup' : 'Possible Dup';

  if (products.length === 0) return <div className={styles.emptyState}><p>No products found. Go back and run a scan first.</p></div>;

  return (
    <div>
      <div className={styles.stepHeader}><div className={styles.stepTitle}>REVIEW PRODUCTS ({products.length})</div><div className={styles.stepDesc}>Select products to import. Duplicates are pre-filtered.</div></div>
      <div className={styles.bulkBar}>
        <span className={styles.bulkLabel}>Select:</span>
        <button className={adminStyles.btnSmall} onClick={() => setSelectedIds(new Set(products.map(p => p.sourceId)))}>All</button>
        <button className={adminStyles.btnSmall} onClick={() => setSelectedIds(new Set())}>None</button>
        <button className={adminStyles.btnSmall} onClick={() => setSelectedIds(new Set(products.filter(p => p.duplicateStatus === 'new').map(p => p.sourceId)))}>New Only</button>
        <button
          className={`${adminStyles.btnSmall} ${selectionMode ? styles.selectionModeActive : ''}`}
          onClick={() => setSelectionMode(m => !m)}
          title={selectionMode ? 'Disable row-click selection' : 'Enable row-click selection'}
          style={{ marginLeft: 8 }}
        >
          {selectionMode ? '✓ Selection Mode ON' : '☐ Selection Mode'}
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#aaa' }}>{selectedIds.size} selected</span>
      </div>
      {selectionMode && (
        <div className={styles.selectionModeHint}>
          Click anywhere on a row to toggle selection
        </div>
      )}
      <div className={adminStyles.tableWrap}>
        <table className={adminStyles.table}>
          <thead><tr><th></th><th>Image</th><th>Name</th><th>Supplier Price</th><th>CartPe MRP</th><th>Brand</th><th>Status</th><th>Description</th></tr></thead>
          <tbody>
            {products.map(p => (
              <tr
                key={p.sourceId}
                className={selectionMode ? (selectedIds.has(p.sourceId) ? styles.rowSelected : styles.rowSelectable) : undefined}
                onClick={selectionMode ? () => toggle(p.sourceId) : undefined}
              >
                <td onClick={e => { if (selectionMode) e.stopPropagation(); }}>
                  <input type="checkbox" checked={selectedIds.has(p.sourceId)} onChange={() => toggle(p.sourceId)} />
                </td>
                <td>{p.images[0] || (p as any).thumbnail ? <img src={(p as any).thumbnail || p.images[0]} alt="" className={adminStyles.thumbImg} /> : '—'}</td>
                <td style={{ maxWidth: 200 }}>{p.name}</td>
                <td>{p.sourcePrice > 0 ? fmt(p.sourcePrice) : '—'}</td>
                <td>{p.originalPrice ? fmt(p.originalPrice) : '—'}</td>
                <td>{p.brandName || <span style={{ color: '#555' }}>Unknown</span>}</td>
                <td onClick={e => { if (selectionMode) e.stopPropagation(); }}>
                  <span className={badgeClass(p.duplicateStatus)}>{badgeLabel(p.duplicateStatus)}</span>
                  {(p.duplicateStatus === 'already-imported' || p.duplicateStatus === 'possible-duplicate') && (
                    <div style={{ marginTop: 4 }}>
                      <select className={styles.selectInput} style={{ fontSize: 11, padding: '2px 6px' }} value={dupResolutions.get(p.sourceId) || 'skip'} onChange={e => { const m = new Map(dupResolutions); m.set(p.sourceId, e.target.value as 'skip' | 'update' | 'import'); setDupResolutions(m); }}>
                        <option value="skip">Skip</option><option value="update">Update Existing</option><option value="import">Import Anyway</option>
                      </select>
                    </div>
                  )}
                </td>
                <td style={{ maxWidth: 200, fontSize: 12, color: '#888' }}>{(p.description || '').slice(0, 150)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16 }}>
        <button className={adminStyles.btnPrimary} onClick={onNext} disabled={selectedIds.size === 0}>PROCEED TO BRAND MAPPING →</button>
      </div>
    </div>
  );
}

// ── Step 3: Brand Mapping ─────────────────────────────────────
function BrandMappingStep({ products, brands, brandResolutions, setBrandResolutions, providerKey, show, onNext }: {
  products: ScrapedProduct[]; brands: Brand[]; brandResolutions: Map<string, number | 'skip'>;
  setBrandResolutions: (m: Map<string, number | 'skip'>) => void; providerKey: string; show: (m: string, t?: 'ok' | 'err') => void; onNext: () => void;
}) {
  const [storedMappings, setStoredMappings] = useState<Array<{ supplierBrandName: string; brandId: number }>>([]);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandSlug, setNewBrandSlug] = useState('');
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  useEffect(() => {
    api(`/api/admin/scraper/brand-mappings?provider=${providerKey}`).then(r => r.json()).then(d => setStoredMappings(Array.isArray(d) ? d : []));
  }, [providerKey]);

  const uniqueBrands = Array.from(new Set(products.map(p => p.brandName).filter(Boolean))) as string[];

  const resolve = (supplierName: string): { brandId: number; auto: boolean } | null => {
    const exact = brands.find(b => b.name.toLowerCase() === supplierName.toLowerCase());
    if (exact) return { brandId: exact.id, auto: true };
    const stored = storedMappings.find(m => m.supplierBrandName === supplierName);
    if (stored) return { brandId: stored.brandId, auto: true };
    return null;
  };

  const getFuzzy = (supplierName: string) => brands.map(b => ({ brand: b, score: similarity(supplierName, b.name) })).filter(x => x.score >= 0.7).sort((a, b) => b.score - a.score).slice(0, 10);

  const saveMapping = async (supplierName: string, brandId: number) => {
    await api('/api/admin/scraper/brand-mappings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: providerKey, supplierBrandName: supplierName, brandId }) });
    const m = new Map(brandResolutions); m.set(supplierName, brandId); setBrandResolutions(m);
    show(`Mapped "${supplierName}" → brand`);
  };

  const createBrand = async (supplierName: string) => {
    if (!newBrandName.trim() || !newBrandSlug.trim()) { show('Name and slug required', 'err'); return; }
    const r = await api('/api/brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newBrandName, slug: newBrandSlug }) });
    const d = await r.json();
    if (!r.ok) { show(d.error || 'Failed to create brand', 'err'); return; }
    await saveMapping(supplierName, d.id);
    setCreatingFor(null); setNewBrandName(''); setNewBrandSlug('');
    show(`Brand "${newBrandName}" created`);
  };

  return (
    <div>
      <div className={styles.stepHeader}><div className={styles.stepTitle}>BRAND MAPPING</div><div className={styles.stepDesc}>Map supplier brand names to your existing brands</div></div>
      {uniqueBrands.length === 0 && <div className={styles.emptyState}><p>No brand names detected in selected products. Proceed to continue.</p></div>}
      {uniqueBrands.map(supplierName => {
        const auto = resolve(supplierName);
        const fuzzy = getFuzzy(supplierName);
        const current = brandResolutions.get(supplierName);
        return (
          <div key={supplierName} className={styles.brandCard}>
            <div className={styles.brandCardName}>{supplierName}</div>
            <div className={styles.brandCardSub}>{products.filter(p => p.brandName === supplierName).length} products</div>
            {auto ? (
              <div className={styles.resolvedBadge}>✓ Auto-resolved → {brands.find(b => b.id === auto.brandId)?.name}</div>
            ) : (
              <div className={styles.brandOptions}>
                {fuzzy.map(({ brand, score }) => (
                  <label key={brand.id} className={styles.brandOption}>
                    <input type="radio" name={`brand-${supplierName}`} checked={current === brand.id} onChange={() => saveMapping(supplierName, brand.id)} />
                    {brand.name} <span style={{ color: '#555', fontSize: 11 }}>({Math.round(score * 100)}% match)</span>
                  </label>
                ))}
                <label className={styles.brandOption}>
                  <input type="radio" name={`brand-${supplierName}`} checked={current === 'skip'} onChange={() => { const m = new Map(brandResolutions); m.set(supplierName, 'skip'); setBrandResolutions(m); }} />
                  Skip all products with this brand
                </label>
                <button className={adminStyles.btnSmall} onClick={() => setCreatingFor(supplierName)}>+ Create New Brand</button>
                {creatingFor === supplierName && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    <input className={styles.textInput} style={{ width: 160 }} placeholder="Brand name" value={newBrandName} onChange={e => { setNewBrandName(e.target.value); setNewBrandSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }} />
                    <input className={styles.textInput} style={{ width: 160 }} placeholder="Slug" value={newBrandSlug} onChange={e => setNewBrandSlug(e.target.value)} />
                    <button className={adminStyles.btnPrimary} onClick={() => createBrand(supplierName)}>CONFIRM CREATE</button>
                    <button className={adminStyles.btnSecondary} onClick={() => setCreatingFor(null)}>Cancel</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <button className={adminStyles.btnPrimary} onClick={onNext} style={{ marginTop: 16 }}>PROCEED TO CATEGORY →</button>
    </div>
  );
}

// ── Step 4: Category Assignment ───────────────────────────────
function CategoryStep({ products, categoryAssignments, setCategoryAssignments, onNext, show }: {
  products: ScrapedProduct[]; categoryAssignments: Map<string, { category: string; subcategory: string | null }>;
  setCategoryAssignments: (m: Map<string, { category: string; subcategory: string | null }>) => void; onNext: () => void; show: (m: string, t?: 'ok' | 'err') => void;
}) {
  const [bulkCat, setBulkCat] = useState('sneakers');
  const [bulkSub, setBulkSub] = useState('');

  const getAssignment = (p: ScrapedProduct) => categoryAssignments.get(p.sourceId) || { category: p.suggestedCategory || 'sneakers', subcategory: p.suggestedSubcategory || null };
  const setAssignment = (sourceId: string, category: string, subcategory: string | null) => {
    const m = new Map(categoryAssignments); m.set(sourceId, { category, subcategory }); setCategoryAssignments(m);
  };

  const applyBulk = () => { const m = new Map(categoryAssignments); products.forEach(p => m.set(p.sourceId, { category: bulkCat, subcategory: bulkSub || null })); setCategoryAssignments(m); };

  const handleNext = () => {
    const missing = products.filter(p => !getAssignment(p).category);
    if (missing.length > 0) { show(`${missing.length} products need a category`, 'err'); return; }
    onNext();
  };

  return (
    <div>
      <div className={styles.stepHeader}><div className={styles.stepTitle}>CATEGORY ASSIGNMENT</div><div className={styles.stepDesc}>Assign categories to all selected products</div></div>
      <div className={styles.bulkBar}>
        <span className={styles.bulkLabel}>Bulk Apply:</span>
        <select className={styles.selectInput} value={bulkCat} onChange={e => { setBulkCat(e.target.value); setBulkSub(''); }}>
          {VALID_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {SUBCATEGORY_MAP[bulkCat] && (
          <select className={styles.selectInput} value={bulkSub} onChange={e => setBulkSub(e.target.value)}>
            <option value="">No subcategory</option>
            {SUBCATEGORY_MAP[bulkCat].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <button className={adminStyles.btnSmall} onClick={applyBulk} disabled={products.length === 0}>Apply to All</button>
      </div>
      <div className={adminStyles.tableWrap}>
        <table className={adminStyles.table}>
          <thead><tr><th>Product</th><th>Suggested</th><th>Category</th><th>Subcategory</th></tr></thead>
          <tbody>
            {products.map(p => {
              const a = getAssignment(p);
              return (
                <tr key={p.sourceId}>
                  <td style={{ maxWidth: 200 }}>{p.name}</td>
                  <td style={{ fontSize: 12, color: '#888' }}>{p.cartpeCategory || '—'}</td>
                  <td>
                    <select className={styles.selectInput} value={a.category} onChange={e => setAssignment(p.sourceId, e.target.value, null)}>
                      {VALID_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td>
                    {SUBCATEGORY_MAP[a.category] ? (
                      <select className={styles.selectInput} value={a.subcategory || ''} onChange={e => setAssignment(p.sourceId, a.category, e.target.value || null)}>
                        <option value="">None</option>
                        {SUBCATEGORY_MAP[a.category].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : <span style={{ color: '#555', fontSize: 12 }}>N/A</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button className={adminStyles.btnPrimary} onClick={handleNext} style={{ marginTop: 16 }}>PROCEED TO BRAND ASSIGNMENT →</button>
    </div>
  );
}

// ── Step 5: Brand Assignment ──────────────────────────────────
function BrandAssignmentStep({ products, brands, brandResolutions, brandAssignments, setBrandAssignments, show, onNext }: {
  products: ScrapedProduct[]; brands: Brand[]; brandResolutions: Map<string, number | 'skip'>;
  brandAssignments: Map<string, number | 'no-brand'>; setBrandAssignments: (m: Map<string, number | 'no-brand'>) => void;
  show: (m: string, t?: 'ok' | 'err' | 'info') => void; onNext: () => void;
}) {
  const [bulkBrandId, setBulkBrandId] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandSlug, setNewBrandSlug] = useState('');
  const [creatingFor, setCreatingFor] = useState<string | 'bulk' | null>(null);
  const [brandSearch, setBrandSearch] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'all' | 'assigned' | 'unassigned' | 'skipped'>('all');
  const [localBrands, setLocalBrands] = useState(brands);

  // Keep localBrands in sync when parent brands change
  useEffect(() => setLocalBrands(brands), [brands]);

  const getAssignment = (p: ScrapedProduct): number | 'no-brand' | undefined => {
    if (brandAssignments.has(p.sourceId)) return brandAssignments.get(p.sourceId);
    if (p.brandName) {
      const res = brandResolutions.get(p.brandName);
      if (typeof res === 'number') return res;
    }
    return undefined;
  };

  const setAssignment = (sourceId: string, val: number | 'no-brand') => {
    const m = new Map(brandAssignments); m.set(sourceId, val); setBrandAssignments(m);
  };

  const skipProduct = (sourceId: string) => setAssignment(sourceId, 'no-brand');
  const clearAssignment = (sourceId: string) => {
    const m = new Map(brandAssignments); m.delete(sourceId); setBrandAssignments(m);
  };

  const applyBulk = () => {
    if (!bulkBrandId) return;
    const m = new Map(brandAssignments);
    products.forEach(p => m.set(p.sourceId, bulkBrandId === 'no-brand' ? 'no-brand' : parseInt(bulkBrandId)));
    setBrandAssignments(m);
    show(`Applied to all ${products.length} products`, 'ok');
  };

  const applyBulkToSelected = (ids: string[], val: number | 'no-brand') => {
    const m = new Map(brandAssignments);
    ids.forEach(id => m.set(id, val));
    setBrandAssignments(m);
  };

  const createBrand = async (targetSourceId: string | 'bulk') => {
    if (!newBrandName.trim() || !newBrandSlug.trim()) { show('Name and slug required', 'err'); return; }
    const r = await api('/api/brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newBrandName, slug: newBrandSlug }) });
    const d = await r.json();
    if (!r.ok) { show(d.error || 'Failed to create brand', 'err'); return; }
    // Add to local list immediately (parent refresh happens on next render cycle)
    setLocalBrands(prev => [...prev, d]);
    if (targetSourceId !== 'bulk') setAssignment(targetSourceId, d.id);
    else { setBulkBrandId(String(d.id)); }
    setCreatingFor(null); setNewBrandName(''); setNewBrandSlug('');
    show(`Brand "${d.name}" created${targetSourceId !== 'bulk' ? ' and assigned' : ''}`, 'ok');
  };

  // Stats
  const assigned = products.filter(p => { const a = getAssignment(p); return typeof a === 'number'; });
  const skipped = products.filter(p => getAssignment(p) === 'no-brand');
  const unassigned = products.filter(p => getAssignment(p) === undefined);

  const tabProducts = tab === 'assigned' ? assigned : tab === 'skipped' ? skipped : tab === 'unassigned' ? unassigned : products;

  const handleNext = () => {
    if (unassigned.length > 0) {
      show(`Proceeding — ${unassigned.length} unassigned product(s) will be auto-skipped`, 'info');
      // Auto-mark all unassigned as no-brand
      const m = new Map(brandAssignments);
      unassigned.forEach(p => m.set(p.sourceId, 'no-brand'));
      setBrandAssignments(m);
    }
    onNext();
  };

  const filteredBrands = (search: string) => localBrands.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()));

  const TABS: Array<{ key: typeof tab; label: string; count: number; color?: string }> = [
    { key: 'all', label: 'All', count: products.length },
    { key: 'assigned', label: 'Assigned', count: assigned.length, color: '#22C55E' },
    { key: 'unassigned', label: 'Unassigned', count: unassigned.length, color: unassigned.length > 0 ? '#F59E0B' : '#888' },
    { key: 'skipped', label: 'Skipped', count: skipped.length, color: '#888' },
  ];

  return (
    <div>
      <div className={styles.stepHeader}>
        <div className={styles.stepTitle}>BRAND ASSIGNMENT</div>
        <div className={styles.stepDesc}>
          Assign a brand to each product — brand is optional. Unassigned products will be skipped on import.
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #222', marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid #CC0000' : '2px solid transparent',
            color: tab === t.key ? '#fff' : '#666', cursor: 'pointer', padding: '8px 18px', fontSize: 13,
            fontWeight: tab === t.key ? 700 : 400, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {t.label}
            <span style={{ background: tab === t.key ? '#CC0000' : '#222', color: t.color || '#aaa', fontSize: 11, borderRadius: 10, padding: '1px 7px', fontWeight: 700 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── Bulk Toolbar ── */}
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
        {creatingFor === 'bulk' ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#aaa', fontWeight: 600 }}>NEW BRAND:</span>
            <input className={styles.textInput} style={{ width: 160 }} placeholder="Brand name" value={newBrandName}
              onChange={e => { setNewBrandName(e.target.value); setNewBrandSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }} />
            <input className={styles.textInput} style={{ width: 140 }} placeholder="Slug (auto)" value={newBrandSlug}
              onChange={e => setNewBrandSlug(e.target.value)} />
            <button className={adminStyles.btnPrimary} style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => createBrand('bulk')}>CREATE</button>
            <button className={adminStyles.btnSecondary} style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setCreatingFor(null)}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#888', fontWeight: 600, letterSpacing: 1 }}>BULK APPLY:</span>
            <select className={styles.selectInput} value={bulkBrandId} onChange={e => setBulkBrandId(e.target.value)}>
              <option value="">Select brand…</option>
              {localBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              <option value="no-brand">⊘ Skip (no brand)</option>
            </select>
            <button className={adminStyles.btnSmall} onClick={applyBulk} disabled={!bulkBrandId || products.length === 0}>Apply to All</button>
            {tab !== 'all' && tabProducts.length > 0 && (
              <button className={adminStyles.btnSmall} style={{ background: '#1a1a2e' }}
                onClick={() => bulkBrandId && applyBulkToSelected(tabProducts.map(p => p.sourceId), bulkBrandId === 'no-brand' ? 'no-brand' : parseInt(bulkBrandId))}>
                Apply to {tab} ({tabProducts.length})
              </button>
            )}
            <div style={{ height: 20, width: 1, background: '#333' }} />
            <button className={adminStyles.btnSmall} style={{ background: '#0a1628', border: '1px solid #22C55E', color: '#22C55E' }} onClick={() => setCreatingFor('bulk')}>+ Add Brand</button>
            <button className={adminStyles.btnSmall} style={{ background: '#1a0a0a', border: '1px solid #555', color: '#888' }}
              onClick={() => applyBulkToSelected(unassigned.map(p => p.sourceId), 'no-brand')} disabled={unassigned.length === 0}>
              Skip Unassigned ({unassigned.length})
            </button>
          </div>
        )}
      </div>

      {/* ── Product Table ── */}
      <div className={adminStyles.tableWrap}>
        <table className={adminStyles.table}>
          <thead><tr>
            <th style={{ width: 36 }}></th>
            <th>Product</th>
            <th>Detected</th>
            <th>Assign Brand</th>
            <th style={{ width: 80, textAlign: 'center' }}>Status</th>
          </tr></thead>
          <tbody>
            {tabProducts.map(p => {
              const current = getAssignment(p);
              const currentBrand = typeof current === 'number' ? localBrands.find(b => b.id === current) : null;
              const status = current === 'no-brand' ? 'skipped' : typeof current === 'number' ? 'assigned' : 'unassigned';
              const rowStyle = status === 'assigned' ? { borderLeft: '3px solid #22C55E' } : status === 'skipped' ? { borderLeft: '3px solid #444', opacity: 0.65 } : { borderLeft: '3px solid #F59E0B' };
              return (
                <tr key={p.sourceId} style={rowStyle}>
                  <td>
                    {status === 'assigned' && <span style={{ color: '#22C55E', fontSize: 16 }}>✓</span>}
                    {status === 'skipped' && <span style={{ color: '#555', fontSize: 16 }}>⊘</span>}
                    {status === 'unassigned' && <span style={{ color: '#F59E0B', fontSize: 16 }}>·</span>}
                  </td>
                  <td style={{ maxWidth: 220, fontSize: 13 }}>{p.name}</td>
                  <td style={{ fontSize: 12, color: '#888' }}>{p.brandName || '—'}</td>
                  <td>
                    {creatingFor === p.sourceId ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <input className={styles.textInput} style={{ width: 130 }} placeholder="Brand name" value={newBrandName}
                          onChange={e => { setNewBrandName(e.target.value); setNewBrandSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }} />
                        <input className={styles.textInput} style={{ width: 120 }} placeholder="Slug" value={newBrandSlug}
                          onChange={e => setNewBrandSlug(e.target.value)} />
                        <button className={adminStyles.btnPrimary} style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => createBrand(p.sourceId)}>CREATE</button>
                        <button className={adminStyles.btnSecondary} style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setCreatingFor(null)}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input className={styles.textInput} style={{ width: 120 }} placeholder="Search…"
                          value={brandSearch[p.sourceId] || ''}
                          onChange={e => setBrandSearch(prev => ({ ...prev, [p.sourceId]: e.target.value }))} />
                        <select className={styles.selectInput} style={{ minWidth: 120 }}
                          value={typeof current === 'number' ? current : current === 'no-brand' ? 'no-brand' : ''}
                          onChange={e => {
                            if (e.target.value === '') clearAssignment(p.sourceId);
                            else setAssignment(p.sourceId, e.target.value === 'no-brand' ? 'no-brand' : parseInt(e.target.value));
                          }}>
                          <option value="">— none —</option>
                          {filteredBrands(brandSearch[p.sourceId] || '').map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <button className={adminStyles.btnSmall} style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setCreatingFor(p.sourceId)} title="Create new brand">+ New</button>
                        <button className={adminStyles.btnSmall} style={{ fontSize: 11, padding: '4px 8px', background: '#1a1a1a', border: '1px solid #444', color: '#888' }}
                          onClick={() => skipProduct(p.sourceId)} title="Skip this product">Skip</button>
                        {current === 'no-brand' && (
                          <button className={adminStyles.btnSmall} style={{ fontSize: 11, padding: '4px 8px', color: '#F59E0B', border: '1px solid #F59E0B', background: 'transparent' }}
                            onClick={() => clearAssignment(p.sourceId)}>Undo</button>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontSize: 11 }}>
                    {status === 'assigned' && <span style={{ color: '#22C55E', fontWeight: 700 }}>{currentBrand?.name}</span>}
                    {status === 'skipped' && <span style={{ color: '#555' }}>SKIP</span>}
                    {status === 'unassigned' && <span style={{ color: '#F59E0B' }}>PENDING</span>}
                  </td>
                </tr>
              );
            })}
            {tabProducts.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#555', padding: 24 }}>No products in this filter</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Summary + CTA ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
          <span style={{ color: '#22C55E' }}>✓ {assigned.length} assigned</span>
          <span style={{ color: '#F59E0B' }}>· {unassigned.length} pending</span>
          <span style={{ color: '#555' }}>⊘ {skipped.length} skipped</span>
        </div>
        <button className={adminStyles.btnPrimary} onClick={handleNext} style={{ marginLeft: 'auto' }}>
          PROCEED TO SETTINGS →
          {unassigned.length > 0 && <span style={{ fontSize: 11, marginLeft: 8, opacity: 0.7 }}>({unassigned.length} will be skipped)</span>}
        </button>
      </div>
    </div>
  );
}


// ── Step 6: Import Settings ───────────────────────────────────
function ImportSettingsStep({ products, pricingRule, setPricingRule, rounding, setRounding, imageMode, setImageMode, manualPrices, setManualPrices, onNext }: {
  products: ScrapedProduct[]; pricingRule: PricingRule; setPricingRule: (r: PricingRule) => void;
  rounding: string; setRounding: (r: string) => void; imageMode: 'cloudinary' | 'supplier-url'; setImageMode: (m: 'cloudinary' | 'supplier-url') => void;
  manualPrices: Map<string, number>; setManualPrices: (m: Map<string, number>) => void; onNext: () => void;
}) {
  const [previewPrices, setPreviewPrices] = useState<Map<string, number>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const m = new Map<string, number>();
      products.forEach(p => { m.set(p.sourceId, calculatePrice(p.sourcePrice, pricingRule, rounding, manualPrices.get(p.sourceId))); });
      setPreviewPrices(m);
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [pricingRule, rounding, manualPrices, products]);

  const MODES: Array<{ mode: PricingMode; title: string; desc: string }> = [
    { mode: 'fixed-markup', title: 'Fixed Markup', desc: 'Source + ₹X' },
    { mode: 'percent-markup', title: 'Percentage', desc: 'Source + X%' },
    { mode: 'combined', title: 'Combined', desc: 'Source + ₹X then + Y%' },
    { mode: 'manual', title: 'Manual Override', desc: 'Set price per product' },
  ];

  return (
    <div>
      <div className={styles.stepHeader}><div className={styles.stepTitle}>IMPORT SETTINGS</div><div className={styles.stepDesc}>Configure pricing, rounding, and image handling</div></div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, letterSpacing: 1, color: '#888', textTransform: 'uppercase', marginBottom: 10 }}>Pricing Mode</div>
        <div className={styles.modeGrid}>
          {MODES.map(m => (
            <div key={m.mode} className={`${styles.modeCard} ${pricingRule.mode === m.mode ? styles.modeCardActive : ''}`} onClick={() => setPricingRule({ ...pricingRule, mode: m.mode })}>
              <div className={styles.modeCardTitle}>{m.title}</div><div className={styles.modeCardDesc}>{m.desc}</div>
            </div>
          ))}
        </div>
        {(pricingRule.mode === 'fixed-markup' || pricingRule.mode === 'combined') && (
          <div className={styles.inputRow} style={{ marginBottom: 10 }}>
            <span className={styles.inputLabel}>Fixed ₹</span>
            <input type="number" className={styles.numInput} min={0} max={999999} value={pricingRule.fixedAmount} onChange={e => setPricingRule({ ...pricingRule, fixedAmount: Number(e.target.value) })} />
          </div>
        )}
        {(pricingRule.mode === 'percent-markup' || pricingRule.mode === 'combined') && (
          <div className={styles.inputRow} style={{ marginBottom: 10 }}>
            <span className={styles.inputLabel}>Percent %</span>
            <input type="number" className={styles.numInput} min={0} max={1000} value={pricingRule.percentage} onChange={e => setPricingRule({ ...pricingRule, percentage: Number(e.target.value) })} />
          </div>
        )}
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, letterSpacing: 1, color: '#888', textTransform: 'uppercase', marginBottom: 10 }}>Price Rounding</div>
        <div className={styles.inputRow}>
          {['none','49','99','100'].map(r => (
            <button key={r} className={`${adminStyles.filterBtn} ${rounding === r ? adminStyles.filterActive : ''}`} onClick={() => setRounding(r)}>
              {r === 'none' ? 'No Rounding' : `₹${r}`}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, letterSpacing: 1, color: '#888', textTransform: 'uppercase', marginBottom: 10 }}>Image Handling</div>
        <div className={styles.inputRow}>
          <button className={`${adminStyles.filterBtn} ${imageMode === 'supplier-url' ? adminStyles.filterActive : ''}`} onClick={() => setImageMode('supplier-url')}>Use Supplier URLs</button>
          <button className={`${adminStyles.filterBtn} ${imageMode === 'cloudinary' ? adminStyles.filterActive : ''}`} onClick={() => setImageMode('cloudinary')}>Upload to Cloudinary</button>
        </div>
        {imageMode === 'cloudinary' && <span className={styles.inlineWarning}>⚠ Requires CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET on backend</span>}
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, letterSpacing: 1, color: '#888', textTransform: 'uppercase', marginBottom: 10 }}>Price Preview</div>
        <div className={adminStyles.tableWrap}>
          <table className={adminStyles.table}>
            <thead><tr><th>Product</th><th>SUPPLIER PRICE</th><th>Sale Price</th></tr></thead>
            <tbody>
              {products.slice(0, 10).map(p => (
                <tr key={p.sourceId}>
                  <td style={{ maxWidth: 200 }}>{p.name}</td>
                  <td><span className={styles.priceOriginal}>{p.sourcePrice > 0 ? fmt(p.sourcePrice) : '—'}</span></td>
                  <td>
                    {pricingRule.mode === 'manual' || p.sourcePrice === 0 ? (
                      <input type="number" className={styles.numInput} style={{ width: 100 }} placeholder="₹ price" value={manualPrices.get(p.sourceId) || ''} onChange={e => { const m = new Map(manualPrices); m.set(p.sourceId, Number(e.target.value)); setManualPrices(m); }} />
                    ) : (
                      <span className={styles.pricePreview}>{previewPrices.get(p.sourceId) ? fmt(previewPrices.get(p.sourceId)!) : '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
              {products.length > 10 && <tr><td colSpan={3} style={{ color: '#555', fontSize: 12 }}>…and {products.length - 10} more</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <button className={adminStyles.btnPrimary} onClick={onNext}>PROCEED TO IMPORT →</button>
    </div>
  );
}

// ── Step 7: Import ────────────────────────────────────────────
function ImportStep({ products, categoryAssignments, brandAssignments, pricingRule, rounding, imageMode, manualPrices, source, sourceUrl, importing, importResult, show, onImport, onViewHistory }: {
  products: ScrapedProduct[]; categoryAssignments: Map<string, { category: string; subcategory: string | null }>;
  brandAssignments: Map<string, number | 'no-brand'>; pricingRule: PricingRule; rounding: string;
  imageMode: string; manualPrices: Map<string, number>; source: string; sourceUrl: string;
  importing: boolean; importResult: { successCount: number; updatedCount: number; failureCount: number; skippedCount: number; log: Array<{ sourceId: string; operation: string; errorMessage?: string }> } | null;
  show: (m: string, t?: 'ok' | 'err') => void; onImport: () => void; onViewHistory: () => void;
}) {
  const toImport = products.filter(p => brandAssignments.get(p.sourceId) !== 'no-brand');
  const toSkip = products.filter(p => brandAssignments.get(p.sourceId) === 'no-brand');

  return (
    <div>
      <div className={styles.stepHeader}><div className={styles.stepTitle}>CONFIRM IMPORT</div><div className={styles.stepDesc}>Review and confirm the import</div></div>
      <div className={styles.resultGrid} style={{ marginBottom: 20 }}>
        <div className={styles.resultCard}><strong className={styles.resultNum}>{toImport.length}</strong><span className={styles.resultLabel}>To Import</span></div>
        <div className={styles.resultCard}><strong className={styles.resultNum} style={{ color: '#F5C400' }}>{toSkip.length}</strong><span className={styles.resultLabel}>To Skip</span></div>
        <div className={styles.resultCard}><strong className={styles.resultNum} style={{ color: '#888' }}>{source}</strong><span className={styles.resultLabel}>Provider</span></div>
        <div className={styles.resultCard}><strong className={styles.resultNum} style={{ color: '#888' }}>{imageMode === 'cloudinary' ? '☁' : '🔗'}</strong><span className={styles.resultLabel}>Images</span></div>
      </div>
      {!importResult && (
        <button className={adminStyles.btnPrimary} onClick={onImport} disabled={importing || toImport.length === 0}>
          {importing ? 'IMPORTING…' : `IMPORT ${toImport.length} PRODUCTS`}
        </button>
      )}
      {importing && <div className={styles.progressWrap} style={{ marginTop: 12 }}><div className={styles.progressFill} style={{ width: '60%', animation: 'none' }} /></div>}
      {importResult && (
        <div style={{ marginTop: 20 }}>
          <div className={styles.resultGrid}>
            <div className={styles.resultCard}><strong className={styles.resultNum} style={{ color: '#22C55E' }}>{importResult.successCount}</strong><span className={styles.resultLabel}>Created</span></div>
            <div className={styles.resultCard}><strong className={styles.resultNum} style={{ color: '#3B82F6' }}>{importResult.updatedCount}</strong><span className={styles.resultLabel}>Updated</span></div>
            <div className={styles.resultCard}><strong className={styles.resultNum} style={{ color: '#F5C400' }}>{importResult.skippedCount}</strong><span className={styles.resultLabel}>Skipped</span></div>
            <div className={styles.resultCard}><strong className={styles.resultNum} style={{ color: '#CC0000' }}>{importResult.failureCount}</strong><span className={styles.resultLabel}>Failed</span></div>
          </div>
          {importResult.log.filter(l => l.operation === 'failed').length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Failures</div>
              {importResult.log.filter(l => l.operation === 'failed').map((l, i) => (
                <div key={i} className={`${styles.logEntry} ${styles.logFailed}`}>{l.sourceId}: {l.errorMessage}</div>
              ))}
            </div>
          )}
          <button className={adminStyles.btnSecondary} onClick={onViewHistory} style={{ marginTop: 16 }}>VIEW HISTORY →</button>
        </div>
      )}
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────
function HistoryTab({ show, onReimport }: { show: (m: string, t?: 'ok' | 'err') => void; onReimport: (url: string) => void }) {
  const [records, setRecords] = useState<ImportHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewLog, setViewLog] = useState<ImportHistoryRecord | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api('/api/admin/scraper/history').then(r => r.json()).then(d => setRecords(d.records || [])).catch(() => show('Failed to load history', 'err')).finally(() => setLoading(false));
  }, [show]);

  useEffect(() => { load(); }, [load]);

  const deleteRecord = async (id: number) => {
    if (!confirm('Delete this history record?')) return;
    const r = await api(`/api/admin/scraper/history/${id}`, { method: 'DELETE' });
    if (r.ok) { setRecords(prev => prev.filter(x => x.id !== id)); show('Deleted'); }
    else show('Failed to delete', 'err');
  };

  const viewDetails = async (id: number) => {
    const r = await api(`/api/admin/scraper/history/${id}`);
    const d = await r.json();
    setViewLog(d);
  };

  if (loading) return <div className={adminStyles.loading}>Loading history…</div>;
  if (records.length === 0) return <div className={styles.emptyState}><p>No import history yet. Run an import to see records here.</p></div>;

  return (
    <div>
      <h2 className={adminStyles.sectionTitle}>Import History</h2>
      <div className={adminStyles.tableWrap}>
        <table className={adminStyles.table}>
          <thead><tr><th>Date</th><th>Source</th><th>URL</th><th>Created</th><th>Updated</th><th>Skipped</th><th>Failed</th><th>Actions</th></tr></thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id}>
                <td>{fmtDate(r.importedAt)}</td>
                <td><span className={adminStyles.badge} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#aaa' }}>{r.source}</span></td>
                <td style={{ maxWidth: 200, fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sourceUrl}</td>
                <td style={{ color: '#22C55E' }}>{r.successCount}</td>
                <td style={{ color: '#3B82F6' }}>{r.updatedCount}</td>
                <td style={{ color: '#F5C400' }}>{r.skippedCount}</td>
                <td style={{ color: r.failureCount > 0 ? '#CC0000' : '#888' }}>{r.failureCount}</td>
                <td>
                  <div className={adminStyles.actionRow}>
                    <button className={adminStyles.iconBtn} onClick={() => viewDetails(r.id)}>📋</button>
                    <button className={adminStyles.iconBtn} onClick={() => onReimport(r.sourceUrl)}>↩</button>
                    <button className={adminStyles.iconBtnDanger} onClick={() => deleteRecord(r.id)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {viewLog && (
        <div className={adminStyles.modalOverlay} onClick={() => setViewLog(null)}>
          <div className={adminStyles.modalLarge} onClick={e => e.stopPropagation()}>
            <h3 className={adminStyles.modalTitle}>Import Log — {fmtDate(viewLog.importedAt)}</h3>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {(viewLog.log || []).map((l, i) => (
                <div key={i} className={`${styles.logEntry} ${l.operation === 'created' ? styles.logCreated : l.operation === 'updated' ? styles.logUpdated : l.operation === 'skipped' ? styles.logSkipped : styles.logFailed}`}>
                  {l.sourceId} — {l.operation}{l.errorMessage ? `: ${l.errorMessage}` : ''}
                </div>
              ))}
            </div>
            <button className={adminStyles.btnSecondary} onClick={() => setViewLog(null)} style={{ marginTop: 16 }}>CLOSE</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sync Tab ──────────────────────────────────────────────────
function SyncTab({ show, brands }: { show: (m: string, t?: 'ok' | 'err') => void; brands: Brand[] }) {
  const [products, setProducts] = useState<Array<{ id: number; name: string; source: string; sourceId: string; sourceUrl: string | null; lastSync: string | null; inStock: boolean; images: string[]; brand: { name: string } | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api('/api/products').then(r => r.json()).then(d => setProducts((Array.isArray(d) ? d : []).filter((p: { source?: string | null }) => p.source))).catch(() => show('Failed to load', 'err')).finally(() => setLoading(false));
  }, [show]);

  useEffect(() => { load(); }, [load]);

  const syncNow = async (id: number) => {
    setSyncing(id);
    try {
      const r = await api(`/api/admin/scraper/sync/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const d = await r.json();
      if (!r.ok) { show(d.error || 'Sync failed', 'err'); return; }
      show(d.notFound ? 'Product not found at source — marked out of stock' : 'Synced successfully');
      load();
    } catch { show('Sync failed', 'err'); } finally { setSyncing(null); }
  };

  const disconnect = async (id: number, name: string) => {
    if (!confirm(`Disconnect source tracking for "${name}"? The product will remain but won't sync.`)) return;
    const r = await api(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: null, sourceId: null, lastSync: null }) });
    if (r.ok) { show('Source disconnected'); load(); }
    else show('Failed to disconnect', 'err');
  };

  if (loading) return <div className={adminStyles.loading}>Loading imported products…</div>;
  if (products.length === 0) return <div className={styles.emptyState}><p>No imported products found. Import products using the wizard to see them here.</p></div>;

  return (
    <div>
      <h2 className={adminStyles.sectionTitle}>Sync Imported Products ({products.length})</h2>
      <div className={adminStyles.tableWrap}>
        <table className={adminStyles.table}>
          <thead><tr><th>Image</th><th>Name</th><th>Source</th><th>Source ID</th><th>Last Sync</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>{p.images?.[0] ? <img src={p.images[0]} alt="" className={adminStyles.thumbImg} /> : '—'}</td>
                <td>{p.name}</td>
                <td><span className={adminStyles.badge} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#aaa' }}>{p.source}</span></td>
                <td className={adminStyles.mono} style={{ fontSize: 11 }}>{p.sourceId}</td>
                <td style={{ fontSize: 12, color: '#888' }}>{p.lastSync ? fmtDate(p.lastSync) : 'Never'}</td>
                <td><span className={p.inStock ? styles.statusConnected : styles.statusNotFound}>{p.inStock ? 'Connected' : 'Out of Stock'}</span></td>
                <td>
                  <div className={adminStyles.actionRow}>
                    <button className={adminStyles.iconBtn} onClick={() => syncNow(p.id)} disabled={syncing === p.id}>{syncing === p.id ? '…' : '🔄'}</button>
                    <button className={adminStyles.iconBtnDanger} onClick={() => disconnect(p.id, p.name)}>🔌</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
