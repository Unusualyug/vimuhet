import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Boxes, IndianRupee, Package, ShoppingBag, TrendingUp, UserPlus, Users } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { DataTable, ExportButton, Panel, RangePicker, StatCard, StatusPill } from '../../components/admin/AdminUI.jsx';
import { AreaChart, BarChart, DonutChart, FunnelChart, PALETTE } from '../../components/admin/Charts.jsx';
import { Skeleton, ErrorState } from '../../components/ui/States.jsx';
import { inr, compactNumber, formatDate, initials } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const META = {
  sales: { title: 'Sales Report', subtitle: 'Revenue, discounts and order volume' },
  customers: { title: 'Customer Report', subtitle: 'Signups, buyers and lifetime value' },
  inventory: { title: 'Inventory Report', subtitle: 'Stock cover and product performance' },
  visitors: { title: 'Visitor Report', subtitle: 'Traffic, funnel and acquisition' },
};

export default function AdminReports({ type = 'sales' }) {
  useDocumentTitle(META[type]?.title || 'Reports', META[type]?.subtitle);
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupBy, setGroupBy] = useState('day');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        if (type === 'sales') {
          const [center, revenue] = await Promise.all([adminApi.reports.center({ range }), adminApi.reports.revenue({ range })]);
          setData({ center: center.data, revenue: revenue.data });
        } else if (type === 'customers') {
          const [customers, center] = await Promise.all([adminApi.reports.customers({ range }), adminApi.reports.center({ range })]);
          setData({ customers: customers.data, center: center.data });
        } else if (type === 'inventory') {
          const [products, center] = await Promise.all([adminApi.reports.products({ range }), adminApi.reports.center({ range })]);
          setData({ products: products.data, center: center.data });
        } else {
          const [overview, timeseries, sources, pages] = await Promise.all([
            adminApi.analytics('overview', { range }),
            adminApi.analytics('timeseries', { range }),
            adminApi.analytics('sources', { range }),
            adminApi.analytics('pages', { range }),
          ]);
          setData({ overview: overview.data, timeseries: timeseries.data, sources: sources.data, pages: pages.data });
        }
      } catch (err) {
        if (alive) setError(apiErrorMessage(err, 'Could not load this report'));
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [type, range]);

  if (error && !data) return <ErrorState message={error} onRetry={() => setRange((r) => r)} />;

  const rangePicker = <RangePicker value={range} onChange={setRange} />;

  return (
    <div>
      <AdminPageHeader title={META[type].title} subtitle={META[type].subtitle} breadcrumb={META[type].title} actions={rangePicker} />

      {type === 'sales' && <SalesReport data={data} loading={loading} groupBy={groupBy} setGroupBy={setGroupBy} />}
      {type === 'customers' && <CustomerReport data={data} loading={loading} />}
      {type === 'inventory' && <InventoryReport data={data} loading={loading} />}
      {type === 'visitors' && <VisitorReport data={data} loading={loading} />}
    </div>
  );
}

