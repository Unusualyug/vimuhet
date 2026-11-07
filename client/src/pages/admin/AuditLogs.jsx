import { useEffect, useState } from 'react';
import { Activity, FileText, Filter, ShieldCheck } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { DataTable, ExportButton, FilterSelect, Panel, SearchInput, StatCard, StatusPill, TablePagination } from '../../components/admin/AdminUI.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { formatDateTime, initials } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const ACTIONS = [
  'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_DELETE', 'PRODUCT_DUPLICATE', 'PRODUCT_BULK_UPDATE', 'PRODUCT_BULK_DELETE',
  'CATEGORY_CREATE', 'CATEGORY_UPDATE', 'CATEGORY_DELETE',
  'COLLECTION_CREATE', 'COLLECTION_UPDATE', 'COLLECTION_DELETE',
  'STOCK_UPDATE', 'ORDER_STATUS', 'ORDER_CANCEL', 'PAYMENT_REFUND',
  'COUPON_CREATE', 'COUPON_UPDATE', 'COUPON_DELETE',
  'REVIEW_MODERATE', 'REVIEW_DELETE', 'HOMEPAGE_UPDATE', 'SETTINGS_UPDATE',
  'ADMIN_CREATE', 'ADMIN_UPDATE', 'ADMIN_DELETE',
];

const ENTITIES = ['Product', 'Category', 'Collection', 'Order', 'Payment', 'Coupon', 'Review', 'Homepage', 'Setting', 'Admin', 'Inventory'];

const tone = (action = '') => {
  if (action.includes('DELETE') || action.includes('CANCEL')) return 'red';
  if (action.includes('CREATE')) return 'green';
  if (action.includes('REFUND')) return 'amber';
  if (action.includes('UPDATE') || action.includes('MODERATE')) return 'blue';
  return 'neutral';
};

export default function AdminAuditLogs() {
  useDocumentTitle('Audit Logs', 'Every administrative action in the console.');
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');

  const load = () => {
    setLoading(true);
    adminApi
      .auditLogs({ action, entity, page, limit: 25 })
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta || {});
      })
      .catch((err) => toast(apiErrorMessage(err, 'Could not load audit logs'), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [action, entity, page]);

  const filtered = q ? rows.filter((r) => `${r.description} ${r.actorName} ${r.actorEmail}`.toLowerCase().includes(q.toLowerCase())) : rows;

  return (
    <div>
      <AdminPageHeader
        title="Audit Logs"
        subtitle="Immutable record of administrative activity"
        breadcrumb="Administration"
        actions={<ExportButton filename="audit-logs.csv" rows={filtered.map((r) => ({ at: formatDateTime(r.createdAt), actor: r.actorName || r.actorEmail, action: r.action, entity: r.entity, description: r.description }))} />}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Logged Actions" value={meta.total ?? '—'} icon={FileText} loading={loading && meta.total == null} />
        <StatCard label="On This Page" value={filtered.length} icon={Activity} tone="blue" loading={loading && meta.total == null} />
        <StatCard label="Retention" value="Permanent" icon={ShieldCheck} tone="green" hint="never auto-deleted" />
      </div>

      <Panel padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line-color)] p-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search description or admin…" className="min-w-[200px] flex-1 sm:max-w-xs" />
          <FilterSelect value={action} onChange={(v) => { setAction(v); setPage(1); }} placeholder="Any action" options={ACTIONS.map((a) => ({ value: a, label: a.replace(/_/g, ' ').toLowerCase() }))} />
          <FilterSelect value={entity} onChange={(v) => { setEntity(v); setPage(1); }} placeholder="Any entity" options={ENTITIES.map((e) => ({ value: e, label: e }))} />
          {(action || entity) && (
            <button onClick={() => { setAction(''); setEntity(''); }} className="flex items-center gap-1 text-[11px] text-[var(--ink-muted)] hover:text-[var(--accent)]">
              <Filter size={11} /> Clear
            </button>
          )}
        </div>
        <div className="p-3">
          <DataTable
            loading={loading}
            rows={filtered}
            empty="No audit entries for these filters"
            footer={<TablePagination page={meta.page || 1} totalPages={meta.totalPages || 1} total={meta.total} onChange={setPage} />}
            columns={[
              {
                key: 'createdAt',
                header: 'When',
                render: (r) => <span className="whitespace-nowrap text-[11px] text-[var(--ink-muted)]">{formatDateTime(r.createdAt)}</span>,
              },
              {
                key: 'actor',
                header: 'Actor',
                render: (r) => (
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-[8.5px] font-semibold text-[var(--ink-muted)]">
                      {initials(r.actorName || r.actorEmail || 'SYS')}
                    </span>
                    <span className="text-[11.5px] text-[var(--ink)]">{r.actorName || r.actorEmail || 'System'}</span>
                  </div>
                ),
              },
              { key: 'action', header: 'Action', render: (r) => <StatusPill tone={tone(r.action)}>{r.action.replace(/_/g, ' ')}</StatusPill> },
              { key: 'entity', header: 'Entity', render: (r) => <span className="text-[11.5px] text-[var(--ink-muted)]">{r.entity}</span> },
              { key: 'description', header: 'Details', render: (r) => <span className="line-clamp-1 max-w-[320px] text-[11.5px]">{r.description || '—'}</span> },
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}
