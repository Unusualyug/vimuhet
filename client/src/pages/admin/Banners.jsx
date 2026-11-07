import { useEffect, useState } from 'react';
import { CalendarClock, Eye, Image as ImageIcon, MousePointerClick, Pencil, Plus, Trash2 } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { DataTable, Panel, StatCard, StatusPill } from '../../components/admin/AdminUI.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Modal.jsx';
import { Input, Select, Toggle } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { formatDate } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const POSITIONS = [
  { value: 'HOME_HERO', label: 'Home hero' },
  { value: 'HOME_MID', label: 'Home mid section' },
  { value: 'HOME_BOTTOM', label: 'Home bottom' },
  { value: 'CATEGORY_TOP', label: 'Category top' },
  { value: 'SHOP_TOP', label: 'Shop top' },
  { value: 'CHECKOUT', label: 'Checkout' },
];

const empty = () => ({
  title: '',
  subtitle: '',
  image: { url: '' },
  mobileImage: { url: '' },
  ctaLabel: 'Shop Now',
  ctaLink: '/shop',
  position: 'HOME_MID',
  isActive: true,
  sortOrder: 0,
  theme: 'burgundy',
  startDate: '',
  endDate: '',
});

export default function AdminBanners() {
  useDocumentTitle('Banners', 'Promotional banners across the storefront.');
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty());
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi
      .banners()
      .then((res) => setRows(res.data || []))
      .catch((err) => toast(apiErrorMessage(err, 'Could not load banners'), 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async () => {
    if (!form.title.trim()) return toast('Banner title is required', 'error');
    if (!form.image?.url) return toast('A banner image URL is required', 'error');
    setBusy(true);
    try {
      await adminApi.saveBanner(
        {
          ...form,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
        },
        editing === 'new' ? null : editing._id
      );
      toast(editing === 'new' ? 'Banner created' : 'Banner updated');
      setEditing(null);
      load();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not save this banner'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await adminApi.deleteBanner(deleting._id);
      toast('Banner deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const isLive = (b) =>
    b.isActive && (!b.startDate || new Date(b.startDate) <= new Date()) && (!b.endDate || new Date(b.endDate) >= new Date());

  const clicks = rows.reduce((s, r) => s + (r.clickCount || 0), 0);
  const views = rows.reduce((s, r) => s + (r.viewCount || 0), 0);

  return (
    <div>
      <AdminPageHeader
        title="Banners"
        subtitle="Scheduled promotional placements"
        breadcrumb="Content"
        actions={<Button size="sm" icon={Plus} onClick={() => { setForm(empty()); setEditing('new'); }}>Create Banner</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Banners" value={rows.length} icon={ImageIcon} loading={loading} />
        <StatCard label="Live Now" value={rows.filter(isLive).length} icon={Eye} tone="green" loading={loading} />
        <StatCard label="Click-throughs" value={clicks} icon={MousePointerClick} tone="blue" hint={`${views} views`} loading={loading} />
      </div>

      <Panel padded={false}>
        <div className="p-3">
          <DataTable
            loading={loading}
            rows={rows}
            empty="No banners yet"
            columns={[
              {
                key: 'title',
                header: 'Banner',
                render: (r) => (
                  <div className="flex items-center gap-2.5">
                    {r.image?.url ? <img src={r.image.url} alt="" className="h-9 w-16 rounded object-cover" loading="lazy" /> : <span className="flex h-9 w-16 items-center justify-center rounded bg-[var(--surface-sunken)]"><ImageIcon size={13} className="text-[var(--ink-muted)]" /></span>}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--ink)]">{r.title}</p>
                      <p className="truncate text-[10.5px] text-[var(--ink-muted)]">{r.ctaLabel} → {r.ctaLink}</p>
                    </div>
                  </div>
                ),
              },
              { key: 'position', header: 'Placement', render: (r) => <StatusPill tone="neutral">{POSITIONS.find((p) => p.value === r.position)?.label || r.position}</StatusPill> },
              {
                key: 'schedule',
                header: 'Schedule',
                render: (r) => (
                  <span className="flex items-center gap-1 text-[11px] text-[var(--ink-muted)]">
                    <CalendarClock size={11} /> {r.startDate ? formatDate(r.startDate) : 'Now'} — {r.endDate ? formatDate(r.endDate) : 'No end'}
                  </span>
                ),
              },
              { key: 'metrics', header: 'Views / Clicks', align: 'right', render: (r) => <span className="text-[11.5px] text-[var(--ink-muted)]">{r.viewCount || 0} / {r.clickCount || 0}</span> },
              { key: 'status', header: 'Status', render: (r) => <StatusPill tone={isLive(r) ? 'green' : r.isActive ? 'amber' : 'neutral'}>{isLive(r) ? 'Live' : r.isActive ? 'Scheduled' : 'Inactive'}</StatusPill> },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (r) => (
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setForm({ ...empty(), ...r, startDate: r.startDate ? new Date(r.startDate).toISOString().slice(0, 10) : '', endDate: r.endDate ? new Date(r.endDate).toISOString().slice(0, 10) : '' }); setEditing(r); }} className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]" title="Edit">
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

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Create banner' : 'Edit banner'} size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} containerClass="sm:col-span-2" />
          <Input label="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} containerClass="sm:col-span-2" />
          <Input label="Image path / URL" required value={form.image?.url || ''} onChange={(e) => setForm({ ...form, image: { url: e.target.value } })} placeholder="/media/banners/promo-festive-2000.jpg" containerClass="sm:col-span-2" />
          <Input label="CTA label" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
          <Input label="CTA link" value={form.ctaLink} onChange={(e) => setForm({ ...form, ctaLink: e.target.value })} placeholder="/shop" />
          <Select label="Placement" options={POSITIONS} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <Select label="Theme" options={[{ value: 'burgundy', label: 'Burgundy' }, { value: 'ivory', label: 'Ivory' }, { value: 'dark', label: 'Dark wine' }]} value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} />
          <Input label="Start date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <Input label="End date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          <Input label="Sort order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          <div className="pt-5">
            <Toggle label="Active" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
          </div>
          {form.image?.url && <img src={form.image.url} alt="" className="h-28 w-full rounded-lg object-cover sm:col-span-2" />}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={save} loading={busy}>Save banner</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title={`Delete "${deleting?.title}"?`}
        message="The banner is removed from the storefront immediately."
        confirmLabel="Delete banner"
      />
    </div>
  );
}
