import { useEffect, useState } from 'react';
import { BookOpen, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { DataTable, Panel, StatCard, StatusPill } from '../../components/admin/AdminUI.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Modal.jsx';
import { Input, Textarea, Toggle } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { slugify, formatDate } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const EMPTY = { name: '', slug: '', description: '', image: { url: '' }, isActive: true, isFeatured: false, sortOrder: 0 };

export default function AdminCollections() {
  useDocumentTitle('Collections', 'Curate the storefront collections.');
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi
      .collections()
      .then((res) => setRows(res.data || []))
      .catch((err) => toast(apiErrorMessage(err, 'Could not load collections'), 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async () => {
    if (!form.name.trim()) return toast('Collection name is required', 'error');
    setBusy(true);
    try {
      await adminApi.saveCollection({ ...form, slug: form.slug || slugify(form.name) }, editing === 'new' ? null : editing._id);
      toast(editing === 'new' ? 'Collection created' : 'Collection updated');
      setEditing(null);
      load();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not save this collection'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await adminApi.deleteCollection(deleting._id);
      toast('Collection deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Collections"
        subtitle="Editorial groupings that appear on the homepage and collections page"
        breadcrumb="Catalogue"
        actions={<Button size="sm" icon={Plus} onClick={() => { setForm({ ...EMPTY, sortOrder: rows.length }); setEditing('new'); }}>Add Collection</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Collections" value={rows.length} icon={BookOpen} loading={loading} />
        <StatCard label="Live" value={rows.filter((r) => r.isActive).length} icon={Layers} tone="green" loading={loading} />
        <StatCard label="Featured" value={rows.filter((r) => r.isFeatured).length} icon={Layers} tone="amber" loading={loading} />
      </div>

      <Panel padded={false}>
        <div className="p-3">
          <DataTable
            loading={loading}
            rows={rows}
            columns={[
              {
                key: 'name',
                header: 'Collection',
                render: (r) => (
                  <div className="flex items-center gap-2.5">
                    {r.image?.url ? (
                      <img src={r.image.url} alt="" className="h-10 w-14 rounded object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-10 w-14 items-center justify-center rounded bg-[var(--surface-sunken)] text-[var(--ink-muted)]">
                        <BookOpen size={13} />
                      </span>
                    )}
                    <div>
                      <p className="font-medium text-[var(--ink)]">{r.name}</p>
                      <p className="line-clamp-1 max-w-[240px] text-[10.5px] text-[var(--ink-muted)]">/{r.slug}</p>
                    </div>
                  </div>
                ),
              },
              { key: 'productCount', header: 'Products', align: 'right', render: (r) => r.productCount || 0 },
              { key: 'isFeatured', header: 'Featured', render: (r) => (r.isFeatured ? <StatusPill tone="accent">Featured</StatusPill> : <span className="text-[11px] text-[var(--ink-muted)]">—</span>) },
              { key: 'isActive', header: 'Status', render: (r) => <StatusPill tone={r.isActive ? 'green' : 'neutral'}>{r.isActive ? 'Active' : 'Hidden'}</StatusPill> },
              { key: 'createdAt', header: 'Created', render: (r) => <span className="text-[11px] text-[var(--ink-muted)]">{formatDate(r.createdAt)}</span> },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (r) => (
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setForm({ ...EMPTY, ...r, image: { url: r.image?.url || '' } }); setEditing(r); }} className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]" title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleting(r)} className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ),
              },
            ]}
            empty="No collections yet"
          />
        </div>
      </Panel>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'New collection' : 'Edit collection'} size="md">
        <div className="space-y-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} />
          <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Cover image URL" value={form.image?.url || ''} onChange={(e) => setForm({ ...form, image: { url: e.target.value } })} placeholder="/media/banners/example.jpg" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Sort order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            <div className="space-y-2 pt-5">
              <Toggle label="Show in storefront" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
              <Toggle label="Feature on homepage" checked={form.isFeatured} onChange={(v) => setForm({ ...form, isFeatured: v })} />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={save} loading={busy}>Save collection</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title={`Delete ${deleting?.name}?`}
        message="Products stay in the catalogue — they are simply unlinked from this collection."
        confirmLabel="Delete collection"
      />
    </div>
  );
}
