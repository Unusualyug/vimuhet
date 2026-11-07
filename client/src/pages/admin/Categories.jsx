import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderTree, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { adminApi, catalogApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { DataTable, Panel, StatCard, StatusPill } from '../../components/admin/AdminUI.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Modal.jsx';
import { Input, Textarea, Toggle } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { slugify } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const EMPTY = { name: '', slug: '', description: '', image: { url: '' }, isActive: true, sortOrder: 0, metaTitle: '', metaDescription: '' };

export default function AdminCategories() {
  useDocumentTitle('Categories', 'Manage catalogue categories.');
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
      .categories()
      .then((res) => setRows(res.data || []))
      .catch((err) => toast(apiErrorMessage(err, 'Could not load categories'), 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew = () => {
    setForm({ ...EMPTY, sortOrder: rows.length });
    setEditing('new');
  };

  const save = async () => {
    if (!form.name.trim()) return toast('Category name is required', 'error');
    setBusy(true);
    try {
      await adminApi.saveCategory({ ...form, slug: form.slug || slugify(form.name) }, editing === 'new' ? null : editing._id);
      toast(editing === 'new' ? 'Category created' : 'Category updated');
      setEditing(null);
      load();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not save this category'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await adminApi.deleteCategory(deleting._id);
      toast('Category deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (row) => {
    try {
      await adminApi.saveCategory({ isActive: !row.isActive }, row._id);
      toast(row.isActive ? 'Category hidden' : 'Category published');
      load();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    }
  };

  const totalProducts = rows.reduce((s, r) => s + (r.productCount || 0), 0);

  return (
    <div>
      <AdminPageHeader
        title="Categories"
        subtitle="Group products into shoppable edits"
        breadcrumb="Catalogue"
        actions={<Button size="sm" icon={Plus} onClick={openNew}>Add Category</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Categories" value={rows.length} icon={FolderTree} loading={loading} />
        <StatCard label="Active" value={rows.filter((r) => r.isActive).length} icon={Tag} tone="green" loading={loading} />
        <StatCard label="Products Mapped" value={totalProducts} icon={Tag} tone="blue" loading={loading} />
      </div>

      <Panel padded={false}>
        <div className="p-3">
          <DataTable
            loading={loading}
            rows={rows}
            columns={[
              {
                key: 'name',
                header: 'Category',
                render: (r) => (
                  <div className="flex items-center gap-2.5">
                    {r.image?.url ? (
                      <img src={r.image.url} alt="" className="h-9 w-9 rounded object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded bg-[var(--surface-sunken)] text-[var(--ink-muted)]">
                        <Tag size={13} />
                      </span>
                    )}
                    <div>
                      <p className="font-medium text-[var(--ink)]">{r.name}</p>
                      <p className="text-[10.5px] text-[var(--ink-muted)]">/{r.slug}</p>
                    </div>
                  </div>
                ),
              },
              { key: 'productCount', header: 'Products', align: 'right', render: (r) => <Link to={`/admin/products?category=${r._id}`} className="font-medium text-[var(--accent)] hover:underline">{r.productCount || 0}</Link> },
              { key: 'sortOrder', header: 'Order', align: 'right', render: (r) => <span className="text-[var(--ink-muted)]">{r.sortOrder ?? 0}</span> },
              { key: 'isActive', header: 'Status', render: (r) => <StatusPill tone={r.isActive ? 'green' : 'neutral'}>{r.isActive ? 'Active' : 'Hidden'}</StatusPill> },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (r) => (
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => toggleActive(r)} className="rounded-md px-2 py-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]">
                      {r.isActive ? 'Hide' : 'Publish'}
                    </button>
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
            empty="No categories yet — create your first one"
          />
        </div>
      </Panel>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'New category' : 'Edit category'} size="md">
        <div className="space-y-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} />
          <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" />
          <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Image URL" value={form.image?.url || ''} onChange={(e) => setForm({ ...form, image: { url: e.target.value } })} placeholder="/media/categories/example.jpg" hint={<span className="text-[9px] uppercase">Optional</span>} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Sort order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            <div className="pt-6">
              <Toggle label="Visible in storefront" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={save} loading={busy}>Save category</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title={`Delete ${deleting?.name}?`}
        message="Categories can only be deleted once every product inside them has been moved or removed."
        confirmLabel="Delete category"
      />
    </div>
  );
}