function SalesReport({ data, loading, groupBy, setGroupBy }) {
  const center = data?.center || {};
  const s = center.sales || {};
  const rows = data?.revenue || [];
  const conversion = s.orders ? Math.round((s.paidOrders / s.orders) * 1000) / 10 : 0;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={inr(s.revenue || 0)} icon={IndianRupee} loading={loading && !data} />
        <StatCard label="Orders" value={compactNumber(s.orders || 0)} icon={ShoppingBag} tone="green" hint={`${s.paidOrders || 0} paid`} loading={loading && !data} />
        <StatCard label="Discounts Given" value={inr(s.discounts || 0)} icon={TrendingUp} tone="amber" loading={loading && !data} />
        <StatCard label="Paid Conversion" value={`${conversion}%`} icon={ArrowUpRight} tone="blue" loading={loading && !data} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Revenue Trend"
          subtitle="Paid orders grouped by day"
          action={
            <div className="flex gap-1">
              {['day', 'week', 'month'].map((g) => (
                <button key={g} onClick={() => setGroupBy(g)} className={`rounded px-2 py-1 text-[10.5px] uppercase tracking-[0.08em] ${groupBy === g ? 'bg-[var(--accent)] text-white dark:text-[#1a1113]' : 'text-[var(--ink-muted)]'}`}>
                  {g}
                </button>
              ))}
            </div>
          }
        >
          {loading && !data ? (
            <Skeleton className="h-[250px] w-full rounded-lg" />
          ) : (
            <AreaChart data={rows} series={[{ key: 'revenue', label: 'Revenue', color: PALETTE[0] }]} kind="currency" height={260} />
          )}
        </Panel>
        <Panel title="Revenue Split" subtitle="How the total is composed">
          <div className="space-y-3">
            {[
              ['Product revenue', s.revenue || 0, PALETTE[0]],
              ['Discounts', s.discounts || 0, PALETTE[3]],
              ['Shipping collected', s.shipping || 0, PALETTE[4]],
              ['GST component', s.tax || 0, PALETTE[5]],
            ].map(([label, value, color]) => (
              <div key={label}>
                <div className="flex justify-between text-[11.5px]">
                  <span className="text-[var(--ink-muted)]">{label}</span>
                  <span className="font-medium text-[var(--ink)]">{inr(value)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (value / Math.max(1, s.revenue || 1)) * 100)}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Daily Breakdown" subtitle="Revenue, orders, discounts and shipping" padded={false}>
          <div className="p-3">
            <DataTable
              loading={loading}
              rows={rows}
              rowKey="label"
              dense
              empty="No paid orders in this range"
              columns={[
                { key: 'label', header: 'Period', render: (r) => <span className="font-mono text-[11.5px]">{r.label}</span> },
                { key: 'orders', header: 'Orders', align: 'right' },
                { key: 'revenue', header: 'Revenue', align: 'right', render: (r) => <span className="font-semibold">{inr(r.revenue)}</span> },
                { key: 'discount', header: 'Discounts', align: 'right', render: (r) => <span className="text-[var(--ink-muted)]">{inr(r.discount)}</span> },
                { key: 'shipping', header: 'Shipping', align: 'right', render: (r) => <span className="text-[var(--ink-muted)]">{inr(r.shipping)}</span> },
              ]}
            />
          </div>
        </Panel>
      </div>
    </>
  );
}

function CustomerReport({ data, loading }) {
  const c = data?.customers || {};
  const totals = c.totals || {};
  const signups = c.rows || [];

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Customers" value={compactNumber(totals.total || 0)} icon={Users} loading={loading && !data} />
        <StatCard label="Buyers" value={compactNumber(totals.buyers || 0)} icon={ShoppingBag} tone="green" loading={loading && !data} />
        <StatCard label="New This Range" value={compactNumber(data?.center?.newCustomers || 0)} icon={UserPlus} tone="blue" loading={loading && !data} />
        <StatCard label="Lifetime Revenue" value={inr(totals.revenue || 0)} icon={IndianRupee} tone="amber" loading={loading && !data} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Signup Trend" subtitle="New accounts per day">
          {loading && !data ? <Skeleton className="h-[220px] w-full rounded-lg" /> : <BarChart data={signups} yKey="signups" color={PALETTE[1]} height={230} />}
        </Panel>
        <Panel title="Buyer Split" subtitle="Customers with at least one order">
          {loading && !data ? (
            <Skeleton className="h-[180px] w-full rounded-lg" />
          ) : (
            <DonutChart
              data={[
                { label: 'Buyers', value: totals.buyers || 0 },
                { label: 'Browsers', value: Math.max(0, (totals.total || 0) - (totals.buyers || 0)) },
              ]}
              centerLabel={`${totals.total ? Math.round(((totals.buyers || 0) / totals.total) * 100) : 0}% bought`}
            />
          )}
        </Panel>
      </div>

      <div className="mt-4">
        <Panel
          title="Top Customers"
          subtitle="By lifetime spend"
          padded={false}
          action={<ExportButton filename="top-customers.csv" rows={(c.topCustomers || []).map((x) => ({ name: x.fullName, email: x.email, orders: x.stats?.orders, spent: x.stats?.spent }))} />}
        >
          <div className="p-3">
            <DataTable
              loading={loading}
              rows={c.topCustomers || []}
              empty="No customers yet"
              columns={[
                {
                  key: 'fullName',
                  header: 'Customer',
                  render: (r) => (
                    <Link to={`/admin/customers/${r._id}`} className="flex items-center gap-2 hover:text-[var(--accent)]">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[9.5px] font-semibold text-[var(--accent)]">{initials(r.fullName)}</span>
                      <span>
                        <span className="block font-medium">{r.fullName}</span>
                        <span className="block text-[10px] text-[var(--ink-muted)]">{r.email}</span>
                      </span>
                    </Link>
                  ),
                },
                { key: 'orders', header: 'Orders', align: 'right', render: (r) => r.stats?.orders || 0 },
                { key: 'spent', header: 'Lifetime Value', align: 'right', render: (r) => <span className="font-semibold">{inr(r.stats?.spent || 0)}</span> },
                { key: 'joined', header: 'Joined', render: (r) => <span className="text-[11px] text-[var(--ink-muted)]">{formatDate(r.createdAt)}</span> },
              ]}
            />
          </div>
        </Panel>
      </div>
    </>
  );
}

