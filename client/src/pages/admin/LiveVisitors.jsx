import { useEffect, useRef, useState } from 'react';
import { Activity, Monitor, Radio, RefreshCw, Smartphone, Tablet } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { Panel, StatCard, DataTable, StatusPill } from '../../components/admin/AdminUI.jsx';
import { DonutChart, PALETTE } from '../../components/admin/Charts.jsx';
import { ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { duration, percent } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const DEVICE_ICON = { Mobile: Smartphone, Tablet: Tablet, Desktop: Monitor };

export default function LiveVisitors() {
  useDocumentTitle('Live Visitors', 'Real-time visitor activity.');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [auto, setAuto] = useState(true);
  const [tick, setTick] = useState(0);
  const timer = useRef(null);

  const load = () => {
    adminApi
      .analytics('live')
      .then((res) => {
        setData(res.data);
        setError('');
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load live visitors')));
  };

  useEffect(load, [tick]);

  useEffect(() => {
    if (!auto) return undefined;
    timer.current = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(timer.current);
  }, [auto]);

  if (error && !data) return <ErrorState message={error} onRetry={load} />;

  const sessions = data?.sessions || [];
  const byDevice = ['Mobile', 'Desktop', 'Tablet'].map((d) => ({ label: d, value: sessions.filter((s) => (s.device || 'Desktop') === d).length })).filter((d) => d.value);
  const bySource = Object.entries(
    sessions.reduce((acc, s) => {
      const k = s.source || 'Direct';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  ).map(([label, value]) => ({ label, value }));

  return (
    <div>
      <AdminPageHeader
        title="Live Visitors"
        subtitle="Refreshes automatically every 15 seconds"
        breadcrumb="Live Visitors"
        actions={
          <>
            <button
              onClick={() => setAuto((a) => !a)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[11.5px] font-medium transition ${
                auto ? 'border-[#2F7A4D]/40 bg-[#2F7A4D]/10 text-[#2F7A4D] dark:text-emerald-400' : 'border-[var(--line-color)] text-[var(--ink-muted)]'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${auto ? 'animate-pulse bg-[#2F7A4D]' : 'bg-[var(--ink-muted)]'}`} /> {auto ? 'Live' : 'Paused'}
            </button>
            <button onClick={load} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line-color)] px-3 text-[11.5px] font-medium text-[var(--ink)] hover:border-[var(--accent)]">
              <RefreshCw size={13} /> Refresh
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Visitors" value={data?.active ?? 0} icon={Radio} tone="green" hint="last 5 minutes" loading={!data} />
        <StatCard label="Mobile Sessions" value={sessions.filter((s) => (s.device || 'Desktop') === 'Mobile').length} icon={Smartphone} tone="blue" loading={!data} />
        <StatCard label="Returning" value={sessions.filter((s) => s.isReturning).length} icon={Activity} tone="amber" loading={!data} />
        <StatCard
          label="Avg. Dwell"
          value={duration(sessions.length ? sessions.reduce((s, x) => s + (x.durationSec || 0), 0) / sessions.length : 0)}
          icon={Activity}
          tone="accent"
          loading={!data}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Devices" subtitle="Active sessions by device">
          {!data ? <Skeleton className="h-[160px] w-full rounded-lg" /> : byDevice.length ? <DonutChart data={byDevice} nameKey="label" valueKey="value" size={150} /> : <p className="py-6 text-center text-[12px] text-[var(--ink-muted)]">No active sessions</p>}
        </Panel>
        <Panel title="Sources" subtitle="Where active visitors came from">
          {!data ? (
            <Skeleton className="h-[160px] w-full rounded-lg" />
          ) : bySource.length ? (
            <DonutChart data={bySource.map((s, i) => ({ ...s, color: PALETTE[i % PALETTE.length] }))} nameKey="label" valueKey="value" size={150} />
          ) : (
            <p className="py-6 text-center text-[12px] text-[var(--ink-muted)]">No active sessions</p>
          )}
        </Panel>
        <Panel title="Traffic Notes" subtitle="How this data is collected">
          <ul className="space-y-2 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">
            <li className="flex gap-2"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" /> Sessions are anonymous — no names, emails or IP addresses are stored.</li>
            <li className="flex gap-2"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" /> A visitor is considered active for 5 minutes after their last event.</li>
            <li className="flex gap-2"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" /> City-level location is derived from the request at collection time and stored without the IP.</li>
            {data && <li className="flex gap-2"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" /> Showing {sessions.length} of {data.active} sessions.</li>}
          </ul>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Active Sessions" subtitle="Newest activity first" padded={false}>
          <div className="p-3">
            <DataTable
              loading={!data}
              rows={sessions}
              rowKey="sessionId"
              dense
              columns={[
                {
                  key: 'device',
                  header: 'Device',
                  render: (r) => {
                    const Icon = DEVICE_ICON[r.device] || Monitor;
                    return (
                      <span className="flex items-center gap-1.5 text-[11.5px]">
                        <Icon size={13} className="text-[var(--ink-muted)]" /> {r.device || 'Desktop'}
                      </span>
                    );
                  },
                },
                { key: 'currentPath', header: 'Current page', render: (r) => <span className="font-mono text-[11px] text-[var(--ink)]">{r.currentPath || '/'}</span> },
                { key: 'source', header: 'Source', render: (r) => <StatusPill tone="neutral">{r.source || 'Direct'}</StatusPill> },
                { key: 'location', header: 'Location', render: (r) => <span className="text-[11.5px] text-[var(--ink-muted)]">{[r.city, r.state].filter(Boolean).join(', ') || '—'}</span> },
                { key: 'pageViews', header: 'Views', align: 'right', render: (r) => r.pageViews ?? '—' },
                { key: 'durationSec', header: 'Dwell', align: 'right', render: (r) => <span className="text-[11.5px]">{duration(r.durationSec)}</span> },
                { key: 'secondsAgo', header: 'Last seen', align: 'right', render: (r) => <span className="text-[11px] text-[var(--ink-muted)]">{r.secondsAgo}s ago</span> },
                { key: 'type', header: '', align: 'right', render: (r) => (r.isReturning ? <StatusPill tone="accent">Returning</StatusPill> : null) },
              ]}
              empty="No visitors are active right now"
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
