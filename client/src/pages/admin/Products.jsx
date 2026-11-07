import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, Eye, MoreHorizontal, Package, Pencil, Plus, Star, Trash2, Upload } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { DataTable, ExportButton, FilterSelect, Panel, SearchInput, StatCard, StatusPill, TablePagination } from '../../components/admin/AdminUI.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { inr, formatDate } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function AdminProducts() {
  useDocumentTitle('Products', 'Manage the Vimuhet catalogue.');
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { categories } = useStore();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [menuFor, setMenuFor] = useState(null);

  const q = params.get('q') || '';
  const status = params.get('status') || '';
  const category = params.get('category') || '';
  const stock = params.get('stock') || '';
  const sort = params.get('sort') || 'newest';
  const page = Number(params.get('page') || 1);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const load = () => {
    setLoading(true);
    adminApi
      .products({ q, status, category, stock, sort, page, limit: 10 })
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta || {});
        setStats(res.meta?.stats || {});
        setSelected([]);
      })
      .catch((err) => toast(apiErrorMessage(err, 'Could not load products'), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [q, status, category, stock, sort, page]);

  const bulk = async (action, value) => {
    if (!selected.length) return;
    setBusy(true);
    try {
      await adminApi.bulkProducts({ ids: selected, action, value });
      toast('Products updated');
      load();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await adminApi.deleteProduct(deleting._id);
      toast('Product deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async (row) => {
    try {
      const res = await adminApi.duplicateProduct(row._id);
      toast('Duplicated as a draft');
      navigate(`/admin/products/${res.data._id}/edit`);
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'select',
        header: (
          <input
            type="checkbox"
            aria-label="Select all"
            checked={rows.length > 0 && selected.length === rows.length}
            onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r._id) : [])}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
        ),
        render: (r) => (
          <input
            type="checkbox"
            aria-label={`Select ${r.name}`}
            checked={selected.includes(r._id)}
            onChange={(e) => setSelected((s) => (e.target.checked ? [...s, r._id] : s.filter((x) => x !== r._id)))}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
        ),
      },
      {
        key: 'name',
        header: 'Product',
        render: (r) => (
          <div className="flex items-center gap-2.5">
            {r.images?.[0]?.url ? (
              <img src={r.images[0].url} alt="" className="h-10 w-8 rounded object-cover" loading="lazy" />
            ) : (
              <span className="flex h-10 w-8 items-center justify-center rounded bg-[var(--surface-sunken)]">
                <Package size={13} className="text-[var(--ink-muted)]" />
              </span>
            )}
            <div className="min-w-0">
              <Link to={`/admin/products/${r._id}/edit`} className="line-clamp-1 font-medium text-[var(--ink)] hover:text-[var(--accent)]">
                {r.name}
              </Link>
              <p className="text-[10.5px] text-[var(--ink-muted)]">{r.sku} · {r.category?.name || '—'}</p>
            </div>
          </div>
        ),
      },
      { key: 'price', header: 'Price', align: 'right', render: (r) => <span className="font-medium">{inr(r.price)}</span> },
      {
        key: 'stock',
        header: 'Stock',
        align: 'right',
        render: (r) => (
          <span className={`font-medium ${r.stock <= 0 ? 'text-red-600' : r.stock <= (r.lowStockThreshold || 5) ? 'text-amber-600' : 'text-[var(--ink)]'}`}>{r.stock}</span>
        ),
      },
      { key: 'soldCount', header: 'Sold', align: 'right', render: (r) => r.soldCount || 0 },
      { key: 'status', header: 'Status', render: (r) => <StatusPill tone={r.status === 'ACTIVE' ? 'green' : r.status === 'DRAFT' ? 'amber' : 'neutral'}>{r.status}</StatusPill> },
      { key: 'createdAt', header: 'Added', render: (r) => <span className="text-[11px] text-[var(--ink-muted)]">{formatDate(r.createdAt)}</span> },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (r) => (
          <div className="relative flex items-center justify-end gap-1">
            <Link to={`/product/${r.slug}`} target="_blank" className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]" title="View on storefront">
              <Eye size={13} />
            </Link>
            <Link to={`/admin/products/${r._id}/edit`} className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]" title="Edit">
              <Pencil size={13} />
            </Link>
            <button onClick={() => setMenuFor(menuFor === r._id ? null : r._id)} className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)]" title="More">
              <MoreHorizontal size={13} />
            </button>
            {menuFor === r._id && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuFor(null)} />
                <div className="absolute right-0 top-7 z-30 w-40 overflow-hidden rounded-lg border border-[var(--line-color)] bg-[var(--surface-raised)] py-1 shadow-xl">
                  <button onClick={() => { duplicate(r); setMenuFor(null); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-[11.5px] hover:bg-[var(--surface-sunken)]">
                    <Copy size={12} /> Duplicate
                  </button>
                  <button
                    onClick={async () => {
                      await adminApi.bulkProducts({ ids: [r._id], action: 'feature', value: !r.isFeatured });
                      toast(r.isFeatured ? 'Removed from featured' : 'Marked as featured');
                      setMenuFor(null);
                      load();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-[11.5px] hover:bg-[var(--surface-sunken)]"
                  >
                    <Star size={12} /> {r.isFeatured ? 'Unfeature' : 'Feature'}
                  </button>
                  <button onClick={() => { setDeleting(r); setMenuFor(null); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-[11.5px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ),
      },
    ],
    [rows, selected, menuFor]
  );

  return (
    <div>
      <AdminPageHeader
        title="Products"
        subtitle="Create, price and publish the catalogue"
        breadcrumb="Catalogue"
        actions={
          <>
            <ExportButton
              filename="vimuhet-products.csv"
              rows={rows.map((r) => ({ name: r.name, sku: r.sku, category: r.category?.name || '', price: r.price, mrp: r.mrp, stock: r.stock, status: r.status }))}
            />
            <Button size="sm" to="/admin/products/new" icon={Plus}>
              Add Product
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Products" value={stats.total ?? '—'} icon={Package} loading={loading && !stats.total} />
        <StatCard label="Active" value={stats.active ?? '—'} icon={Eye} tone="green" loading={loading && !stats.total} />
        <StatCard label="Low Stock" value={stats.lowStock ?? '—'} icon={Package} tone="amber" loading={loading && !stats.total} />
        <StatCard label="Inventory Value" value={stats.inventoryValue != null ? inr(stats.inventoryValue) : '—'} icon={Upload} tone="blue" loading={loading && !stats.total} />
      </div>

      <Panel padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line-color)] p-3">
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search by name or SKU…" className="min-w-[200px] flex-1 sm:max-w-xs" />
          <FilterSelect value={category} onChange={(v) => setParam('category', v)} placeholder="All categories" options={(categories || []).map((c) => ({ value: c._id, label: c.name }))} />
          <FilterSelect value={status} onChange={(v) => setParam('status', v)} placeholder="Any status" options={STATUS_OPTIONS} />
          <FilterSelect value={stock} onChange={(v) => setParam('stock', v)} placeholder="Any stock" options={[{ value: 'low', label: 'Low stock' }, { value: 'out', label: 'Out of stock' }]} />
          <FilterSelect
            value={sort}
            onChange={(v) => setParam('sort', v || 'newest')}
            placeholder="Newest first"
            options={[
              { value: 'oldest', label: 'Oldest first' },
              { value: 'name-asc', label: 'Name A–Z' },
              { value: 'price-asc', label: 'Price ↑' },
              { value: 'price-desc', label: 'Price ↓' },
              { value: 'stock-asc', label: 'Stock ↑' },
              { value: 'sales-desc', label: 'Best selling' },
            ]}
          />
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line-color)] bg-[var(--accent-soft)]/40 px-3 py-2 text-[11.5px]">
            <span className="font-medium text-[var(--accent)]">{selected.length} selected</span>
            <button onClick={() => bulk('status', 'ACTIVE')} disabled={busy} className="rounded-md border border-[var(--line-color)] bg-[var(--surface-raised)] px-2 py-1 hover:border-[var(--accent)]">Publish</button>
            <button onClick={() => bulk('status', 'DRAFT')} disabled={busy} className="rounded-md border border-[var(--line-color)] bg-[var(--surface-raised)] px-2 py-1 hover:border-[var(--accent)]">Unpublish</button>
            <button onClick={() => bulk('feature', true)} disabled={busy} className="rounded-md border border-[var(--line-color)] bg-[var(--surface-raised)] px-2 py-1 hover:border-[var(--accent)]">Feature</button>
            <button
              onClick={() => {
                if (window.confirm(`Delete ${selected.length} products permanently?`)) bulk('delete');
              }}
              disabled={busy}
              className="rounded-md border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
            >
              Delete
            </button>
            <button onClick={() => setSelected([])} className="ml-auto text-[var(--ink-muted)] hover:text-[var(--ink)]">Clear</button>
          </div>
        )}

        <div className="p-3">
          <DataTable
            loading={loading}
            rows={rows}
            columns={columns}
            empty="No products match these filters"
            footer={<TablePagination page={meta.page || 1} totalPages={meta.totalPages || 1} total={meta.total} onChange={(p) => setParam('page', String(p))} />}
          />
        </div>
      </Panel>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title={`Delete "${deleting?.name}"?`}
        message="This removes the product and its images. Past orders keep their own snapshot of the item."
        confirmLabel="Delete product"
      />
    </div>
  );
}
