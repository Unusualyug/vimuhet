import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, SearchX, Sparkles } from 'lucide-react';
import Button from './Button.jsx';

export const Skeleton = ({ className = '' }) => <div className={`skeleton ${className}`} />;

export function EmptyState({ icon: Icon = Sparkles, title, description, action, actionTo, secondaryAction }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line-color)] bg-[var(--surface-raised)] px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon size={22} strokeWidth={1.6} />
      </div>
      <h3 className="font-display text-xl text-[var(--ink)]">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--ink-muted)]">{description}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {actionTo && (
          <Button to={actionTo} size="sm">
            {action}
          </Button>
        )}
        {!actionTo && action && (
          <Button size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="ghost" size="sm" to={secondaryAction.to} onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

export function ErrorState({ message = 'We could not load this content.', onRetry, title = 'Something went wrong' }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center dark:border-red-900/50 dark:bg-red-950/30">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300">
        <AlertTriangle size={20} />
      </div>
      <h3 className="font-display text-lg text-[var(--ink)]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-[var(--ink-muted)]">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry} icon={RefreshCw}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function NoResults({ query, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--line-color)] bg-[var(--surface-raised)] px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-[var(--ink-muted)]">
        <SearchX size={22} strokeWidth={1.6} />
      </div>
      <h3 className="font-display text-xl text-[var(--ink)]">No matches found</h3>
      <p className="mt-2 max-w-md text-sm text-[var(--ink-muted)]">
        {query ? (
          <>
            We could not find anything for <span className="font-medium text-[var(--ink)]">“{query}”</span>. Try a different fabric, colour or
            category.
          </>
        ) : (
          'Try removing a filter or two to see more pieces.'
        )}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {onClear && (
          <Button size="sm" variant="outline" onClick={onClear}>
            Clear filters
          </Button>
        )}
        <Button to="/shop" size="sm">
          Browse all
        </Button>
      </div>
    </div>
  );
}

export function Alert({ variant = 'info', title, children, className = '' }) {
  const tones = {
    info: 'border-[var(--line-color)] bg-[var(--surface-sunken)] text-[var(--ink)]',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100',
    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100',
    error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[variant]} ${className}`}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? 'mt-1 leading-relaxed opacity-90' : 'leading-relaxed'}>{children}</div>
    </div>
  );
}

export function Breadcrumbs({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1.5">
          {item.to ? (
            <Link to={item.to} className="transition hover:text-[var(--accent)]">
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--ink)]">{item.label}</span>
          )}
          {i < items.length - 1 && <span className="opacity-50">/</span>}
        </span>
      ))}
    </nav>
  );
}

export function Pagination({ page = 1, totalPages = 1, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const push = (n) => pages.push(n);
  const window = 1;
  push(1);
  for (let i = page - window; i <= page + window; i += 1) if (i > 1 && i < totalPages) push(i);
  if (totalPages > 1) push(totalPages);
  const unique = [...new Set(pages)].sort((a, b) => a - b);

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="h-9 rounded-full border border-[var(--line-color)] px-4 text-[11px] font-medium uppercase tracking-[0.1em] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
      >
        Prev
      </button>
      {unique.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - unique[i - 1] > 1 && <span className="px-1 text-[var(--ink-muted)]">…</span>}
          <button
            onClick={() => onChange(n)}
            aria-current={page === n ? 'page' : undefined}
            className={`h-9 min-w-9 rounded-full border px-3 text-xs font-medium transition ${
              page === n
                ? 'border-[var(--accent)] bg-[var(--accent)] text-white dark:text-[#1a1113]'
                : 'border-[var(--line-color)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
            }`}
          >
            {n}
          </button>
        </span>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="h-9 rounded-full border border-[var(--line-color)] px-4 text-[11px] font-medium uppercase tracking-[0.1em] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}

export default EmptyState;