function InventoryReport({ data, loading }) {
  const p = data?.products || {};
  const rows = p.rows || [];
  const inventory = p.inventory || [];
  const stockValue = (data?.center?.inventory?.value || 0);

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Units In Stock" value={compactNumber(data?.center?.inventory?.stock || 0)} icon={Boxes} loading={loading && !data} />
        <StatCard label="Stock Value" value={inr(stockValue)} icon={IndianRupee} tone="blue" loading={loading && !data} />
        <StatCard label="Products Sold" value={rows.length} icon={ShoppingBag} tone="green" loading={loading && !data} />
        <StatCard label="Active Products" value={data?.center?.activeProducts ?? '—'} icon={Package} tone="amber" loading={loading && !data} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Best Performing Products" subtitle="Revenue in range">
          {loading && !data ? <Skeleton className="h-[240px] w-full rounded-lg" /> : <BarChart horizontal data={rows.slice(0, 8).map((r) => ({ label: r.name, value: r.revenue }))} yKey="value" kind="currency" color={PALETTE[0]} />}
        </Panel>
        <Panel title="Lowest Stock" subtitle="Needs replenishment first">
          {loading && !data ? (
            <Skeleton className="h-[240px] w-full rounded-lg" />
          ) : (
            <ul className="space-y-2">
              {inventory.slice(0, 8).map((item) => (
                <li key={item._id} className="flex items-center gap-2.5">
                  {item.images?.[0]?.url ? <img src={item.images[0].url} alt="" className="h-8 w-6 rounded object-cover" loading="lazy" /> : <span className="h-8 w-6 rounded bg-[var(--surface-sunken)]" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium text-[var(--ink)]">{item.name}</p>
                    <p className="text-[10px] text-[var(--ink-muted)]">{item.sku} · {inr(item.price)}</p>
                  </div>
                  <StatusPill tone={item.stock <= 0 ? 'red' : item.stock <= 5 ? 'amber' : 'green'}>{item.stock} left</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Product Sales" subtitle="Top 25 by revenue" padded={false} action={<ExportButton filename="product-sales.csv" rows={rows.map((r) => ({ product: r.name, units: r.units, revenue: r.revenue }))} />}>
          <div className="p-3">
            <DataTable
              loading={loading}
              rows={rows}
              rowKey="_id"
              dense
              empty="No sales in this range"
              columns={[
                { key: 'name', header: 'Product', render: (r) => <span className="font-medium">{r.name}</span> },
                { key: 'units', header: 'Units', align: 'right' },
                { key: 'revenue', header: 'Revenue', align: 'right', render: (r) => <span className="font-semibold">{inr(r.revenue)}</span> },
              ]}
            />
          </div>
        </Panel>
      </div>
    </>
  );
}

function VisitorReport({ data, loading }) {
  const o = data?.overview || {};
  const visitors = data?.timeseries?.visitors || [];
  const views = data?.timeseries?.pageViews || [];
  const merged = visitors.map((v) => ({ ...v, views: views.find((p) => p.label === v.label)?.views || 0 }));

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Visitors" value={compactNumber(o.totalVisitors || 0)} change={o.comparison?.visitorsChangePercent} icon={Users} loading={loading && !data} />
        <StatCard label="Page Views" value={compactNumber(o.pageViews || 0)} change={o.comparison?.pageViewsChangePercent} icon={ArrowUpRight} tone="blue" loading={loading && !data} />
        <StatCard label="Conversion" value={`${o.conversionRate || 0}%`} icon={ShoppingBag} tone="green" loading={loading && !data} />
        <StatCard label="Bounce Rate" value={`${o.bounceRate || 0}%`} icon={TrendingUp} tone="red" loading={loading && !data} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Traffic Trend" subtitle="Visitors and page views">
          {loading && !data ? (
            <Skeleton className="h-[240px] w-full rounded-lg" />
          ) : (
            <AreaChart data={merged} height={250} series={[{ key: 'visitors', label: 'Visitors', color: PALETTE[0] }, { key: 'views', label: 'Page views', color: PALETTE[2] }]} />
          )}
        </Panel>
        <Panel title="Acquisition" subtitle="Traffic sources">
          {loading && !data ? <Skeleton className="h-[200px] w-full rounded-lg" /> : <DonutChart data={(data?.sources?.sources || []).map((s) => ({ label: s.source, value: s.count, percent: s.percent }))} />}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Funnel" subtitle="Session conversion path">{loading && !data ? <Skeleton className="h-[200px] w-full rounded-lg" /> : <FunnelChart steps={data?.pages?.funnel || []} />}</Panel>
        <Panel title="Top Pages" subtitle="Most viewed paths" padded={false}>
          <div className="p-3">
            <DataTable
              loading={loading}
              rows={data?.pages?.pages || []}
              rowKey="path"
              dense
              empty="No page views yet"
              columns={[
                { key: 'path', header: 'Path', render: (r) => <span className="font-mono text-[11px]">{r.path}</span> },
                { key: 'views', header: 'Views', align: 'right', render: (r) => compactNumber(r.views) },
              ]}
            />
          </div>
        </Panel>
      </div>
    </>
  );
}
