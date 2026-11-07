import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  Eye,
  IndianRupee,
  Package,
  Radio,
  ShoppingBag,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { Panel, RangePicker, StatCard, DataTable, StatusPill, orderTone } from '../../components/admin/AdminUI.jsx';
import { AreaChart, BarChart, DonutChart } from '../../components/admin/Charts.jsx';
import { Skeleton, ErrorState } from '../../components/ui/States.jsx';
import Button from '../../components/ui/Button.jsx';
import { inr, compactNumber, formatDateTime, timeAgo, initials, duration } from '../../utils/format.js';
import { ORDER_STATUS_LABELS } from '../../constants/index.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function AdminDashboard() {
  useDocumentTitle('Admin Dashboard', 'Vimuhet store performance overview.');
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    adminApi
      .dashboard({ range })
      .then((res) => setData(res.data))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load dashboard data')))
      .finally(() => setLoading(false));
  };

  useEffect(load, [range]);

  if (error && !data) return <ErrorState message={error} onRetry={load} />;

  const kpi = data?.kpis || {};
  const traffic = data?.traffic || {};

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        subtitle={data ? `${ORDER_STATUS_LABELS.CONFIRMED} orders, live traffic and stock at a glance` : 'Store performance overview'}
        breadcrumb="Overview"
        actions={
          <>
            <RangePicker value={range} onChange={setRange} />
            <Button size="sm" variant="outline" onClick={load} loading={loading}>
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={inr(kpi.revenue || 0)} change={kpi.revenueChange} icon={IndianRupee} hint="vs previous period" loading={loading && !data} />
        <StatCard label="Orders" value={compactNumber(kpi.orders || 0)} change={kpi.ordersChange} icon={ShoppingBag} hint="paid orders" loading={loading && !data} tone="green" />
        <StatCard label="Avg. Order Value" value={inr(kpi.aov || 0)} icon={BarChart3} hint="per paid order" loading={loading && !data} tone="blue" />
        <StatCard label="Customers" value={compactNumber(kpi.customers || 0)} icon={Users} hint={`${kpi.newCustomers || 0} new in range`} loading={loading && !data} tone="amber" />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Visitors" value={compactNumber(kpi.visitors || 0)} change={kpi.visitorsChange} icon={Eye} hint="unique sessions" loading={loading && !data} tone="blue" />
        <StatCard label="Conversion Rate" value={`${kpi.conversionRate || 0}%`} icon={ArrowUpRight} hint="purchases ÷ visitors" loading={loading && !data} tone="green" />
        <StatCard label="Pending Orders" value={compactNumber(kpi.pendingOrders || 0)} icon={Clock} hint="need processing" loading={loading && !data} tone="amber" />
        <StatCard label="Abandoned Carts" value={compactNumber(kpi.abandonedCarts || 0)} icon={ShoppingCart} hint={inr(kpi.abandonedValue || 0)} loading={loading && !data} tone="red" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Revenue Trend" subtitle="Paid orders in the selected range" action={<Link to="/admin/reports/sales" className="text-[11px] font-medium text-[var(--accent)] hover:underline">Full report</Link>}>
          {loading && !data ? <Skeleton className="h-[240px] w-full rounded-lg" /> : <AreaChart data={data?.revenueSeries || []} series={[{ key: 'revenue', label: 'Revenue', color: '#78152F' }]} kind="currency" height={250} />}
        </Panel>

        <Panel title="Live Now" subtitle="Visitors active in the last few minutes" action={<Link to="/admin/live-visitors" className="text-[11px] font-medium text-[var(--accent)] hover:underline">Details</Link>}>
          <div className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#2F7A4D]/12 text-[#2F7A4D] dark:text-emerald-400">
              <Radio size={18} />
              <span className="absolute inset-0 animate-ping rounded-full border border-[#2F7A4D]/40" />
            </span>
            <div>
              <p className="font-display text-[26px] leading-none text-[var(--ink)]">{traffic.live?.active ?? 0}</p>
              <p className="text-[11px] text-[var(--ink-muted)]">visitors on site right now</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {(traffic.live?.sessions || []).slice(0, 4).map((s) => (
              <li key={s.sessionId} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-sunken)] px-2.5 py-1.5 text-[11px]">
                <span className="truncate text-[var(--ink)]">{s.currentPath || '/'}</span>
                <span className="shrink-0 text-[var(--ink-muted)]">{duration(s.durationSec)} · {s.device || 'Desktop'}</span>
              </li>
            ))}
            {!traffic.live?.sessions?.length && <li className="text-[11.5px] text-[var(--ink-muted)]">Waiting for live sessions…</li>}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--line-color)] pt-3 text-[11px]">
            <div>
              <p className="text-[var(--ink-muted)]">Page views</p>
              <p className="font-medium text-[var(--ink)]">{compactNumber(traffic.pageViews || 0)}</p>
            </div>
            <div>
              <p className="text-[var(--ink-muted)]">Bounce rate</p>
              <p className="font-medium text-[var(--ink)]">{traffic.bounceRate || 0}%</p>
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Category Revenue" subtitle="Top performing categories">
          {loading && !data ? <Skeleton className="h-[180px] w-full rounded-lg" /> : <DonutChart data={(data?.categorySales || []).map((c) => ({ label: c.category, value: c.revenue }))} kind="currency" />}
        </Panel>

        <Panel title="Order Status" subtitle="Across all time">
          {loading && !data ? (
            <Skeleton className="h-[180px] w-full rounded-lg" />
          ) : (
            <BarChart
              horizontal
              data={(data?.statusDistribution || []).map((s) => ({ label: ORDER_STATUS_LABELS[s.status] || s.status, value: s.count }))}
              yKey="value"
              color="#B4485F"
            />
          )}
        </Panel>

        <Panel title="Top Products" subtitle="By revenue in range">
          {loading && !data ? (
            <Skeleton className="h-[180px] w-full rounded-lg" />
          ) : (data?.topProducts || []).length === 0 ? (
            <p className="py-6 text-center text-[12px] text-[var(--ink-muted)]">No sales in this range</p>
          ) : (
            <ul className="space-y-2.5">
              {data.topProducts.map((p) => (
                <li key={p._id} className="flex items-center gap-2.5">
                  <img src={p.image} alt="" className="h-9 w-7 rounded object-cover" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium text-[var(--ink)]">{p.name}</p>
                    <p className="text-[10px] text-[var(--ink-muted)]">{p.units} sold</p>
                  </div>
                  <span className="shrink-0 text-[11.5px] font-medium text-[var(--ink)]">{inr(p.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Recent Orders"
          subtitle="Latest activity"
          padded={false}
          action={<Link to="/admin/orders" className="flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:underline">All orders <ArrowRight size={11} /></Link>}
        >
          <div className="p-3">
            <DataTable
              dense
              loading={loading && !data}
              rows={data?.recentOrders || []}
              columns={[
                {
                  key: 'orderNumber',
                  header: 'Order',
                  render: (r) => (
                    <Link to={`/admin/orders/${r._id}`} className="font-medium text-[var(--accent)] hover:underline">
                      #{r.orderNumber}
                    </Link>
                  ),
                },
                { key: 'customer', header: 'Customer', render: (r) => <span className="text-[var(--ink)]">{r.customer?.fullName || '—'}</span> },
                { key: 'status', header: 'Status', render: (r) => <StatusPill tone={orderTone(r.status)}>{ORDER_STATUS_LABELS[r.status] || r.status}</StatusPill> },
                { key: 'createdAt', header: 'Placed', render: (r) => <span className="text-[11px] text-[var(--ink-muted)]">{timeAgo(r.createdAt)}</span> },
                { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="font-medium">{inr(r.pricing?.total)}</span> },
              ]}
            />
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel
            title="Low Stock Alerts"
            subtitle={`${kpi.lowStock || 0} low · ${kpi.outOfStock || 0} out of stock`}
            action={<Link to="/admin/inventory" className="text-[11px] font-medium text-[var(--accent)] hover:underline">Manage</Link>}
          >
            {(data?.lowStockProducts || []).length === 0 ? (
              <p className="py-4 text-center text-[12px] text-[var(--ink-muted)]">All products are comfortably stocked</p>
            ) : (
              <ul className="space-y-2">
                {data.lowStockProducts.map((p) => (
                  <li key={p._id} className="flex items-center gap-2.5 rounded-lg bg-[var(--surface-sunken)] px-2.5 py-2">
                    <AlertTriangle size={13} className={p.stock <= 0 ? 'text-red-600' : 'text-amber-600'} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-medium text-[var(--ink)]">{p.name}</p>
                      <p className="text-[10px] text-[var(--ink-muted)]">{p.sku}</p>
                    </div>
                    <span className={`shrink-0 text-[11px] font-semibold ${p.stock <= 0 ? 'text-red-600' : 'text-amber-600'}`}>{p.stock} left</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="New Customers" subtitle="Recently registered">
            <ul className="space-y-2">
              {(data?.recentCustomers || []).map((c) => (
                <li key={c._id} className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[9.5px] font-semibold text-[var(--accent)]">
                    {initials(c.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium text-[var(--ink)]">{c.fullName}</p>
                    <p className="truncate text-[10px] text-[var(--ink-muted)]">{c.email}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-[var(--ink-muted)]">{timeAgo(c.createdAt)}</span>
                </li>
              ))}
              {!(data?.recentCustomers || []).length && <p className="py-3 text-center text-[12px] text-[var(--ink-muted)]">No customers yet</p>}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Recent Activity" subtitle="Audit trail highlights">
          <ul className="space-y-2.5">
            {(data?.recentActivity || []).map((a) => (
              <li key={a._id} className="flex gap-2.5">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <div className="min-w-0">
                  <p className="text-[11.5px] text-[var(--ink)]">{a.description || a.action}</p>
                  <p className="text-[10px] text-[var(--ink-muted)]">
                    {a.actorEmail || a.actorName || 'System'} · {formatDateTime(a.createdAt)}
                  </p>
                </div>
              </li>
            ))}
            {!(data?.recentActivity || []).length && <p className="py-3 text-center text-[12px] text-[var(--ink-muted)]">No activity recorded yet</p>}
          </ul>
        </Panel>

        <Panel title="Quick Actions" subtitle="Common admin tasks">
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { to: '/admin/products/new', label: 'Add product', icon: Package },
              { to: '/admin/orders', label: 'Process orders', icon: ShoppingBag },
              { to: '/admin/coupons', label: 'Create coupon', icon: BarChart3 },
              { to: '/admin/inventory', label: 'Update stock', icon: Package },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="flex items-center gap-2 rounded-lg border border-[var(--line-color)] px-3 py-2.5 text-[12px] font-medium text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <a.icon size={14} /> {a.label}
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
