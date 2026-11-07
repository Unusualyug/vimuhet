import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, X } from 'lucide-react';
import { inr } from '../../utils/format.js';
import { SIZES } from '../../constants/index.js';

export function FilterGroup({ title, children, defaultOpen = true, count = 0 }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--line-color)] py-4 last:border-0">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 text-left" aria-expanded={open}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">
          {title}
          {count > 0 && <span className="ml-1.5 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] text-white dark:text-[#1a1113]">{count}</span>}
        </span>
        <ChevronDown size={14} className={`text-[var(--ink-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-3.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Checkbox + label. The native input is absolutely positioned over the whole
 * row so it keeps real checkbox semantics (keyboard, screen readers, forms)
 * while the visible box stays purely decorative. A sibling selector paints the
 * focus ring on the custom box when the input is focused via keyboard.
 */
const CheckRow = ({ checked, label, count, onChange, swatch }) => (
  <label className="group relative flex cursor-pointer items-center gap-2.5 py-1.5 text-[13px] text-[var(--ink)] transition hover:text-[var(--accent)]">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="peer absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none rounded opacity-0"
    />
    <span
      aria-hidden="true"
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)] ${
        checked ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--line-color)] bg-[var(--surface-raised)]'
      }`}
    >
      {checked && <Check size={10} strokeWidth={3.5} />}
      {swatch && !checked && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: swatch }} />}
    </span>
    <span className="flex-1 leading-snug">{label}</span>
    {count !== undefined && <span className="text-[11px] text-[var(--ink-muted)]">{count}</span>}
  </label>
);

