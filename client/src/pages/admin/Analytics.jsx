import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Eye, MousePointerClick, Radio, ShoppingCart, Timer, Users } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { Panel, RangePicker, StatCard, DataTable, ExportButton } from '../../components/admin/AdminUI.jsx';
import { AreaChart, BarChart, DonutChart, FunnelChart, PALETTE } from '../../components/admin/Charts.jsx';
import { Skeleton, ErrorState } from '../../components/ui/States.jsx';
import { compactNumber, duration } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function Analytics() {
  useDocumentTitle('Analytics', 'Traffic, funnel and audience analytics.');
  const [range, setRange] = useState('30d');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    Promise.all([
      adminApi.analytics('overview', { range }),
      adminApi.analytics('timeseries', { range }),
      adminApi.analytics('sources', { range }),
      adminApi.analytics('pages', { range }),
    ])
      .then(([overview, timeseries, sources, pages]) => {
        if (!alive) return;
        setData({
          overview: overview.data,
          timeseries: timeseries.data,
          sources: sources.data,
          pages: pages.data,
        });
      })
      .catch((err) => alive && setError(apiErrorMessage(err, 'Could not load analytics')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [range]);

  if (error && !data.overview) return <ErrorState message={error} onRetry={() => setRange((r) => r)} />;

  const o = data.overview || {};
  const visitors = data.timeseries?.visitors || [];
  const pageViews = data.timeseries?.pageViews || [];
  const merged = visitors.map((v) => ({ ...v, views: pageViews.find((p) => p.label === v.label)?.views || 0 }));

  return (
    <div>
      <AdminPageHeader
        title="Analytics"
        subtitle="How visitors find, browse and convert on Vimuhet"
        breadcrumb="Analytics"
        actions={
          <>
            <RangePicker value={range} onChange={setRange} />
            <Link to="/admin/live-visitors" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-[11.5px] font-medium text-white dark:text-[#1a1113]">
              <Radio size={13} /> Live view
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Visitors" value={compactNumber(o.totalVisitors || 0)} change={o.comparison?.visitorsChangePercent} icon={Users} hint={`${compactNumber(o.uniqueVisitors || 0)} unique`} loading={loading} />
        <StatCard label="Page Views" value={compactNumber(o.pageViews || 0)} change={o.comparison?.pageViewsChangePercent} icon={Eye} tone="blue" loading={loading} />
        <StatCard label="Product Views" value={compactNumber(o.productViews || 0)} icon={MousePointerClick} tone="accent" loading={loading} />
        <StatCard label="Conversion Rate" value={`${o.conversionRate || 0}%`} icon={Activity} tone="green" hint={`${compactNumber(o.completedPurchases || 0)} purchases`} loading={loading} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Returning Visitors" value={compactNumber(o.returningVisitors || 0)} icon={Users} tone="amber" loading={loading} />
        <StatCard label="Bounce Rate" value={`${o.bounceRate || 0}%`} icon={Activity} tone="red" loading={loading} />
        <StatCard label="Avg. Session" value={duration(o.avgSessionDurationSec || 0)} icon={Timer} tone="blue" loading={loading} />
        <StatCard label="Cart Additions" value={compactNumber(o.cartAdditions || 0)} icon={ShoppingCart} tone="green" loading={loading} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Visitors & Page Views" subtitle="Daily trend for the selected range">
          {loading ? (
            <Skeleton className="h-[260px] w-full rounded-lg" />
          ) : (
            <AreaChart
              data={merged}
              height={270}
              series={[
                { key: 'visitors', label: 'Visitors', color: PALETTE[0] },
                { key: 'views', label: 'Page views', color: PALETTE[2] },
              ]}
            />
          )}
        </Panel>

        <Panel
          title="Conversion Funnel"
          subtitle="Session-level drop-off"
          action={<ExportButton rows={(data.pages?.funnel || []).map((s) => ({ step: s.label, sessions: s.sessions, fromStart: s.fromStartPercent }))} filename="funnel.csv" label="CSV" />}
        >
          {loading ? <Skeleton className="h-[220px] w-full rounded-lg" /> : <FunnelChart steps={data.pages?.funnel || []} />}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Traffic Sources" subtitle="Where visitors come from">
          {loading ? <Skeleton className="h-[180px] w-full rounded-lg" /> : <DonutChart data={(data.sources?.sources || []).map((s) => ({ label: s.source, value: s.count, percent: s.percent }))} />}
        </Panel>
        <Panel title="Devices" subtitle="Session device split">
          {loading ? <Skeleton className="h-[180px] w-full rounded-lg" /> : <DonutChart data={(data.sources?.devices || []).map((s) => ({ label: s.device, value: s.count, percent: s.percent }))} />}
        </Panel>
        <Panel title="Top Cities" subtitle="Privacy-safe location rollup">
          {loading ? (
            <Skeleton className="h-[180px] w-full rounded-lg" />
          ) : (
            <BarChart horizontal data={(data.pages?.geo || []).slice(0, 6).map((g) => ({ label: `${g.city}, ${g.state}`, value: g.visitors }))} yKey="value" color={PALETTE[3]} />
          )}
          <p className="mt-3 text-[10px] leading-relaxed text-[var(--ink-muted)]">Only city and state are stored for analytics — individual IP addresses are never persisted.</p>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Top Pages" subtitle="Most viewed paths" padded={false}>
          <div className="p-3">
            <DataTable
              loading={loading}
              rows={data.pages?.pages || []}
              rowKey="path"
              dense
              columns={[
                { key: 'path', header: 'Path', render: (r) => <span className="font-mono text-[11.5px] text-[var(--ink)]">{r.path || '/'}</span> },
                { key: 'views', header: 'Views', align: 'right', render: (r) => <span className="font-medium">{compactNumber(r.views)}</span> },
                {
                  key: 'share',
                  header: 'Share',
                  align: 'right',
                  render: (r) => {
                    const total = (data.pages?.pages || []).reduce((s, p) => s + p.views, 0) || 1;
                    return <span className="text-[11px] text-[var(--ink-muted)]">{Math.round((r.views / total) * 100)}%</span>;
                  },
                },
              ]}
              empty="No page views recorded yet"
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
