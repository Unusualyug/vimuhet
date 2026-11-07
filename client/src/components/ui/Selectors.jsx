import { Check } from 'lucide-react';

export function SizeSelector({ sizes = [], value, onChange, availability = {}, sizeGuide, error }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--ink-muted)]">
          Select Size {value && <span className="ml-1 text-[var(--ink)]">· {value}</span>}
        </span>
        {sizeGuide && (
          <button type="button" onClick={sizeGuide} className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--accent)] underline-offset-4 hover:underline">
            Size Guide
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const available = availability[size] !== false;
          const active = value === size;
          return (
            <button
              key={size}
              type="button"
              disabled={!available}
              onClick={() => onChange(size)}
              title={available ? size : `${size} is out of stock`}
              aria-label={available ? `Size ${size}` : `Size ${size} — out of stock`}
              className={`relative h-10 min-w-11 rounded-lg border px-3 text-xs font-medium transition-[background-color,border-color,color,box-shadow] duration-200 ${
                active
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-white dark:text-[#1a1113]'
                  : available
                    ? 'border-[var(--line-color)] bg-[var(--surface-raised)] text-[var(--ink)] hover:border-[var(--accent)]'
                    : 'cursor-not-allowed border-dashed border-[var(--line-color)] bg-transparent text-[var(--ink-muted)]'
              }`}
            >
              {size}
              {!available && <span className="absolute inset-x-1 top-1/2 h-px rotate-[-18deg] bg-[var(--line-color)]" />}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function ColorSelector({ colors = [], value, onChange, error }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--ink-muted)]">
        Select Colour {value && <span className="ml-1 text-[var(--ink)]">· {value}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {colors.map((color) => {
          const active = value === color.name;
          return (
            <button
              key={color.name}
              type="button"
              onClick={() => onChange(color.name)}
              aria-label={color.name}
              title={color.name}
              className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-[background-color,border-color,color,box-shadow] duration-200 ${
                active ? 'border-[var(--accent)]' : 'border-transparent hover:border-[var(--line-color)]'
              }`}
            >
              <span className="h-6 w-6 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} />
              {active && (
                <Check
                  size={12}
                  strokeWidth={3}
                  className={['#FFF9F3', '#F8EFE7'].includes(color.hex?.toUpperCase()) ? 'absolute text-[#78152F]' : 'absolute text-white'}
                />
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
