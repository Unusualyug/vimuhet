import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import ProductListing from '../../components/shop/ProductListing.jsx';
import PageHero from '../../components/shop/PageHero.jsx';
import { catalogApi } from '../../services/endpoints.js';
import { useStore } from '../../context/StoreContext.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { ErrorState } from '../../components/ui/States.jsx';
import { FadeIn } from '../../components/ui/Section.jsx';

export function CollectionsPage() {
  useDocumentTitle('Collections', 'Curated edits from the Vimuhet studio.');
  const { collections } = useStore();
  return (
    <>
      <PageHero
        eyebrow="Curated Edits"
        title="Our"
        accent="Collections"
        description="Six edits, each built around a mood and a way of dressing."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Collections' }]}
        compact
      />
      <div className="container-page py-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c, i) => (
            <FadeIn key={c._id} delay={i * 0.04}>
              <Link to={`/collection/${c.slug}`} className="group block overflow-hidden rounded-xl border border-[var(--line-color)]">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={c.image?.url}
                    alt={c.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-[1.1s] group-hover:scale-[1.05]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#3d101d]/80 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-[#FFF9F3]">
                    <p className="font-display text-xl">{c.name}</p>
                    <p className="mt-1 text-[11.5px] text-[#F7E2DF]/85">{c.tagline}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">{c.productCount} pieces</span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                    Explore <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </>
  );
}

export function CollectionDetail() {
  const { slug } = useParams();
  const [collection, setCollection] = useState(null);
  const [error, setError] = useState(null);
  useDocumentTitle(collection?.name || 'Collection', collection?.description);

  useEffect(() => {
    let alive = true;
    setCollection(null);
    setError(null);
    catalogApi
      .collection(slug)
      .then((res) => alive && setCollection(res.data))
      .catch((err) => alive && setError(err?.response?.data?.message || 'Collection not found'));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (error) {
    return (
      <div className="container-page py-20">
        <ErrorState title="Collection unavailable" message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Collection"
        title={collection?.name || ' '}
        description={collection?.description || collection?.tagline}
        image={collection?.banner?.url || collection?.image?.url}
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Collections', to: '/collections' }, { label: collection?.name || '…' }]}
      />
      <div className="container-page py-8 md:py-10">
        {collection && (
          <p className="mb-5 text-[12.5px] text-[var(--ink-muted)]">{collection.productCount} pieces in this edit</p>
        )}
        <ProductListing
          key={slug}
          fetcher={(q) => catalogApi.products({ ...q, collection: collection?._id })}
          emptyTitle="This edit is being restocked"
          emptyDescription="Explore our other collections while we finish the next drop."
        />
        {collection?.related?.length > 0 && (
          <div className="mt-16 border-t border-[var(--line-color)] pt-10">
            <h3 className="mb-5 font-display text-2xl">You may also like</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {collection.related.map((c) => (
                <Link key={c._id} to={`/collection/${c.slug}`} className="group flex items-center gap-4 rounded-xl border border-[var(--line-color)] p-3 transition hover:border-[var(--accent)]">
                  <img src={c.image?.url} alt={c.name} className="h-16 w-14 rounded-lg object-cover" loading="lazy" />
                  <div>
                    <p className="font-display text-[15px]">{c.name}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">{c.tagline}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
