import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Download, Search, Inbox } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '../ui/States.jsx';
import { compactNumber } from '../../utils/format.js';

/* -------------------------------- Range picker ---------------------------- */

export const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
];

export function RangePicker({ value, onChange, options = RANGE_OPTIONS }) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--line-color)] bg-[var(--surface-raised)] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${
            value === o.value ? 'bg-[var(--accent)] text-white dark:text-[#1a1113]' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------- Cards --------------------------------- */

export function Panel({ title, subtitle, action, children, className = '', padded = true }) {
  return (
    <section className={`min-w-0 rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-color)] px-4 py-3">
          <div>
            {title && <h2 className="text-[13px] font-semibold text-[var(--ink)]">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, change, icon: Icon, hint, tone = 'accent', loading }) {
  const tones = {
    accent: 'text-[var(--accent)] bg-[var(--accent-soft)]',
    green: 'text-[#2F7A4D] bg-[#2F7A4D]/10 dark:text-emerald-400',
    amber: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/40',
    red: 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-950/40',
    blue: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-950/40',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">{label}</p>
        {Icon && (
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tones[tone]}`}>
            <Icon size={13} />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24 rounded" />
      ) : (
        <p className="mt-1.5 font-display text-[24px] leading-none text-[var(--ink)]">{value}</p>
      )}
      <div className="mt-2 flex items-center gap-1.5">
        {change != null && Number.isFinite(Number(change)) && (
          <span className={`inline-flex items-center gap-0.5 text-[10.5px] font-medium ${Number(change) >= 0 ? 'text-[#2F7A4D] dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {Number(change) >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(Number(change))}%
          </span>
        )}
        {hint && <span className="text-[10.5px] text-[var(--ink-muted)]">{hint}</span>}
      </div>
    </motion.div>
  );
}

/* ---------------------------------- Table --------------------------------- */

export function DataTable({ columns = [], rows = [], loading, empty, rowKey = '_id', onRowClick, footer, dense = false, skeletonRows = 6 }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)]">
      {/* -mx-* + px-* keeps the scroll affordance edge-to-edge on small screens
          without clipping the first column's focus ring. */}
      <div className="no-scrollbar w-full overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-[var(--line-color)] bg-[var(--surface-sunken)]/60">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`whitespace-nowrap px-3 ${dense ? 'py-2' : 'py-2.5'} text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)] ${c.align === 'right' ? 'text-right' : ''} ${c.className || ''}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--line-color)] last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-3">
                      <Skeleton className="h-3.5 w-full max-w-[120px] rounded" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-12 text-center">
                  <Inbox size={22} className="mx-auto text-[var(--ink-muted)]" />
                  <p className="mt-2 text-[12.5px] text-[var(--ink-muted)]">{empty || 'Nothing to show yet'}</p>
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((row, rowIndex) => (
                <tr
                  key={row[rowKey] ?? rowIndex}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-[var(--line-color)] text-[12.5px] last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-[var(--surface-sunken)]/60' : ''}`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 ${dense ? 'py-2' : 'py-2.5'} align-middle text-[var(--ink)] ${c.align === 'right' ? 'text-right' : ''} ${c.cellClass || ''}`}>
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-[var(--line-color)] px-3 py-2">{footer}</div>}
    </div>
  );
}

export function TablePagination({ page = 1, totalPages = 1, total, limit, onChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[var(--ink-muted)]">
      <span>
        Page {page} of {Math.max(1, totalPages)}
        {total != null ? ` · ${compactNumber(total)} records` : ''}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-md border border-[var(--line-color)] px-2 py-1 transition hover:border-[var(--accent)] disabled:opacity-40"
        >
          <ChevronLeft size={12} /> Prev
        </button>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 rounded-md border border-[var(--line-color)] px-2 py-1 transition hover:border-[var(--accent)] disabled:opacity-40"
        >
          Next <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------- Toolbar bits ----------------------------- */

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-[var(--line-color)] bg-[var(--surface-raised)] pl-9 pr-3 text-[12.5px] text-[var(--ink)] outline-none transition focus:border-[var(--accent)]"
      />
    </div>
  );
}

export function FilterSelect({ value, onChange, options = [], placeholder = 'All' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-[var(--line-color)] bg-[var(--surface-raised)] px-2.5 text-[12.5px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function ExportButton({ rows = [], filename = 'export.csv', headers, label = 'Export' }) {
  const [busy, setBusy] = useState(false);

  const download = () => {
    setBusy(true);
    try {
      const cols = headers || (rows[0] ? Object.keys(rows[0]) : []);
      const escape = (v) => {
        const s = v == null ? '' : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => escape(r[c])).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={download}
      disabled={!rows.length || busy}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line-color)] bg-[var(--surface-raised)] px-3 text-[11.5px] font-medium text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
    >
      <Download size={13} /> {label}
    </button>
  );
}

export function StatusPill({ tone = 'neutral', children }) {
  const tones = {
    green: 'bg-[#2F7A4D]/12 text-[#2F7A4D] dark:text-emerald-400',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    neutral: 'bg-[var(--surface-sunken)] text-[var(--ink-muted)]',
    accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
  };
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${tones[tone]}`}>{children}</span>;
}

export const orderTone = (status) => {
  if (['DELIVERED'].includes(status)) return 'green';
  if (['CANCELLED', 'RETURNED', 'REFUNDED'].includes(status)) return 'red';
  if (['SHIPPED', 'OUT_FOR_DELIVERY'].includes(status)) return 'blue';
  if (['RETURN_REQUESTED'].includes(status)) return 'amber';
  return 'accent';
};

export const paymentTone = (status) => {
  if (status === 'PAID') return 'green';
  if (['FAILED', 'CANCELLED'].includes(status)) return 'red';
  if (['REFUNDED', 'PARTIALLY_REFUNDED'].includes(status)) return 'blue';
  return 'amber';
};
