import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Download, Eye, IndianRupee, Package, ShoppingBag, Truck } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { DataTable, ExportButton, FilterSelect, Panel, SearchInput, StatCard, StatusPill, TablePagination, orderTone, paymentTone } from '../../components/admin/AdminUI.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { inr, formatDate, timeAgo } from '../../utils/format.js';
import { ORDER_STATUS_LABELS } from '../../constants/index.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const STATUS_FILTERS = [
  { value: '', label: 'All orders' },
  { value: 'PENDING', label: 'Placed' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURN_REQUESTED', label: 'Return requested' },
  { value: 'REFUNDED', label: 'Refunded' },
];

export default function AdminOrders() {
  useDocumentTitle('Orders', 'Process and track customer orders.');
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    adminApi
      .orders({ q, status: status || 'ALL', paymentStatus, page, limit: 15 })
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta || {});
      })
      .catch((err) => toast(apiErrorMessage(err, 'Could not load orders'), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [q, status, paymentStatus, page]);

  const counts = meta.statusCounts || {};
  const totalOrders = Object.values(counts).reduce((s, v) => s + v, 0);

  return (
    <div>
      <AdminPageHeader
        title="Orders"
        subtitle="Every order from payment confirmation to delivery"
        breadcrumb="Sales"
        actions={
          <ExportButton
            filename="vimuhet-orders.csv"
            rows={rows.map((r) => ({
              order: r.orderNumber,
              customer: r.customer?.fullName,
              email: r.customer?.email,
              status: r.status,
              payment: r.payment?.status,
              total: r.pricing?.total,
              placed: formatDate(r.createdAt),
            }))}
          />
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Orders" value={totalOrders} icon={ShoppingBag} loading={loading && !totalOrders} />
        <StatCard label="Awaiting Action" value={(counts.PENDING || 0) + (counts.CONFIRMED || 0) + (counts.PROCESSING || 0) + (counts.PACKED || 0)} icon={Clock} tone="amber" loading={loading && !totalOrders} />
        <StatCard label="Shipped" value={(counts.SHIPPED || 0) + (counts.OUT_FOR_DELIVERY || 0)} icon={Truck} tone="blue" loading={loading && !totalOrders} />
        <StatCard label="Delivered" value={counts.DELIVERED || 0} icon={Package} tone="green" loading={loading && !totalOrders} />
      </div>

      <div className="mb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.value}
            onClick={() => {
              setStatus(s.value);
              setPage(1);
            }}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] transition ${
              status === s.value ? 'border-[var(--accent)] bg-[var(--accent)] text-white dark:text-[#1a1113]' : 'border-[var(--line-color)] bg-[var(--surface-raised)] text-[var(--ink-muted)] hover:border-[var(--accent)]'
            }`}
          >
            {s.label}
            {s.value && counts[s.value] ? <span className="ml-1.5 opacity-70">{counts[s.value]}</span> : null}
          </button>
        ))}
      </div>

      <Panel padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line-color)] p-3">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Order number, name, email or mobile…" className="min-w-[220px] flex-1 sm:max-w-sm" />
          <FilterSelect value={paymentStatus} onChange={(v) => { setPaymentStatus(v); setPage(1); }} placeholder="Any payment" options={[{ value: 'PAID', label: 'Paid' }, { value: 'PENDING', label: 'Pending' }, { value: 'FAILED', label: 'Failed' }, { value: 'REFUNDED', label: 'Refunded' }]} />
        </div>
        <div className="p-3">
          <DataTable
            loading={loading}
            rows={rows}
            onRowClick={(r) => navigate(`/admin/orders/${r._id}`)}
            empty="No orders match these filters"
            footer={<TablePagination page={meta.page || 1} totalPages={meta.totalPages || 1} total={meta.total} onChange={setPage} />}
            columns={[
              {
                key: 'orderNumber',
                header: 'Order',
                render: (r) => (
                  <div>
                    <Link to={`/admin/orders/${r._id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-[var(--accent)] hover:underline">
                      #{r.orderNumber}
                    </Link>
                    <p className="text-[10px] text-[var(--ink-muted)]">{timeAgo(r.createdAt)}</p>
                  </div>
                ),
              },
              {
                key: 'customer',
                header: 'Customer',
                render: (r) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--ink)]">{r.customer?.fullName}</p>
                    <p className="truncate text-[10.5px] text-[var(--ink-muted)]">{r.customer?.email}</p>
                  </div>
                ),
              },
              { key: 'items', header: 'Items', align: 'right', render: (r) => <span className="text-[var(--ink-muted)]">{r.items?.length || 0}</span> },
              { key: 'status', header: 'Status', render: (r) => <StatusPill tone={orderTone(r.status)}>{ORDER_STATUS_LABELS[r.status] || r.status}</StatusPill> },
              { key: 'payment', header: 'Payment', render: (r) => <StatusPill tone={paymentTone(r.payment?.status)}>{r.payment?.status || '—'}</StatusPill> },
              { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="font-semibold">{inr(r.pricing?.total)}</span> },
              {
                key: 'view',
                header: '',
                align: 'right',
                render: (r) => (
                  <Link to={`/admin/orders/${r._id}`} onClick={(e) => e.stopPropagation()} className="inline-flex rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]" title="Open order">
                    <Eye size={13} />
                  </Link>
                ),
              },
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}
