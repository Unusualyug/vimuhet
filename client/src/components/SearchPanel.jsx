import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Loader2, Search, TrendingUp, X } from 'lucide-react';
import { catalogApi } from '../services/endpoints.js';
import { useStore } from '../context/StoreContext.jsx';
import useDebounce from '../hooks/useDebounce.js';
import useScrollLock from '../hooks/useScrollLock.js';
import { inr } from '../utils/format.js';

export default function SearchPanel({ open, onClose }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState(null);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { categories, recentSearches, addRecentSearch, clearRecentSearches } = useStore();
  const debounced = useDebounce(term, 260);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 120);
    if (!popular.length) catalogApi.popularSearches().then((r) => setPopular(r.data || [])).catch(() => {});
  }, [open, popular.length]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    let alive = true;
    if (debounced.trim().length < 2) {
      setResults(null);
      return () => {
        alive = false;
      };
    }
    setLoading(true);
    catalogApi
      .search(debounced.trim(), 6)
      .then((res) => {
        if (alive) setResults(res.data);
      })
      .catch(() => alive && setResults({ products: [], categories: [], suggestions: [] }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [debounced]);

  const submit = (value) => {
    const q = (value ?? term).trim();
    if (!q) return;
    addRecentSearch(q);
    onClose();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#3d101d]/45 backdrop-blur-[3px]" onClick={onClose} />
          <motion.div
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto mt-0 w-full max-w-3xl border-b border-[var(--line-color)] bg-[var(--surface-raised)] px-4 pb-6 pt-5 shadow-2xl sm:mt-16 sm:rounded-2xl sm:border sm:px-6"
          >
            <div className="flex items-center gap-3 border-b border-[var(--line-color)] pb-3">
              <Search size={18} className="text-[var(--ink-muted)]" />
              <input
                ref={inputRef}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Search kurtis, kurti sets, fabrics, colours…"
                className="h-9 w-full bg-transparent text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70 focus:outline-none"
                aria-label="Search products"
              />
              {loading && <Loader2 size={16} className="animate-spin text-[var(--accent)]" />}
              <button onClick={onClose} aria-label="Close search" className="rounded-full p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)]">
                <X size={17} />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto pt-4">
              {!results && (
                <div className="space-y-5">
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">Recent searches</p>
                        <button onClick={clearRecentSearches} className="text-[10px] uppercase tracking-[0.1em] text-[var(--accent)]">Clear</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((r) => (
                          <button key={r} onClick={() => submit(r)} className="rounded-full border border-[var(--line-color)] px-3 py-1.5 text-xs hover:border-[var(--accent)]">
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                      <TrendingUp size={11} /> Popular right now
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(popular.length ? popular : ['Embroidered kurti', 'Cotton kurti', 'Anarkali', 'Kurti set']).map((p) => (
                        <button key={p} onClick={() => submit(p)} className="rounded-full bg-[var(--surface-sunken)] px-3 py-1.5 text-xs hover:text-[var(--accent)]">
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">Shop by category</p>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {categories.slice(0, 6).map((c) => (
                        <Link key={c._id} to={`/category/${c.slug}`} onClick={onClose} className="rounded-lg px-2 py-1.5 text-[13px] text-[var(--ink)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]">
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {results && results.products.length === 0 && (
                <p className="py-8 text-center text-sm text-[var(--ink-muted)]">
                  No matches for “{term}”. Try a fabric, colour or category.
                </p>
              )}

              {results?.products?.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">Products</p>
                  <ul className="space-y-1">
                    {results.products.map((p) => (
                      <li key={p._id}>
                        <Link to={`/product/${p.slug}`} onClick={onClose} className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-[var(--surface-sunken)]">
                          <img src={p.images?.[0]?.url} alt="" className="h-12 w-10 rounded object-cover" loading="lazy" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-[var(--ink)]">{p.name}</span>
                            <span className="text-xs text-[var(--ink-muted)]">{inr(p.price)}</span>
                          </span>
                          <ArrowUpRight size={14} className="text-[var(--ink-muted)]" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results && (results.categories?.length > 0 || results.collections?.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line-color)] pt-4">
                  {[...(results.categories || []), ...(results.collections || [])].map((c) => (
                    <Link
                      key={c._id}
                      to={`${results.categories?.includes(c) ? '/category' : '/collection'}/${c.slug}`}
                      onClick={onClose}
                      className="rounded-full border border-[var(--line-color)] px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}

              {results && (
                <button onClick={() => submit()} className="mt-5 w-full rounded-full bg-[var(--accent)] py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white dark:text-[#1a1113]">
                  See all results for “{term}”
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