export function FilterPanel({ filters, value, onChange, onClear }) {
  const toggleArray = (key, item) => {
    const current = value[key] ? String(value[key]).split(',') : [];
    const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
    onChange({ ...value, [key]: next.join(','), page: 1 });
  };
  const isActive = (key, item) => (value[key] ? String(value[key]).split(',').includes(item) : false);

  const activeCount = Object.keys(value).filter((k) => !['page', 'limit', 'sort', 'q'].includes(k) && value[k]).length;
  const priceMin = Number(value.minPrice) || filters?.priceRange?.min || 0;
  const priceMax = Number(value.maxPrice) || filters?.priceRange?.max || 5000;

  return (
    <div>
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em]">Filters</h3>
        {activeCount > 0 && (
          <button onClick={onClear} className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--accent)] hover:underline">
            <X size={12} /> Clear all
          </button>
        )}
      </div>

      <FilterGroup title="Category" count={value.category ? 1 : 0}>
        {/* `filters` is null until the first product response lands. The list
            used to collapse to zero height and then expand, which shoved every
            group below it (Price, Size, Colour…) down by ~220px — the single
            biggest layout shift on the listing pages (0.0095 of the 0.012 CLS
            on /shop). Holding the final height while loading removes it. The
            row height (29.9px) and the 224px cap are the measured values. */}
        <div
          className="max-h-56 space-y-0.5 overflow-y-auto pr-1"
          style={filters?.categories ? undefined : { minHeight: (filters?.categories?.length || 7) * 29.9 + 10 }}
        >
          {(filters?.categories || []).map((c) => (
            <CheckRow key={c.value} label={c.label} count={c.count} checked={isActive('category', c.value)} onChange={() => toggleArray('category', c.value)} />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Price" count={value.minPrice || value.maxPrice ? 1 : 0}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={value.minPrice ?? ''}
              placeholder={String(filters?.priceRange?.min ?? 0)}
              onChange={(e) => onChange({ ...value, minPrice: e.target.value, page: 1 })}
              className="h-9 w-full rounded-lg border border-[var(--line-color)] bg-[var(--surface-raised)] px-2.5 text-xs"
              aria-label="Minimum price"
            />
            <span className="text-[var(--ink-muted)]">–</span>
            <input
              type="number"
              inputMode="numeric"
              value={value.maxPrice ?? ''}
              placeholder={String(filters?.priceRange?.max ?? 5000)}
              onChange={(e) => onChange({ ...value, maxPrice: e.target.value, page: 1 })}
              className="h-9 w-full rounded-lg border border-[var(--line-color)] bg-[var(--surface-raised)] px-2.5 text-xs"
              aria-label="Maximum price"
            />
          </div>
          <div className="space-y-1">
            {[
              [0, 999],
              [1000, 1499],
              [1500, 1999],
              [2000, 2999],
              [3000, 99999],
            ].map(([min, max]) => (
              <button
                key={min}
                onClick={() => onChange({ ...value, minPrice: min, maxPrice: max, page: 1 })}
                className={`block w-full rounded-md px-2 py-1 text-left text-[12.5px] transition hover:bg-[var(--surface-sunken)] ${
                  Number(value.minPrice) === min && Number(value.maxPrice) === max ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]'
                }`}
              >
                {max >= 99999 ? `${inr(min)} and above` : `${inr(min)} – ${inr(max)}`}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[var(--ink-muted)]">
            Showing {priceMin} – {priceMax}
          </p>
        </div>
      </FilterGroup>

      <FilterGroup title="Size" count={value.size ? 1 : 0}>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((s) => {
            const active = isActive('size', s);
            return (
              <button
                key={s}
                onClick={() => toggleArray('size', s)}
                className={`h-8 min-w-9 rounded-md border px-2 text-[11px] font-medium transition ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white dark:text-[#1a1113]'
                    : 'border-[var(--line-color)] hover:border-[var(--accent)]'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Colour" count={value.color ? 1 : 0}>
        <div className="flex flex-wrap gap-2">
          {(filters?.colors || []).map((c) => {
            const active = isActive('color', c.value);
            return (
              <button
                key={c.value}
                onClick={() => toggleArray('color', c.value)}
                title={c.value}
                aria-label={c.value}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${
                  active ? 'border-[var(--accent)]' : 'border-transparent hover:border-[var(--line-color)]'
                }`}
              >
                <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: c.hex || '#ddd' }} />
              </button>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Fabric" defaultOpen={false} count={value.fabric ? 1 : 0}>
        {(filters?.fabrics || []).map((f) => (
          <CheckRow key={f.value} label={f.value} count={f.count} checked={isActive('fabric', f.value)} onChange={() => toggleArray('fabric', f.value)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Sleeve" defaultOpen={false} count={value.sleeve ? 1 : 0}>
        {(filters?.sleeves || []).map((f) => (
          <CheckRow key={f.value} label={f.value} count={f.count} checked={isActive('sleeve', f.value)} onChange={() => toggleArray('sleeve', f.value)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Pattern" defaultOpen={false} count={value.pattern ? 1 : 0}>
        {(filters?.patterns || []).map((f) => (
          <CheckRow key={f.value} label={f.value} count={f.count} checked={isActive('pattern', f.value)} onChange={() => toggleArray('pattern', f.value)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Occasion" defaultOpen={false} count={value.occasion ? 1 : 0}>
        {(filters?.occasions || []).map((f) => (
          <CheckRow key={f.value} label={f.value} count={f.count} checked={isActive('occasion', f.value)} onChange={() => toggleArray('occasion', f.value)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Discount" defaultOpen={false} count={value.minDiscount ? 1 : 0}>
        {[10, 20, 30, 40, 50].map((d) => (
          <CheckRow
            key={d}
            label={`${d}% and above`}
            checked={String(value.minDiscount) === String(d)}
            onChange={() => onChange({ ...value, minDiscount: value.minDiscount === String(d) ? '' : d, page: 1 })}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Availability" defaultOpen={false} count={value.inStock ? 1 : 0}>
        <CheckRow label="In stock only" checked={value.inStock === 'true'} onChange={() => onChange({ ...value, inStock: value.inStock === 'true' ? '' : 'true', page: 1 })} />
        <CheckRow label="On sale" checked={value.onSale === 'true'} onChange={() => onChange({ ...value, onSale: value.onSale === 'true' ? '' : 'true', page: 1 })} />
      </FilterGroup>

      <FilterGroup title="Customer Rating" defaultOpen={false} count={value.minRating ? 1 : 0}>
        {[4, 3, 2].map((r) => (
          <CheckRow
            key={r}
            label={`${r}★ and above`}
            checked={String(value.minRating) === String(r)}
            onChange={() => onChange({ ...value, minRating: value.minRating === String(r) ? '' : r, page: 1 })}
          />
        ))}
      </FilterGroup>
    </div>
  );
}

export function ActiveChips({ value, filters, onChange }) {
  const chips = [];
  const add = (key, label) => chips.push({ key, label });

  if (value.category) {
    String(value.category)
      .split(',')
      .forEach((id) => {
        const cat = filters?.categories?.find((c) => c.value === id);
        add(`category:${id}`, cat?.label || 'Category');
      });
  }
  if (value.size) String(value.size).split(',').forEach((s) => add(`size:${s}`, `Size: ${s}`));
  if (value.color) String(value.color).split(',').forEach((c) => add(`color:${c}`, `Colour: ${c}`));
  if (value.fabric) String(value.fabric).split(',').forEach((c) => add(`fabric:${c}`, c));
  if (value.sleeve) String(value.sleeve).split(',').forEach((c) => add(`sleeve:${c}`, c));
  if (value.pattern) String(value.pattern).split(',').forEach((c) => add(`pattern:${c}`, c));
  if (value.occasion) String(value.occasion).split(',').forEach((c) => add(`occasion:${c}`, c));
  if (value.minPrice || value.maxPrice) add('price', `${inr(value.minPrice || 0)} – ${value.maxPrice ? inr(value.maxPrice) : 'any'}`);
  if (value.minDiscount) add('minDiscount', `${value.minDiscount}%+ off`);
  if (value.inStock) add('inStock', 'In stock');
  if (value.onSale) add('onSale', 'On sale');
  if (value.minRating) add('minRating', `${value.minRating}★+`);

  if (!chips.length) return null;

  const remove = (key) => {
    const [base, item] = key.split(':');
    if (item) {
      const next = String(value[base]).split(',').filter((x) => x !== item);
      onChange({ ...value, [base]: next.join(','), page: 1 });
    } else {
      onChange({ ...value, [base]: '', page: 1 });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={() => remove(chip.key)}
          className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--line-color)] bg-[var(--surface-raised)] px-3 py-1.5 text-[11px] text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {chip.label}
          <X size={11} className="opacity-50 group-hover:opacity-100" />
        </button>
      ))}
      <button onClick={() => onChange({ page: 1 })} className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--accent)] hover:underline">
        Clear all
      </button>
    </div>
  );
}
