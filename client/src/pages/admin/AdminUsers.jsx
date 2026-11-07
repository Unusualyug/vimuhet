import { useEffect, useState } from 'react';
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { DataTable, Panel, StatCard, StatusPill } from '../../components/admin/AdminUI.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Modal.jsx';
import { Input, PasswordInput, Select, Toggle } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { formatDate, formatDateTime, initials } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin — full access' },
  { value: 'ADMIN', label: 'Admin — everything except admin management' },
  { value: 'MANAGER', label: 'Manager — catalogue, orders, customers' },
  { value: 'SUPPORT', label: 'Support — orders and reviews only' },
];

const ROLE_PERMS = {
  SUPER_ADMIN: ['All 19 permissions'],
  ADMIN: ['All except admins:manage'],
  MANAGER: ['Catalogue, orders, customers, coupons, CMS, reports'],
  SUPPORT: ['Dashboard, products (read), orders, customers (read), reviews'],
};

const empty = () => ({ name: '', email: '', password: '', role: 'ADMIN', isActive: true });

export default function AdminUsers() {
  useDocumentTitle('Admin Users', 'Manage the team and their access.');
  const { toast } = useToast();
  const { admin: me, can } = useAdminAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty());
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi
      .admins()
      .then((res) => setRows(res.data || []))
      .catch((err) => toast(apiErrorMessage(err, 'Could not load admin users'), 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) return toast('Name and email are required', 'error');
    if (editing === 'new' && (form.password || '').length < 8) return toast('Password must be at least 8 characters', 'error');
    setBusy(true);
    try {
      await adminApi.saveAdmin(
        {
          name: form.name,
          email: form.email,
          role: form.role,
          isActive: form.isActive,
          ...(form.password ? { password: form.password } : {}),
        },
        editing === 'new' ? null : editing._id
      );
      toast(editing === 'new' ? 'Admin created' : 'Admin updated');
      setEditing(null);
      load();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not save this admin'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await adminApi.deleteAdmin(deleting._id);
      toast('Admin removed');
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
        title="Admin Users"
        subtitle="Role-based access for the Vimuhet team"
        breadcrumb="Administration"
        actions={can('admins:manage') ? <Button size="sm" icon={Plus} onClick={() => { setForm(empty()); setEditing('new'); }}>Add Admin</Button> : null}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Team Members" value={rows.length} icon={UserCog} loading={loading} />
        <StatCard label="Super Admins" value={rows.filter((r) => r.role === 'SUPER_ADMIN').length} icon={ShieldCheck} tone="green" loading={loading} />
        <StatCard label="Active" value={rows.filter((r) => r.isActive).length} icon={KeyRound} tone="blue" loading={loading} />
      </div>

      <Panel padded={false}>
        <div className="p-3">
          <DataTable
            loading={loading}
            rows={rows}
            empty="No admin users found"
            columns={[
              {
                key: 'name',
                header: 'Admin',
                render: (r) => (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold text-white dark:text-[#1a1113]">{initials(r.name)}</span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--ink)]">
                        {r.name}
                        {String(r._id) === String(me?._id) && <span className="ml-1.5 text-[9.5px] uppercase tracking-[0.08em] text-[var(--accent)]">You</span>}
                      </p>
                      <p className="truncate text-[10.5px] text-[var(--ink-muted)]">{r.email}</p>
                    </div>
                  </div>
                ),
              },
              { key: 'role', header: 'Role', render: (r) => <StatusPill tone={r.role === 'SUPER_ADMIN' ? 'accent' : 'neutral'}>{r.role.replace('_', ' ')}</StatusPill> },
              { key: 'permissions', header: 'Permissions', render: (r) => <span className="text-[11px] text-[var(--ink-muted)]">{r.permissions?.length || 0} granted</span> },
              { key: 'lastLogin', header: 'Last sign-in', render: (r) => <span className="text-[11px] text-[var(--ink-muted)]">{r.lastLoginAt ? formatDateTime(r.lastLoginAt) : '—'}</span> },
              { key: 'createdAt', header: 'Added', render: (r) => <span className="text-[11px] text-[var(--ink-muted)]">{formatDate(r.createdAt)}</span> },
              { key: 'status', header: 'Status', render: (r) => <StatusPill tone={r.isActive ? 'green' : 'red'}>{r.isActive ? 'Active' : 'Disabled'}</StatusPill> },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (r) => (
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        setForm({ ...r, password: '' });
                        setEditing(r);
                      }}
                      className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    {String(r._id) !== String(me?._id) && (
                      <button onClick={() => setDeleting(r)} className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40" title="Remove">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </Panel>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ROLES.map((r) => (
          <Panel key={r.value} title={r.label.split(' — ')[0]} subtitle={r.label.split(' — ')[1]}>
            <ul className="space-y-1 text-[11px] text-[var(--ink-muted)]">
              <li>• {ROLE_PERMS[r.value][0]}</li>
              <li>• Permissions are recalculated whenever the role changes</li>
            </ul>
          </Panel>
        ))}
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add admin user' : `Edit ${form.name}`} size="md">
        <div className="space-y-4">
          <Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Work email" type="email" required disabled={editing !== 'new'} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select label="Role" options={ROLES} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          <PasswordInput
            label={editing === 'new' ? 'Password' : 'New password (optional)'}
            value={form.password || ''}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={editing === 'new' ? 'At least 8 characters' : 'Leave blank to keep current'}
          />
          <Toggle label="Account active" description="Disabled admins cannot sign in" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={save} loading={busy}>Save admin</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title={`Remove ${deleting?.name}?`}
        message="They will lose access to the admin console immediately. Their audit history is retained."
        confirmLabel="Remove admin"
      />
    </div>
  );
}
