import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, SlidersHorizontal, X } from 'lucide-react';
import { ProductCard } from '../ui/ProductCard.jsx';
import { ProductGridSkeleton } from '../ui/Skeletons.jsx';
import { EmptyState, ErrorState, NoResults, Pagination } from '../ui/States.jsx';
import { ActiveChips, FilterPanel } from '../ui/Filters.jsx';
import Button from '../ui/Button.jsx';
import { SORT_OPTIONS } from '../../constants/index.js';
import { useQuickView } from '../../context/QuickViewContext.jsx';
import useQueryParams from '../../hooks/useQueryParams.js';

const DEFAULTS = { page: 1, limit: 12, sort: 'recommended' };

export default function ProductListing({ fetcher, params = {}, defaultSort = 'recommended', emptyTitle = 'No products yet', emptyDescription, showFilters = true, enabled = true }) {
  const { value, update } = useQueryParams({ ...DEFAULTS, sort: defaultSort });
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { openQuickView } = useQuickView();

  const queryKey = JSON.stringify({ value, params });

  useEffect(() => {
    /* `enabled` keeps a page that needs a parent record before it can query
       (e.g. /category/:slug needs the category id) from firing a throwaway
       request against a partial filter first. That first response carried no
       facet meta, which collapsed the Category filter group and re-flowed the
       whole sidebar a moment later. The panel and grid keep their skeletons
       up while we wait, so nothing moves. */
    if (!enabled) return undefined;
    let alive = true;
    setLoading(true);
    setError(null);
    const q = { ...value, ...params };
    fetcher(q)
      .then((res) => {
        if (!alive) return;
        setData(res.data || []);
        setMeta(res.meta || null);
      })
      .catch((err) => alive && setError(err?.response?.data?.message || 'Could not load products'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, enabled]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const total = meta?.total ?? data.length;
  const page = Number(value.page) || 1;
  const totalPages = meta?.totalPages || 1;
  const filters = meta?.filters;
  const activeFilterCount = useMemo(
    () => Object.keys(value).filter((k) => !['page', 'limit', 'sort', 'q'].includes(k) && value[k]).length,
    [value]
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[248px_1fr] lg:gap-10">
      {/* Desktop filters */}
      {showFilters && (
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
            <FilterPanel filters={filters} value={value} onChange={update} onClear={() => update({ page: 1, limit: value.limit, sort: value.sort })} />
          </div>
        </aside>
      )}

      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] text-[var(--ink-muted)]">
            Showing <span className="font-medium text-[var(--ink)]">{data.length}</span> of{' '}
            <span className="font-medium text-[var(--ink)]">{total}</span> products
          </p>
          <div className="flex items-center gap-2">
            {showFilters && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-color)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] lg:hidden"
              >
                <SlidersHorizontal size={13} /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </button>
            )}
            <div className="relative">
              <select
                value={value.sort}
                onChange={(e) => update({ ...value, sort: e.target.value, page: 1 })}
                aria-label="Sort products"
                className="h-9 appearance-none rounded-full border border-[var(--line-color)] bg-[var(--surface-raised)] pl-4 pr-9 text-[11.5px] font-medium tracking-[0.04em] focus:border-[var(--accent)] focus:outline-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <LayoutGrid size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
            </div>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="mb-5">
            <ActiveChips value={value} filters={filters} onChange={update} />
          </div>
        )}

        {loading ? (
          <ProductGridSkeleton count={Number(value.limit) || 12} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => update({ ...value })} />
        ) : data.length === 0 ? (
          activeFilterCount > 0 ? (
            <NoResults onClear={() => update({ page: 1, limit: value.limit, sort: value.sort })} />
          ) : (
            <EmptyState title={emptyTitle} description={emptyDescription} actionTo="/shop" action="Browse all products" />
          )
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
              {data.map((p, i) => (
                <ProductCard key={p._id} product={p} onQuickView={openQuickView} priority={i < 4} />
              ))}
            </div>
            <div className="mt-12">
              <Pagination page={page} totalPages={totalPages} onChange={(p) => update({ ...value, page: p })} />
            </div>
          </>
        )}
      </div>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-[90] lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#3d101d]/45" onClick={() => setDrawerOpen(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-hidden rounded-t-2xl bg-[var(--surface)]"
            >
              <div className="flex items-center justify-between border-b border-[var(--line-color)] px-5 py-4">
                <p className="text-sm font-semibold uppercase tracking-[0.14em]">Filters</p>
                <button onClick={() => setDrawerOpen(false)} aria-label="Close filters"><X size={18} /></button>
              </div>
              <div className="max-h-[64vh] overflow-y-auto px-5 py-2">
                <FilterPanel filters={filters} value={value} onChange={update} onClear={() => update({ page: 1, limit: value.limit, sort: value.sort })} />
              </div>
              <div className="border-t border-[var(--line-color)] p-4">
                <Button className="w-full" onClick={() => setDrawerOpen(false)}>
                  Show {total} products
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
