import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ban, CheckCircle2, Mail, UserCheck, Users } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { DataTable, ExportButton, FilterSelect, Panel, SearchInput, StatCard, StatusPill, TablePagination } from '../../components/admin/AdminUI.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { inr, formatDate, initials } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function AdminCustomers() {
  useDocumentTitle('Customers', 'Your customer directory.');
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [blocked, setBlocked] = useState('');
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    adminApi
      .customers({ q, blocked, page, limit: 15 })
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta || {});
      })
      .catch((err) => toast(apiErrorMessage(err, 'Could not load customers'), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [q, blocked, page]);

  const toggle = async (row) => {
    try {
      const res = await adminApi.toggleCustomer(row._id);
      toast(res.data.isBlocked ? 'Customer blocked' : 'Customer unblocked');
      load();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    }
  };

  const buyers = rows.filter((r) => (r.stats?.orders || 0) > 0).length;

  return (
    <div>
      <AdminPageHeader
        title="Customers"
        subtitle="Lifetime value, order history and account state"
        breadcrumb="Customers"
        actions={
          <ExportButton
            filename="vimuhet-customers.csv"
            rows={rows.map((r) => ({ name: r.fullName, email: r.email, mobile: r.mobile, orders: r.stats?.orders || 0, spent: r.stats?.spent || 0, joined: formatDate(r.createdAt) }))}
          />
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Customers" value={meta.total ?? '—'} icon={Users} loading={loading && meta.total == null} />
        <StatCard label="Buyers On This Page" value={buyers} icon={UserCheck} tone="green" loading={loading && meta.total == null} />
        <StatCard label="Blocked" value={rows.filter((r) => r.isBlocked).length} icon={Ban} tone="red" loading={loading && meta.total == null} />
      </div>

      <Panel padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line-color)] p-3">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Name, email or mobile…" className="min-w-[220px] flex-1 sm:max-w-sm" />
          <FilterSelect value={blocked} onChange={(v) => { setBlocked(v); setPage(1); }} placeholder="All accounts" options={[{ value: 'false', label: 'Active' }, { value: 'true', label: 'Blocked' }]} />
        </div>
        <div className="p-3">
          <DataTable
            loading={loading}
            rows={rows}
            onRowClick={(r) => navigate(`/admin/customers/${r._id}`)}
            empty="No customers match these filters"
            footer={<TablePagination page={meta.page || 1} totalPages={meta.totalPages || 1} total={meta.total} onChange={setPage} />}
            columns={[
              {
                key: 'fullName',
                header: 'Customer',
                render: (r) => (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[10px] font-semibold text-[var(--accent)]">{initials(r.fullName)}</span>
                    <div className="min-w-0">
                      <Link to={`/admin/customers/${r._id}`} onClick={(e) => e.stopPropagation()} className="truncate font-medium text-[var(--ink)] hover:text-[var(--accent)]">
                        {r.fullName}
                      </Link>
                      <p className="truncate text-[10.5px] text-[var(--ink-muted)]">{r.email}</p>
                    </div>
                  </div>
                ),
              },
              { key: 'mobile', header: 'Mobile', render: (r) => <span className="text-[11.5px] text-[var(--ink-muted)]">{r.mobile || '—'}</span> },
              { key: 'orders', header: 'Orders', align: 'right', render: (r) => <span className="font-medium">{r.stats?.orders || 0}</span> },
              { key: 'spent', header: 'Lifetime Value', align: 'right', render: (r) => <span className="font-semibold">{inr(r.stats?.spent || 0)}</span> },
              { key: 'verified', header: 'Email', render: (r) => (r.isEmailVerified ? <CheckCircle2 size={13} className="text-[#2F7A4D] dark:text-emerald-400" /> : <Mail size={13} className="text-[var(--ink-muted)]" />) },
              { key: 'joined', header: 'Joined', render: (r) => <span className="text-[11px] text-[var(--ink-muted)]">{formatDate(r.createdAt)}</span> },
              { key: 'status', header: 'Status', render: (r) => <StatusPill tone={r.isBlocked ? 'red' : 'green'}>{r.isBlocked ? 'Blocked' : 'Active'}</StatusPill> },
              {
                key: 'action',
                header: '',
                align: 'right',
                render: (r) => (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(r);
                    }}
                    className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${r.isBlocked ? 'text-[#2F7A4D] hover:bg-[#2F7A4D]/10' : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'}`}
                  >
                    {r.isBlocked ? 'Unblock' : 'Block'}
                  </button>
                ),
              },
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}
