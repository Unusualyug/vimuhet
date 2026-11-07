import { useId, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { inr, compactNumber } from '../../utils/format.js';

const PALETTE = ['#78152F', '#B4485F', '#D9A5A5', '#C99A2E', '#6C7A61', '#4B6B8A', '#8C6A9E'];

const prefersNumber = (v, kind) => (kind === 'currency' ? inr(v) : compactNumber(v));

function useScale(values) {
  return useMemo(() => {
    const max = Math.max(1, ...values.filter((v) => Number.isFinite(v)));
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / step) * step;
  }, [values]);
}

/* ------------------------------- Area / line ------------------------------ */

export function AreaChart({ data = [], xKey = 'label', series = [{ key: 'value', label: 'Value', color: PALETTE[0] }], height = 260, kind = 'number', showGrid = true }) {
  const id = useId().replace(/:/g, '');
  const [hover, setHover] = useState(null);
  const values = data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0));
  const max = useScale(values);
  const padding = { top: 14, right: 12, bottom: 26, left: 44 };
  const W = 640;
  const H = height;
  const innerW = W - padding.left - padding.right;
  const innerH = H - padding.top - padding.bottom;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const point = (i, v) => [padding.left + i * stepX, padding.top + innerH - (v / max) * innerH];

  if (!data.length) {
    return <div className="flex h-[200px] items-center justify-center text-[12px] text-[var(--ink-muted)]">No data for this range</div>;
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Trend chart">
        {showGrid &&
          [0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padding.top + innerH * t;
            return (
              <g key={t}>
                <line x1={padding.left} x2={W - padding.right} y1={y} y2={y} stroke="currentColor" className="text-[var(--line-color)]" strokeWidth="1" strokeDasharray="3 4" />
                <text x={padding.left - 8} y={y + 3} textAnchor="end" className="fill-[var(--ink-muted)] text-[9px]">
                  {prefersNumber(Math.round(max * (1 - t)), kind)}
                </text>
              </g>
            );
          })}

        {series.map((s) => {
          const pts = data.map((d, i) => point(i, Number(d[s.key]) || 0));
          const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
          const area = `${line} L${pts[pts.length - 1][0]},${padding.top + innerH} L${pts[0][0]},${padding.top + innerH} Z`;
          return (
            <g key={s.key}>
              <defs>
                <linearGradient id={`${id}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.26" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d={area} fill={`url(#${id}-${s.key})`} />
              <motion.path
                d={line}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
              {data.map((d, i) => {
                const [x, y] = point(i, Number(d[s.key]) || 0);
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={hover?.i === i ? 4 : 2.2}
                    fill="var(--surface-raised)"
                    stroke={s.color}
                    strokeWidth="1.6"
                    className="transition-[opacity,transform]"
                  />
                );
              })}
            </g>
          );
        })}

        {data.map((d, i) => (
          <rect
            key={i}
            x={padding.left + i * stepX - stepX / 2}
            y={padding.top}
            width={Math.max(stepX, 8)}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover({ i, d })}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {data.map((d, i) => {
          const show = data.length <= 8 || i % Math.ceil(data.length / 6) === 0 || i === data.length - 1;
          if (!show) return null;
          return (
            <text key={i} x={padding.left + i * stepX} y={H - 8} textAnchor="middle" className="fill-[var(--ink-muted)] text-[9px]">
              {String(d[xKey] ?? '').slice(5)}
            </text>
          );
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-[var(--line-color)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-[11px] shadow-lg"
          style={{ left: `calc(${((padding.left + hover.i * stepX) / W) * 100}% - 40px)`, top: 4 }}
        >
          <p className="font-medium text-[var(--ink)]">{hover.d[xKey]}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center gap-1.5 text-[var(--ink-muted)]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
              {s.label}: <span className="font-medium text-[var(--ink)]">{prefersNumber(Number(hover.d[s.key]) || 0, kind)}</span>
            </p>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[10.5px] text-[var(--ink-muted)]">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- Bars ---------------------------------- */

export function BarChart({ data = [], xKey = 'label', yKey = 'value', color = PALETTE[0], height = 240, kind = 'number', horizontal = false }) {
  const max = useScale(data.map((d) => Number(d[yKey]) || 0));

  if (!data.length) return <div className="flex h-[180px] items-center justify-center text-[12px] text-[var(--ink-muted)]">No data for this range</div>;

  if (horizontal) {
    return (
      <ul className="space-y-2.5">
        {data.map((d, i) => (
          <li key={i}>
            <div className="mb-1 flex items-center justify-between text-[11.5px]">
              <span className="truncate pr-3 text-[var(--ink)]">{d[xKey]}</span>
              <span className="shrink-0 font-medium text-[var(--ink-muted)]">{prefersNumber(Number(d[yKey]) || 0, kind)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((Number(d[yKey]) || 0) / max) * 100}%` }}
                transition={{ duration: 0.7, delay: i * 0.04 }}
                className="h-full rounded-full"
                style={{ background: color }}
              />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[9.5px] font-medium text-[var(--ink-muted)] opacity-0 transition group-hover:opacity-100">{prefersNumber(Number(d[yKey]) || 0, kind)}</span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(2, ((Number(d[yKey]) || 0) / max) * 100)}%` }}
            transition={{ duration: 0.6, delay: i * 0.03, ease: 'easeOut' }}
            className="w-full rounded-t-[3px] transition-opacity group-hover:opacity-80"
            style={{ background: color }}
          />
          <span className="w-full truncate text-center text-[8.5px] text-[var(--ink-muted)]">{String(d[xKey] ?? '').slice(5) || d[xKey]}</span>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------- Donut --------------------------------- */

export function DonutChart({ data = [], nameKey = 'label', valueKey = 'value', size = 168, thickness = 20, centerLabel, kind = 'number' }) {
  const total = data.reduce((s, d) => s + (Number(d[valueKey]) || 0), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (!total) return <div className="flex h-[168px] items-center justify-center text-[12px] text-[var(--ink-muted)]">No data</div>;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-sunken)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const value = Number(d[valueKey]) || 0;
          const length = (value / total) * circumference;
          const dash = `${length} ${circumference - length}`;
          const el = (
            <motion.circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={d.color || PALETTE[i % PALETTE.length]}
              strokeWidth={thickness}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.08 }}
            />
          );
          offset += length;
          return el;
        })}
        <circle cx={size / 2} cy={size / 2} r={radius - thickness} fill="var(--surface-raised)" />
      </svg>
      <div className="min-w-0 flex-1">
        {centerLabel && <p className="mb-2 font-display text-[20px] leading-none text-[var(--ink)]">{centerLabel}</p>}
        <ul className="space-y-1.5">
          {data.map((d, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-[11.5px]">
              <span className="flex min-w-0 items-center gap-1.5 text-[var(--ink-muted)]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color || PALETTE[i % PALETTE.length] }} />
                <span className="truncate">{d[nameKey]}</span>
              </span>
              <span className="shrink-0 font-medium text-[var(--ink)]">
                {d.percent != null ? `${d.percent}%` : prefersNumber(Number(d[valueKey]) || 0, kind)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* --------------------------------- Funnel -------------------------------- */

export function FunnelChart({ steps = [] }) {
  if (!steps.length) return <div className="text-[12px] text-[var(--ink-muted)]">No funnel data</div>;
  const first = steps[0]?.sessions || steps[0]?.count || 1;

  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const value = s.sessions ?? s.count ?? 0;
        const width = Math.max(6, (value / (first || 1)) * 100);
        return (
          <div key={s.key || i} className="relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${width}%` }}
              transition={{ duration: 0.6, delay: i * 0.06 }}
              className="flex items-center justify-between rounded-md px-3 py-2.5"
              style={{ background: PALETTE[i % PALETTE.length], minWidth: 150 }}
            >
              <span className="truncate text-[11.5px] font-medium text-white">{s.label}</span>
              <span className="ml-2 shrink-0 text-[11px] text-white/85">{compactNumber(value)}</span>
            </motion.div>
            {s.fromPreviousPercent != null && i > 0 && (
              <span className="mt-1 inline-block pl-3 text-[10px] text-[var(--ink-muted)]">{s.fromPreviousPercent}% continue from previous step</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------- Sparkline ------------------------------ */

export function Sparkline({ data = [], color = PALETTE[0], height = 34, width = 92 }) {
  if (data.length < 2) return <div style={{ height }} />;
  const values = data.map((d) => (typeof d === 'number' ? d : Number(d.value ?? d.revenue ?? d.visitors ?? 0)));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - ((v - min) / span) * (height - 4) - 2]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={color} fillOpacity="0.1" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export { PALETTE };
