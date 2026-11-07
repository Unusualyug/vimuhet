import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, TrendingUp } from 'lucide-react';
import ProductListing from '../../components/shop/ProductListing.jsx';
import PageHero from '../../components/shop/PageHero.jsx';
import { catalogApi } from '../../services/endpoints.js';
import { useStore } from '../../context/StoreContext.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [term, setTerm] = useState(q);
  const [popular, setPopular] = useState([]);
  const { recentSearches, addRecentSearch, clearRecentSearches, categories } = useStore();
  const navigate = useNavigate();
  useDocumentTitle(q ? `Search: ${q}` : 'Search', 'Search Vimuhet kurtis, kurti sets and ethnic wear.');

  useEffect(() => setTerm(q), [q]);
  useEffect(() => {
    catalogApi.popularSearches().then((r) => setPopular(r.data || [])).catch(() => {});
  }, []);

  const submit = (e) => {
    e?.preventDefault();
    if (!term.trim()) return;
    addRecentSearch(term.trim());
    setSearchParams({ q: term.trim() });
  };

  return (
    <>
      <PageHero
        eyebrow="Search"
        title="Find your"
        accent="next piece"
        description="Search by name, fabric, colour, occasion or SKU."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Search' }]}
        compact
      />
      <div className="container-page py-8">
        <form onSubmit={submit} className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-[var(--line-color)] bg-[var(--surface-raised)] p-1.5 pl-5">
          <Search size={17} className="text-[var(--ink-muted)]" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search kurtis, cotton, festive, wine…"
            aria-label="Search"
            className="h-10 w-full min-w-0 bg-transparent text-sm focus:outline-none"
          />
          <button type="submit" className="shrink-0 rounded-full bg-[var(--accent)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white dark:text-[#1a1113]">
            Search
          </button>
        </form>

        {!q && (
          <div className="mx-auto mt-8 max-w-2xl space-y-6">
            {recentSearches.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">Recent searches</p>
                  <button onClick={clearRecentSearches} className="text-[10px] uppercase tracking-[0.1em] text-[var(--accent)]">Clear</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((r) => (
                    <button key={r} onClick={() => { setTerm(r); addRecentSearch(r); setSearchParams({ q: r }); }} className="rounded-full border border-[var(--line-color)] px-3 py-1.5 text-xs hover:border-[var(--accent)]">
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                <TrendingUp size={11} /> Popular searches
              </p>
              <div className="flex flex-wrap gap-2">
                {(popular.length ? popular : ['Embroidered kurti', 'Cotton kurti', 'Anarkali']).map((p) => (
                  <button key={p} onClick={() => { setTerm(p); addRecentSearch(p); setSearchParams({ q: p }); }} className="rounded-full bg-[var(--surface-sunken)] px-3 py-1.5 text-xs hover:text-[var(--accent)]">
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">Popular categories</p>
              <div className="flex flex-wrap gap-2">
                {categories.slice(0, 7).map((c) => (
                  <button key={c._id} onClick={() => navigate(`/category/${c.slug}`)} className="rounded-full border border-[var(--line-color)] px-3 py-1.5 text-xs hover:border-[var(--accent)]">
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {q && (
        <div className="container-page pb-14">
          <h2 className="mb-5 font-display text-2xl">
            Results for <span className="italic text-[var(--accent)]">“{q}”</span>
          </h2>
          <ProductListing key={q} fetcher={(params) => catalogApi.products({ ...params, q })} emptyTitle={`No results for “${q}”`} emptyDescription="Try a different fabric, colour or category." />
        </div>
      )}
    </>
  );
}
