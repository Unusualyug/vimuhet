import { useEffect, useState } from 'react';
import { Mail, MessageSquare, Reply } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { Panel, StatCard, StatusPill } from '../../components/admin/AdminUI.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Textarea, Select } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/UIContext.jsx';
import api from '../../services/api.js';
import { formatDateTime, initials } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function AdminMessages() {
  useDocumentTitle('Messages', 'Customer enquiries from the contact form.');
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('NEW');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi
      .contacts()
      .then((res) => setRows(res.data || []))
      .catch((err) => toast(apiErrorMessage(err, 'Could not load messages'), 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async () => {
    setBusy(true);
    try {
      await api.patch(`/admin/contacts/${active._id}`, { status, adminReply: reply });
      toast('Message updated');
      setActive(null);
      load();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not update this message'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const open = (row) => {
    setActive(row);
    setReply(row.adminReply || '');
    setStatus(row.status);
  };

  const newCount = rows.filter((r) => r.status === 'NEW').length;

  return (
    <div>
      <AdminPageHeader title="Messages" subtitle="Enquiries received through the contact form" breadcrumb="Customers" />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Messages" value={rows.length} icon={MessageSquare} loading={loading} />
        <StatCard label="Unread" value={newCount} icon={Mail} tone="amber" loading={loading} />
        <StatCard label="Resolved" value={rows.filter((r) => r.status === 'RESOLVED').length} icon={Reply} tone="green" loading={loading} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--surface-sunken)]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Panel>
          <p className="py-10 text-center text-[12.5px] text-[var(--ink-muted)]">No messages yet. The contact form on the storefront writes here.</p>
        </Panel>
      ) : (
        <div className="space-y-2">
          {rows.map((m) => (
            <button key={m._id} onClick={() => open(m)} className="w-full rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-3 text-left transition hover:border-[var(--accent)]/50">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[10px] font-semibold text-[var(--accent)]">{initials(m.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-[var(--ink)]">{m.name} · <span className="font-normal text-[var(--ink-muted)]">{m.subject}</span></p>
                  <p className="truncate text-[10.5px] text-[var(--ink-muted)]">{m.email} · {formatDateTime(m.createdAt)}</p>
                </div>
                <StatusPill tone={m.status === 'NEW' ? 'amber' : m.status === 'IN_PROGRESS' ? 'blue' : 'green'}>{m.status.replace('_', ' ')}</StatusPill>
              </div>
              <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">{m.message}</p>
            </button>
          ))}
        </div>
      )}

      <Modal open={Boolean(active)} onClose={() => setActive(null)} title={active ? `${active.name} — ${active.subject}` : ''} size="md">
        {active && (
          <div className="space-y-4">
            <div className="rounded-lg bg-[var(--surface-sunken)] p-3 text-[11.5px] text-[var(--ink-muted)]">
              <p><strong className="text-[var(--ink)]">{active.email}</strong>{active.mobile ? ` · ${active.mobile}` : ''}</p>
              <p className="mt-1">{formatDateTime(active.createdAt)}</p>
            </div>
            <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-[var(--ink)]">{active.message}</p>
            <Select label="Status" options={[{ value: 'NEW', label: 'New' }, { value: 'IN_PROGRESS', label: 'In progress' }, { value: 'RESOLVED', label: 'Resolved' }]} value={status} onChange={(e) => setStatus(e.target.value)} />
            <Textarea label="Internal reply / notes" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Record what you replied so the team stays aligned" />
            <div className="flex gap-2">
              <Button href={`mailto:${active.email}?subject=Re: ${encodeURIComponent(active.subject)}`} variant="outline" size="sm" icon={Mail} className="flex-1">
                Reply by email
              </Button>
              <Button onClick={save} loading={busy} size="sm" className="flex-1">Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
