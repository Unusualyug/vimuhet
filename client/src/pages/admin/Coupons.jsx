import { useEffect, useState } from 'react';
import { CalendarClock, Copy, Gift, Pencil, Percent, Plus, Ticket, Trash2 } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { DataTable, ExportButton, FilterSelect, Panel, SearchInput, StatCard, StatusPill, TablePagination } from '../../components/admin/AdminUI.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Modal.jsx';
import { Input, Textarea, Select, Toggle } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { inr, formatDate } from '../../utils/format.js';
import { useStore } from '../../context/StoreContext.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const emptyCoupon = () => ({
  code: '',
  description: '',
  type: 'PERCENTAGE',
  value: 10,
  maxDiscount: 0,
  minOrderValue: 0,
  usageLimit: 0,
  usageLimitPerCustomer: 1,
  startDate: new Date().toISOString().slice(0, 10),
  expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  freeShipping: false,
  firstOrderOnly: false,
  isActive: true,
});

export default function AdminCoupons() {
  useDocumentTitle('Coupons', 'Create and manage discount codes.');
  const { toast } = useToast();
  const { categories } = useStore();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCoupon());
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi
      .coupons({ q, status, page, limit: 15 })
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta || {});
      })
      .catch((err) => toast(apiErrorMessage(err, 'Could not load coupons'), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [q, status, page]);

  const save = async () => {
    if (!form.code.trim()) return toast('A coupon code is required', 'error');
    if (Number(form.value) <= 0 && !form.freeShipping) return toast('Enter a discount value', 'error');
    setBusy(true);
    try {
      await adminApi.saveCoupon(
        {
          ...form,
          code: form.code.toUpperCase().trim(),
          value: Number(form.value),
          maxDiscount: Number(form.maxDiscount) || 0,
          minOrderValue: Number(form.minOrderValue) || 0,
          usageLimit: Number(form.usageLimit) || 0,
          usageLimitPerCustomer: Number(form.usageLimitPerCustomer) || 1,
          categories: form.categories || [],
        },
        editing === 'new' ? null : editing._id
      );
      toast(editing === 'new' ? 'Coupon created' : 'Coupon updated');
      setEditing(null);
      load();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not save this coupon'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await adminApi.deleteCoupon(deleting._id);
      toast('Coupon deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const isLive = (c) => c.isActive && new Date(c.startDate) <= new Date() && new Date(c.expiryDate) >= new Date();

  return (
    <div>
      <AdminPageHeader
        title="Coupons"
        subtitle="Discount codes, free shipping and first-order offers"
        breadcrumb="Sales"
        actions={
          <>
            <ExportButton filename="vimuhet-coupons.csv" rows={rows.map((r) => ({ code: r.code, type: r.type, value: r.value, used: r.usedCount, limit: r.usageLimit, expires: formatDate(r.expiryDate) }))} />
            <Button size="sm" icon={Plus} onClick={() => { setForm(emptyCoupon()); setEditing('new'); }}>Create Coupon</Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Coupons" value={meta.total ?? rows.length} icon={Ticket} loading={loading && meta.total == null} />
        <StatCard label="Live" value={rows.filter(isLive).length} icon={Gift} tone="green" loading={loading && meta.total == null} />
        <StatCard label="Redemptions" value={rows.reduce((s, r) => s + (r.usedCount || 0), 0)} icon={Percent} tone="blue" loading={loading && meta.total == null} />
      </div>

      <Panel padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line-color)] p-3">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search code…" className="min-w-[180px] flex-1 sm:max-w-xs" />
          <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} placeholder="All coupons" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </div>
        <div className="p-3">
          <DataTable
            loading={loading}
            rows={rows}
            empty="No coupons yet — create your first offer"
            footer={<TablePagination page={meta.page || 1} totalPages={meta.totalPages || 1} total={meta.total} onChange={setPage} />}
            columns={[
              {
                key: 'code',
                header: 'Code',
                render: (r) => (
                  <div>
                    <p className="font-mono text-[12px] font-semibold tracking-wide text-[var(--ink)]">{r.code}</p>
                    <p className="line-clamp-1 max-w-[200px] text-[10.5px] text-[var(--ink-muted)]">{r.description || '—'}</p>
                  </div>
                ),
              },
              {
                key: 'type',
                header: 'Discount',
                render: (r) => (
                  <span className="text-[12px] font-medium text-[var(--ink)]">
                    {r.type === 'PERCENTAGE' ? `${r.value}% off` : inr(r.value)}
                    {r.freeShipping && <span className="ml-1.5 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] text-[var(--accent)]">Free ship</span>}
                  </span>
                ),
              },
              { key: 'minOrderValue', header: 'Min Order', align: 'right', render: (r) => <span className="text-[11.5px] text-[var(--ink-muted)]">{r.minOrderValue ? inr(r.minOrderValue) : '—'}</span> },
              {
                key: 'used',
                header: 'Used',
                align: 'right',
                render: (r) => (
                  <span className="text-[11.5px]">
                    {r.usedCount || 0}
                    <span className="text-[var(--ink-muted)]"> / {r.usageLimit || '∞'}</span>
                  </span>
                ),
              },
              { key: 'expiry', header: 'Expires', render: (r) => <span className="flex items-center gap-1 text-[11px] text-[var(--ink-muted)]"><CalendarClock size={11} /> {formatDate(r.expiryDate)}</span> },
              { key: 'status', header: 'Status', render: (r) => <StatusPill tone={isLive(r) ? 'green' : r.isActive ? 'amber' : 'neutral'}>{isLive(r) ? 'Live' : r.isActive ? 'Scheduled' : 'Inactive'}</StatusPill> },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (r) => (
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { navigator.clipboard?.writeText(r.code); toast('Code copied'); }} className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)]" title="Copy code">
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={() => {
                        setForm({
                          ...r,
                          startDate: new Date(r.startDate).toISOString().slice(0, 10),
                          expiryDate: new Date(r.expiryDate).toISOString().slice(0, 10),
                          categories: (r.categories || []).map((c) => c._id || c),
                        });
                        setEditing(r);
                      }}
                      className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleting(r)} className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </Panel>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Create coupon' : `Edit ${form.code}`} size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="VIMUHET300" />
          <Select label="Type" options={[{ value: 'PERCENTAGE', label: 'Percentage off' }, { value: 'FIXED', label: 'Fixed amount off' }]} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          <Input label={form.type === 'PERCENTAGE' ? 'Discount %' : 'Discount ₹'} type="number" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          <Input label="Max discount (₹)" type="number" min={0} value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} hint={<span className="text-[9px] uppercase">0 = no cap</span>} />
          <Input label="Min order value (₹)" type="number" min={0} value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })} />
          <Input label="Total usage limit" type="number" min={0} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} hint={<span className="text-[9px] uppercase">0 = unlimited</span>} />
          <Input label="Per customer limit" type="number" min={1} value={form.usageLimitPerCustomer} onChange={(e) => setForm({ ...form, usageLimitPerCustomer: e.target.value })} />
          <Input label="Start date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <Input label="Expiry date" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          <div className="sm:col-span-2">
            <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Shown to customers in the offers list" />
          </div>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">Limit to categories (optional)</p>
            <div className="flex flex-wrap gap-1.5">
              {(categories || []).map((c) => {
                const on = (form.categories || []).includes(c._id);
                return (
                  <button
                    key={c._id}
                    onClick={() => setForm({ ...form, categories: on ? form.categories.filter((x) => x !== c._id) : [...(form.categories || []), c._id] })}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition ${on ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--line-color)] text-[var(--ink-muted)]'}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Toggle label="Free shipping coupon" description="Waives the shipping fee in addition to any discount" checked={form.freeShipping} onChange={(v) => setForm({ ...form, freeShipping: v })} />
            <Toggle label="First order only" description="Valid only for customers with no previous paid orders" checked={form.firstOrderOnly} onChange={(v) => setForm({ ...form, firstOrderOnly: v })} />
            <Toggle label="Active" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={save} loading={busy}>Save coupon</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title={`Delete ${deleting?.code}?`}
        message="Customers will no longer be able to redeem this code. Existing orders keep their discount."
        confirmLabel="Delete coupon"
      />
    </div>
  );
}
