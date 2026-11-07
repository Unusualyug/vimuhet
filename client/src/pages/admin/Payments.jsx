import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, CreditCard, RotateCcw, ShieldCheck } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { DataTable, ExportButton, FilterSelect, Panel, SearchInput, StatCard, StatusPill, TablePagination, paymentTone } from '../../components/admin/AdminUI.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { inr, formatDateTime } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function AdminPayments() {
  useDocumentTitle('Payments', 'Every Razorpay transaction and refund.');
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    adminApi
      .payments({ q, status: status || 'ALL', page, limit: 15 })
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta || {});
      })
      .catch((err) => toast(apiErrorMessage(err, 'Could not load payments'), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [q, status, page]);

  const stats = meta.stats || {};

  return (
    <div>
      <AdminPageHeader
        title="Payments"
        subtitle="Razorpay transactions, verification state and refunds"
        breadcrumb="Sales"
        actions={
          <ExportButton
            filename="vimuhet-payments.csv"
            rows={rows.map((r) => ({
              order: r.orderNumber,
              amount: r.amount,
              status: r.status,
              method: r.method,
              paymentId: r.razorpayPaymentId,
              date: formatDateTime(r.createdAt),
            }))}
          />
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected" value={inr(stats.collected || 0)} icon={CheckCircle2} tone="green" loading={loading && !stats.collected} />
        <StatCard label="Pending" value={inr(stats.pending || 0)} icon={AlertTriangle} tone="amber" loading={loading && !stats.collected} />
        <StatCard label="Failed Attempts" value={stats.failed || 0} icon={AlertTriangle} tone="red" loading={loading && !stats.collected} />
        <StatCard label="Refunded" value={inr(stats.refunded || 0)} icon={RotateCcw} tone="blue" loading={loading && !stats.collected} />
      </div>

      <Panel padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line-color)] p-3">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Order number or payment ID…" className="min-w-[220px] flex-1 sm:max-w-sm" />
          <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} placeholder="Any status" options={[{ value: 'PAID', label: 'Paid' }, { value: 'PENDING', label: 'Pending' }, { value: 'FAILED', label: 'Failed' }, { value: 'REFUNDED', label: 'Refunded' }, { value: 'PARTIALLY_REFUNDED', label: 'Partially refunded' }]} />
          <span className="ml-auto hidden items-center gap-1 text-[10.5px] text-[var(--ink-muted)] sm:flex">
            <ShieldCheck size={11} /> Signature verified server-side
          </span>
        </div>
        <div className="p-3">
          <DataTable
            loading={loading}
            rows={rows}
            onRowClick={(r) => navigate(`/admin/payments/${r._id}`)}
            empty="No payments match these filters"
            footer={<TablePagination page={meta.page || 1} totalPages={meta.totalPages || 1} total={meta.total} onChange={setPage} />}
            columns={[
              {
                key: 'razorpayPaymentId',
                header: 'Payment',
                render: (r) => (
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[11px] text-[var(--ink)]">{r.razorpayPaymentId || r.razorpayOrderId || '—'}</p>
                    <p className="text-[10px] text-[var(--ink-muted)]">{formatDateTime(r.createdAt)}</p>
                  </div>
                ),
              },
              { key: 'orderNumber', header: 'Order', render: (r) => (r.orderNumber ? <span className="font-medium text-[var(--accent)]">#{r.orderNumber}</span> : '—') },
              { key: 'user', header: 'Customer', render: (r) => <span className="text-[11.5px]">{r.user?.fullName || 'Guest'}</span> },
              { key: 'method', header: 'Method', render: (r) => <StatusPill tone="neutral">{r.method || 'Razorpay'}</StatusPill> },
              { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="font-semibold">{inr(r.amount)}</span> },
              { key: 'status', header: 'Status', render: (r) => <StatusPill tone={paymentTone(r.status)}>{r.status}</StatusPill> },
              { key: 'verified', header: 'Verified', render: (r) => (r.signatureVerified ? <CheckCircle2 size={13} className="text-[#2F7A4D] dark:text-emerald-400" /> : <span className="text-[10.5px] text-[var(--ink-muted)]">—</span>) },
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}
