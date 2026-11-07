import { Star } from 'lucide-react';

export function Rating({ value = 0, count, size = 14, showValue = true, className = '' }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5" aria-label={`Rated ${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = value >= i - 0.25;
          const half = !filled && value >= i - 0.75;
          return (
            <span key={i} className="relative inline-flex">
              <Star size={size} className="text-[var(--line-color)]" fill="currentColor" strokeWidth={0} />
              {(filled || half) && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: filled ? '100%' : '55%' }}>
                  <Star size={size} className="text-[#C99A2E]" fill="currentColor" strokeWidth={0} />
                </span>
              )}
            </span>
          );
        })}
      </div>
      {showValue && value > 0 && <span className="text-xs font-medium text-[var(--ink)]">{value.toFixed(1)}</span>}
      {count !== undefined && count > 0 && <span className="text-xs text-[var(--ink-muted)]">({count})</span>}
    </div>
  );
}

export function RatingBars({ breakdown = [0, 0, 0, 0, 0], total = 0 }) {
  const sum = breakdown.reduce((a, b) => a + b, 0) || total || 1;
  return (
    <div className="space-y-1.5">
      {breakdown.map((count, i) => {
        const star = 5 - i;
        const pct = Math.round((count / sum) * 100);
        return (
          <div key={star} className="flex items-center gap-2.5 text-xs">
            <span className="w-3 text-[var(--ink-muted)]">{star}</span>
            <Star size={11} className="text-[#C99A2E]" fill="currentColor" strokeWidth={0} />
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
              <div className="h-full rounded-full bg-[#C99A2E]" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-8 text-right tabular-nums text-[var(--ink-muted)]">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default Rating;
