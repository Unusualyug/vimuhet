import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Eye, Heart, ShoppingCart, TrendingDown, UserCheck, UserPlus, Users } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { Panel, RangePicker, StatCard, DataTable } from '../../components/admin/AdminUI.jsx';
import { DonutChart } from '../../components/admin/Charts.jsx';
import { ErrorState } from '../../components/ui/States.jsx';
import { compactNumber, duration } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

/**
 * Visitor & consent analytics.
 *
 * Everything on this page is aggregated. No session ids, visitor ids or user ids
 * are rendered — the point is to understand behaviour, not to single out people.
 */
export default function Visitors() {
  useDocumentTitle('Visitors', 'Guest sessions, consent and behaviour analytics.');
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    adminApi
      .analytics('visitors', { range })
      .then((res) => alive && setData(res.data))
      .catch((err) => alive && setError(apiErrorMessage(err, 'Could not load visitor analytics')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [range]);

  if (error && !data) return <ErrorState message={error} onRetry={() => setRange((r) => r)} />;

  const d = data || {};
  const consent = d.consent || {};
  const conv = d.conversion || {};
  const abandon = d.cartAbandonment || {};

  const consentDonut = [
    { label: 'Accept all', value: consent.acceptAll || 0 },
    { label: 'Reject optional', value: consent.rejectOptional || 0 },
    { label: 'Custom', value: consent.custom || 0 },
  ].filter((s) => s.value > 0);

  const productColumns = (metric) => [
    {
      key: 'name',
      header: 'Product',
      render: (r) => (
        <Link to={`/product/${r.slug}`} className="flex items-center gap-2.5 hover:text-[var(--accent)]">
          {r.image ? (
            <img src={r.image} alt="" className="h-8 w-8 shrink-0 rounded object-cover" loading="lazy" />
          ) : (
            <span className="h-8 w-8 shrink-0 rounded bg-[var(--surface-sunken)]" />
          )}
          <span className="line-clamp-1 text-[12px] font-medium">{r.name}</span>
        </Link>
      ),
    },
    {
      key: 'count',
      header: metric,
      align: 'right',
      render: (r) => <span className="font-medium">{compactNumber(r.count)}</span>,
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Visitors"
        subtitle="Guest sessions, consent and behaviour — aggregated, never personal"
        actions={<RangePicker value={range} onChange={setRange} />}
      />

      {/* Headline counters */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Visitors" value={compactNumber(d.totalVisitors || 0)} icon={Users} loading={loading} hint={`${compactNumber(d.totalSessions || 0)} sessions`} />
        <StatCard label="Guest Visitors" value={compactNumber(d.guestVisitors || 0)} icon={UserPlus} tone="amber" loading={loading} hint="not signed in" />
        <StatCard label="Registered Users" value={compactNumber(d.registeredUsers || 0)} icon={UserCheck} tone="green" loading={loading} hint={`${compactNumber(d.newRegistrations || 0)} new in range`} />
        <StatCard label="Active Sessions" value={compactNumber(d.activeSessions || 0)} icon={Eye} tone="blue" loading={loading} hint="last 5 minutes" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Returning Visitors" value={compactNumber(d.returningVisitors || 0)} icon={Users} tone="accent" loading={loading} />
        <StatCard label="Avg. Session" value={duration(d.avgSessionDurationSec || 0)} icon={Eye} tone="blue" loading={loading} />
        <StatCard label="Bounce Rate" value={`${d.bounceRate || 0}%`} icon={TrendingDown} tone="red" loading={loading} />
        <StatCard label="Checkout Conversion" value={`${conv.checkoutConversionRate || 0}%`} icon={ShoppingCart} tone="green" loading={loading} hint={`${compactNumber(conv.purchaseSessions || 0)} purchases`} />
      </div>

      {/* Conversion + abandonment */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Shopping Funnel" subtitle="Sessions reaching each step">
          <div className="space-y-3">
            {[
              { label: 'Added to cart', value: conv.cartSessions || 0, pct: 100 },
              { label: 'Started checkout', value: conv.checkoutSessions || 0, pct: conv.cartToCheckoutRate || 0 },
              { label: 'Completed purchase', value: conv.purchaseSessions || 0, pct: conv.cartToPurchaseRate || 0 },
            ].map((step) => (
              <div key={step.label}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--ink)]">{step.label}</span>
                  <span className="font-medium text-[var(--ink)]">
                    {compactNumber(step.value)}
                    <span className="ml-1.5 text-[11px] font-normal text-[var(--ink-muted)]">({step.pct}%)</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, step.pct)}%` }} />
                </div>
              </div>
            ))}
            <p className="pt-1 text-[10.5px] leading-relaxed text-[var(--ink-muted)]">
              Percentages are relative to visitors who added something to their bag.
            </p>
          </div>
        </Panel>

        <Panel title="Cart Abandonment" subtitle="Bags that never became an order">
          <dl className="grid grid-cols-2 gap-3">
            {[
              ['Bags with items', compactNumber(abandon.cartsWithItems || 0)],
              ['Abandonment rate', `${abandon.abandonmentRate || 0}%`],
              ['Guest bags', compactNumber(abandon.guestCarts || 0)],
              ['Registered bags', compactNumber(abandon.registeredCarts || 0)],
              ['Orders in range', compactNumber(abandon.ordersInRange || 0)],
              ['Value at risk', `₹${compactNumber(abandon.valueAtRisk || 0)}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[var(--line-color)] bg-[var(--surface)] p-2.5">
                <dt className="text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">{label}</dt>
                <dd className="mt-1 font-display text-lg text-[var(--ink)]">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[10.5px] leading-relaxed text-[var(--ink-muted)]">
            <Link to="/admin/abandoned-carts" className="text-[var(--accent)] hover:underline">
              Review abandoned carts
            </Link>
          </p>
        </Panel>
      </div>

      {/* Consent */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Panel title="Cookie Consent" subtitle="How visitors responded">
          {consentDonut.length ? (
            <DonutChart data={consentDonut} nameKey="label" valueKey="value" centerLabel={compactNumber(consent.totalDecisions || 0)} />
          ) : (
            <p className="py-8 text-center text-[12px] text-[var(--ink-muted)]">No consent decisions recorded in this range.</p>
          )}
        </Panel>

        <Panel title="Consent by Category" subtitle="Share of visitors who allowed each category">
          <div className="space-y-3">
            {[
              ['Essential', 100, 'Always on'],
              ['Functional', consent.functionalGrantedPercent || 0, `${consent.functionalGrantedPercent || 0}%`],
              ['Analytics', consent.analyticsGrantedPercent || 0, `${consent.analyticsGrantedPercent || 0}%`],
              ['Marketing', consent.marketingGrantedPercent || 0, `${consent.marketingGrantedPercent || 0}%`],
            ].map(([label, pct, display]) => (
              <div key={label}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--ink)]">{label}</span>
                  <span className="font-medium text-[var(--ink-muted)]">{display}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                  <div
                    className={`h-full rounded-full ${label === 'Essential' ? 'bg-[#2F7A4D]' : 'bg-[var(--accent)]'}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-[var(--surface-sunken)] p-3">
            <Cookie size={13} className="mt-0.5 shrink-0 text-[var(--ink-muted)]" />
            <p className="text-[10.5px] leading-relaxed text-[var(--ink-muted)]">
              Only visitors who granted analytics consent are measured. Visitors who chose{' '}
              <strong className="text-[var(--ink)]">Reject Optional</strong> are not tracked at all, so their
              behaviour is intentionally absent from these numbers — and from the funnel above.
            </p>
          </div>
        </Panel>
      </div>

      {/* Product rankings */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Most Viewed" subtitle="Product views" padded={false}>
          <div className="p-3">
            <DataTable
              loading={loading}
              rows={d.mostViewedProducts || []}
              columns={productColumns('Views')}
              empty="No product views in this range"
              dense
            />
          </div>
        </Panel>
        <Panel title="Most Added to Cart" subtitle="Add-to-bag events" padded={false}>
          <div className="p-3">
            <DataTable
              loading={loading}
              rows={d.mostAddedToCart || []}
              columns={productColumns('Adds')}
              empty="No cart additions in this range"
              dense
            />
          </div>
        </Panel>
        <Panel title="Most Favorited" subtitle="Wishlist additions" padded={false}>
          <div className="p-3">
            <DataTable
              loading={loading}
              rows={d.mostFavorited || []}
              columns={productColumns('Saves')}
              empty="No wishlist additions in this range"
              dense
            />
          </div>
        </Panel>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[10.5px] text-[var(--ink-muted)]">
        <Heart size={11} /> All figures are aggregated over the selected range. Individual visitor histories are never displayed.
      </p>
    </div>
  );
}
