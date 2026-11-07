import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowDownUp, Boxes, Check, IndianRupee, PackageX, RefreshCw, Warehouse } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { DataTable, ExportButton, FilterSelect, Panel, SearchInput, StatCard, StatusPill, TablePagination } from '../../components/admin/AdminUI.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input, Select } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { inr, formatDateTime } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function AdminInventory() {
  useDocumentTitle('Inventory', 'Track and adjust stock.');
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Manual correction');
  const [busy, setBusy] = useState(false);
  const [movements, setMovements] = useState([]);
  const [movementsOpen, setMovementsOpen] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi
      .inventory({ q, level, page, limit: 20 })
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta || {});
        setStats(res.meta?.stats || {});
      })
      .catch((err) => toast(apiErrorMessage(err, 'Could not load inventory'), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [q, level, page]);

  const openMovements = async () => {
    setMovementsOpen(true);
    try {
      const res = await adminApi.stockMovements({ limit: 25 });
      setMovements(res.data || []);
    } catch {
      setMovements([]);
    }
  };

  const applyStock = async () => {
    const delta = Number(amount);
    if (!delta) return toast('Enter a non-zero quantity', 'error');
    setBusy(true);
    try {
      await adminApi.updateStock({ productId: editing.productId, variantId: editing._id, quantity: delta, reason });
      toast('Stock updated');
      setEditing(null);
      setAmount('');
      load();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not update stock'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Inventory"
        subtitle="Variant-level stock across the catalogue"
        breadcrumb="Catalogue"
        actions={
          <>
            <button onClick={openMovements} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line-color)] bg-[var(--surface-raised)] px-3 text-[11.5px] font-medium text-[var(--ink)] hover:border-[var(--accent)]">
              <ArrowDownUp size={13} /> Movements
            </button>
            <ExportButton
              filename="vimuhet-inventory.csv"
              rows={rows.map((r) => ({ product: r.name, sku: r.sku, size: r.size, color: r.color, stock: r.stock, reserved: r.reserved, threshold: r.threshold }))}
            />
            <Button size="sm" variant="outline" icon={RefreshCw} onClick={load}>Refresh</Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Units In Stock" value={stats.totalStock ?? '—'} icon={Warehouse} loading={loading && !stats.totalStock} />
        <StatCard label="Low Stock" value={stats.lowStock ?? '—'} icon={AlertTriangle} tone="amber" loading={loading && !stats.totalStock} />
        <StatCard label="Out Of Stock" value={stats.outOfStock ?? '—'} icon={PackageX} tone="red" loading={loading && !stats.totalStock} />
        <StatCard label="Inventory Value" value={stats.inventoryValue != null ? inr(stats.inventoryValue) : '—'} icon={IndianRupee} tone="blue" loading={loading && !stats.totalStock} />
      </div>

      <Panel padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line-color)] p-3">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search products…" className="min-w-[200px] flex-1 sm:max-w-xs" />
          <FilterSelect value={level} onChange={(v) => { setLevel(v); setPage(1); }} placeholder="All stock levels" options={[{ value: 'low', label: 'Low stock' }, { value: 'out', label: 'Out of stock' }]} />
          <span className="ml-auto text-[11px] text-[var(--ink-muted)]">{meta.total || 0} variants</span>
        </div>
        <div className="p-3">
          <DataTable
            loading={loading}
            rowKey="_id"
            rows={rows}
            empty="No variants match these filters"
            footer={<TablePagination page={meta.page || 1} totalPages={meta.totalPages || 1} total={meta.total} onChange={setPage} />}
            columns={[
              {
                key: 'name',
                header: 'Product',
                render: (r) => (
                  <div className="flex items-center gap-2.5">
                    {r.image ? <img src={r.image} alt="" className="h-9 w-7 rounded object-cover" loading="lazy" /> : <span className="flex h-9 w-7 items-center justify-center rounded bg-[var(--surface-sunken)]"><Boxes size={12} className="text-[var(--ink-muted)]" /></span>}
                    <div className="min-w-0">
                      <Link to={`/admin/products/${r.productId}/edit`} className="line-clamp-1 font-medium text-[var(--ink)] hover:text-[var(--accent)]">{r.name}</Link>
                      <p className="font-mono text-[10px] text-[var(--ink-muted)]">{r.sku}</p>
                    </div>
                  </div>
                ),
              },
              { key: 'size', header: 'Size', render: (r) => <StatusPill tone="neutral">{r.size}</StatusPill> },
              { key: 'color', header: 'Colour' },
              {
                key: 'stock',
                header: 'Stock',
                align: 'right',
                render: (r) => (
                  <span className={`font-semibold ${r.stock <= 0 ? 'text-red-600' : r.stock <= r.threshold ? 'text-amber-600' : 'text-[var(--ink)]'}`}>{r.stock}</span>
                ),
              },
              { key: 'reserved', header: 'Reserved', align: 'right', render: (r) => <span className="text-[var(--ink-muted)]">{r.reserved || 0}</span> },
              { key: 'threshold', header: 'Threshold', align: 'right', render: (r) => <span className="text-[var(--ink-muted)]">{r.threshold}</span> },
              {
                key: 'level',
                header: 'Level',
                render: (r) => (
                  <StatusPill tone={r.stock <= 0 ? 'red' : r.stock <= r.threshold ? 'amber' : 'green'}>
                    {r.stock <= 0 ? 'Out of stock' : r.stock <= r.threshold ? 'Low' : 'Healthy'}
                  </StatusPill>
                ),
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (r) => (
                  <Button size="xs" variant="outline" onClick={() => { setEditing(r); setAmount(''); }}>
                    Adjust
                  </Button>
                ),
              },
            ]}
          />
        </div>
      </Panel>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Adjust stock" size="sm">
        {editing && (
          <div className="space-y-4">
            <div className="rounded-lg bg-[var(--surface-sunken)] p-3">
              <p className="text-[12.5px] font-medium text-[var(--ink)]">{editing.name}</p>
              <p className="text-[11px] text-[var(--ink-muted)]">{editing.sku} · {editing.size} / {editing.color} · currently {editing.stock} units</p>
            </div>
            <Input
              label="Adjustment"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 10 to add, -3 to remove"
              hint={<span className="text-[9px] uppercase">Positive adds · negative removes</span>}
            />
            <Select label="Reason" options={['Manual correction', 'New stock received', 'Damaged / defective', 'Return to stock', 'Stock take adjustment']} value={reason} onChange={(e) => setReason(e.target.value)} />
            <p className="flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)]">
              <Check size={11} className="text-[#2F7A4D]" /> Every adjustment is recorded in stock movements and the audit trail.
            </p>
            <Button className="w-full" onClick={applyStock} loading={busy}>
              Apply adjustment
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={movementsOpen} onClose={() => setMovementsOpen(false)} title="Recent stock movements" size="lg">
        {movements.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-[var(--ink-muted)]">No stock movements recorded yet</p>
        ) : (
          <ul className="divide-y divide-[var(--line-color)]">
            {movements.map((m) => (
              <li key={m._id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-[var(--ink)]">{m.product?.name || 'Product'}</p>
                  <p className="text-[10.5px] text-[var(--ink-muted)]">
                    {m.reason || m.type} · {m.size ? `${m.size}/${m.color} · ` : ''}{formatDateTime(m.createdAt)}{m.by ? ` · ${m.by}` : ''}
                  </p>
                </div>
                <span className={`shrink-0 text-[12px] font-semibold ${m.quantity > 0 ? 'text-[#2F7A4D] dark:text-emerald-400' : 'text-red-600'}`}>
                  {m.quantity > 0 ? '+' : ''}{m.quantity}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
