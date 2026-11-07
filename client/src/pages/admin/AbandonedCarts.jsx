import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, IndianRupee, ShoppingCart } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { DataTable, ExportButton, Panel, StatCard, StatusPill } from '../../components/admin/AdminUI.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { inr, timeAgo } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function AdminAbandonedCarts() {
  useDocumentTitle('Abandoned Carts', 'Carts that did not convert.');
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .abandonedCarts()
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta || {});
      })
      .catch((err) => toast(apiErrorMessage(err, 'Could not load abandoned carts'), 'error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="Abandoned Carts"
        subtitle="Carts inactive for more than an hour"
        breadcrumb="Sales"
        actions={<ExportButton filename="abandoned-carts.csv" rows={rows.map((r) => ({ customer: r.user?.fullName || 'Guest', email: r.user?.email || '', items: r.items?.length, value: r.value }))} />}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Open Carts" value={meta.total ?? rows.length} icon={ShoppingCart} loading={loading} />
        <StatCard label="Recoverable Value" value={inr(meta.value || 0)} icon={IndianRupee} tone="amber" loading={loading} />
        <StatCard label="Recovered" value={meta.recovered ?? 0} icon={CheckCircle2} tone="green" loading={loading} />
      </div>

      <Panel padded={false}>
        <div className="p-3">
          <DataTable
            loading={loading}
            rows={rows}
            empty="No abandoned carts right now"
            columns={[
              {
                key: 'user',
                header: 'Customer',
                render: (r) =>
                  r.user ? (
                    <Link to={`/admin/customers/${r.user._id}`} className="font-medium text-[var(--ink)] hover:text-[var(--accent)]">
                      {r.user.fullName}
                      <span className="block text-[10px] font-normal text-[var(--ink-muted)]">{r.user.email}</span>
                    </Link>
                  ) : (
                    <span className="text-[11.5px] text-[var(--ink-muted)]">Guest session</span>
                  ),
              },
              { key: 'items', header: 'Items', align: 'right', render: (r) => r.items?.length || 0 },
              {
                key: 'preview',
                header: 'Contains',
                render: (r) => <span className="line-clamp-1 max-w-[280px] text-[11.5px] text-[var(--ink-muted)]">{(r.items || []).map((i) => i.name).join(', ')}</span>,
              },
              { key: 'value', header: 'Value', align: 'right', render: (r) => <span className="font-semibold">{inr(r.value)}</span> },
              { key: 'updatedAt', header: 'Last activity', align: 'right', render: (r) => <span className="flex items-center justify-end gap-1 text-[11px] text-[var(--ink-muted)]"><Clock size={10} /> {timeAgo(r.updatedAt)}</span> },
              { key: 'recovered', header: 'Status', render: (r) => <StatusPill tone={r.recovered ? 'green' : 'amber'}>{r.recovered ? 'Recovered' : 'Open'}</StatusPill> },
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}
