import sys

path = r'c:\Users\Matin\claude website ue\frontend\src\app\admin\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

categories_section = r'''
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
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

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
          <div className={styles.formGroup}>
            <label>Image URL</label>
            <input value={form.image} onChange={e => set('image', e.target.value)} placeholder="https://\u2026" />
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

'''

# Insert before 'function BrandsSection'
insert_marker = '\nfunction BrandsSection'
idx = content.find(insert_marker)
if idx == -1:
    print('ERROR: Could not find insertion point')
    sys.exit(1)

new_content = content[:idx] + categories_section + content[idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('SUCCESS: CategoriesSection inserted before BrandsSection')
print(f'Original length: {len(content)}, New length: {len(new_content)}')
