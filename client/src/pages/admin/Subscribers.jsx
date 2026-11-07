import { useEffect, useState } from 'react';
import { Mail, UserPlus, Users } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { DataTable, ExportButton, Panel, SearchInput, StatCard, StatusPill, TablePagination } from '../../components/admin/AdminUI.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { formatDateTime } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function AdminSubscribers() {
  useDocumentTitle('Subscribers', 'Newsletter audience.');
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    adminApi
      .subscribers({ page, limit: 20 })
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta || {});
      })
      .catch((err) => toast(apiErrorMessage(err, 'Could not load subscribers'), 'error'))
      .finally(() => setLoading(false));
  }, [page]);

  const filtered = q ? rows.filter((r) => r.email.includes(q.toLowerCase())) : rows;

  return (
    <div>
      <AdminPageHeader
        title="Subscribers"
        subtitle="Everyone who opted into the Vimuhet newsletter"
        breadcrumb="Customers"
        actions={<ExportButton filename="subscribers.csv" rows={filtered.map((r) => ({ email: r.email, source: r.source, subscribed: formatDateTime(r.createdAt) }))} label="Export emails" />}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Subscribers" value={meta.total ?? rows.length} icon={Users} loading={loading && meta.total == null} />
        <StatCard label="Active" value={rows.filter((r) => r.isActive).length} icon={Mail} tone="green" loading={loading && meta.total == null} />
        <StatCard label="Newest Source" value={rows[0]?.source || '—'} icon={UserPlus} tone="blue" loading={loading && meta.total == null} />
      </div>

      <Panel padded={false}>
        <div className="border-b border-[var(--line-color)] p-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search email…" className="max-w-xs" />
        </div>
        <div className="p-3">
          <DataTable
            loading={loading}
            rows={filtered}
            empty="No subscribers yet"
            footer={<TablePagination page={meta.page || 1} totalPages={meta.totalPages || 1} total={meta.total} onChange={setPage} />}
            columns={[
              { key: 'email', header: 'Email', render: (r) => <span className="font-medium text-[var(--ink)]">{r.email}</span> },
              { key: 'source', header: 'Source', render: (r) => <StatusPill tone="neutral">{r.source || 'footer'}</StatusPill> },
              { key: 'isActive', header: 'Status', render: (r) => <StatusPill tone={r.isActive ? 'green' : 'neutral'}>{r.isActive ? 'Subscribed' : 'Unsubscribed'}</StatusPill> },
              { key: 'createdAt', header: 'Subscribed', align: 'right', render: (r) => <span className="text-[11px] text-[var(--ink-muted)]">{formatDateTime(r.createdAt)}</span> },
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}
