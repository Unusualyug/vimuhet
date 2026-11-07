import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LayoutGrid, Sparkles } from 'lucide-react';
import { useStore } from '../../context/StoreContext.jsx';
import PageHero from '../../components/shop/PageHero.jsx';
import { FadeIn } from '../../components/ui/Section.jsx';
import { Skeleton, ErrorState } from '../../components/ui/States.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { CATEGORY_META } from '../../constants/index.js';

function CategoryCard({ category, index }) {
  const meta = CATEGORY_META?.[category.slug] || {};
  return (
    <FadeIn delay={Math.min(index * 0.05, 0.3)}>
      <Link
        to={`/category/${category.slug}`}
        className="group relative block overflow-hidden rounded-2xl bg-[var(--surface-sunken)]"
      >
        <div className="aspect-[4/5] overflow-hidden">
          {(category.image?.url || meta.image) ? (
            <img
              src={category.image?.url || meta.image}
              alt={category.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.05]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#78152F] to-[#3d101d]">
              <LayoutGrid size={30} className="text-[#D9A5A5]" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#2a0b14]/85 via-[#2a0b14]/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-[9.5px] uppercase tracking-[0.2em] text-[#D9A5A5]">
            {category.productCount ? `${category.productCount} styles` : 'Explore'}
          </p>
          <h3 className="mt-1 font-display text-[21px] leading-tight text-[#FFF9F3]">{category.name}</h3>
          {category.description && <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-[#F7E2DF]/75">{category.description}</p>}
          <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FFF9F3]">
            Shop now <ArrowRight size={11} className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </FadeIn>
  );
}

export default function CategoriesIndex() {
  useDocumentTitle('Categories', 'Browse all Vimuhet categories — everyday kurtis, festive wear, kurti sets and more.');
  const { categories, loading } = useStore();
  const list = useMemo(() => (categories || []).filter((c) => c.isActive !== false), [categories]);

  return (
    <>
      <PageHero
        eyebrow="Find your edit"
        title="Shop by"
        accent="Category"
        description="Seven considered edits — from everyday cottons to designer festive pieces."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Categories' }]}
        compact
      />
      <div className="container-page py-10">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
            ))}
          </div>
        ) : !list.length ? (
          <ErrorState title="No categories yet" message="Our catalogue is being updated. Please check back soon." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {list.map((c, i) => (
              <CategoryCard key={c._id || c.slug} category={c} index={i} />
            ))}
            <FadeIn delay={0.2}>
              <Link to="/shop" className="group flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--line-color)] bg-[var(--surface-raised)] text-center transition hover:border-[var(--accent)]">
                <Sparkles size={22} className="text-[var(--accent)]" />
                <p className="font-display text-lg">Shop All</p>
                <p className="px-6 text-[11.5px] text-[var(--ink-muted)]">Every piece, in one place</p>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">View all</span>
              </Link>
            </FadeIn>
          </div>
        )}
      </div>
    </>
  );
}

/* --------------------------- Collections index --------------------------- */

export function CollectionIndex() {
  useDocumentTitle('Collections', 'Vimuhet collections — curated edits for every occasion.');
  const { collections, loading } = useStore();
  const list = (collections || []).filter((c) => c.isActive !== false);

  return (
    <>
      <PageHero
        eyebrow="Curated edits"
        title="Our"
        accent="Collections"
        description="Six stories, each built around a way of dressing — from quiet mornings to the biggest celebrations."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Collections' }]}
        compact
      />
      <div className="container-page py-10">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[16/10] rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((c, i) => (
              <FadeIn key={c._id || c.slug} delay={Math.min(i * 0.06, 0.3)}>
                <Link to={`/collections/${c.slug}`} className="group relative block overflow-hidden rounded-2xl">
                  <div className="aspect-[16/10] overflow-hidden bg-[var(--surface-sunken)]">
                    {c.image?.url ? (
                      <img src={c.image.url} alt={c.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-[#78152F] to-[#3d101d]" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2a0b14]/90 via-[#2a0b14]/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                    <p className="text-[9.5px] uppercase tracking-[0.2em] text-[#D9A5A5]">{c.productCount ? `${c.productCount} pieces` : 'Collection'}</p>
                    <h3 className="mt-1 font-display text-[24px] leading-tight text-[#FFF9F3]">{c.name}</h3>
                    {c.description && <p className="mt-1.5 max-w-md line-clamp-2 text-[12px] leading-relaxed text-[#F7E2DF]/80">{c.description}</p>}
                    <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FFF9F3]">
                      Explore collection <ArrowRight size={11} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
