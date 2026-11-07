import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductListing from '../../components/shop/ProductListing.jsx';
import PageHero, { CategoryStrip } from '../../components/shop/PageHero.jsx';
import { catalogApi } from '../../services/endpoints.js';
import { useStore } from '../../context/StoreContext.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { ErrorState } from '../../components/ui/States.jsx';

export default function CategoryPage() {
  const { slug } = useParams();
  const { categories } = useStore();
  const [remote, setRemote] = useState(null);
  const [error, setError] = useState(null);

  /* The store already carries every category (name, description, image,
     productCount) because the header mega-menu needs it. The hero used to wait
     for a separate /categories/:slug round-trip and render `compact` in the
     meantime — a short, descriptionless bar — then swap to the full hero. That
     swap pushed the breadcrumbs down 16px and the whole listing 306px, and
     measured 0.155 CLS on /category/*, the worst score anywhere in the app.
     Seeding the hero from the store means the first paint is already the final
     layout; the fetch below only overwrites it with the authoritative record. */
  const cached = useMemo(() => categories?.find((c) => c.slug === slug) || null, [categories, slug]);
  const category = remote || cached;
  useDocumentTitle(category?.name || 'Category', category?.shortDescription);

  useEffect(() => {
    let alive = true;
    setRemote(null);
    setError(null);
    catalogApi
      .category(slug)
      .then((res) => alive && setRemote(res.data))
      .catch((err) => alive && setError(err?.response?.data?.message || 'Category not found'));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (error) {
    return (
      <div className="container-page py-20">
        <ErrorState title="Category unavailable" message={error} onRetry={() => window.location.reload()} />
        <div className="mt-4 text-center">
          <Link to="/shop" className="text-[11px] uppercase tracking-[0.14em] text-[var(--accent)] hover:underline">
            Browse all products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Category"
        title={category?.name || ' '}
        description={category?.description || category?.shortDescription}
        image={category?.banner?.url || category?.image?.url || '/media/banners/hero-3-2000.jpg'}
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Shop', to: '/shop' }, { label: category?.name || '…' }]}
        compact={!category}
      />
      <CategoryStrip categories={categories} activeSlug={slug} />
      <div className="container-page py-8 md:py-10">
        {category && (
          <p className="mb-5 text-[12.5px] text-[var(--ink-muted)]">
            {category.productCount} {category.productCount === 1 ? 'piece' : 'pieces'} in {category.name}
          </p>
        )}
        <ProductListing
          // Re-mount on category change so filters reset cleanly
          key={slug}
          fetcher={(q) => catalogApi.products({ ...q, category: category?._id })}
          /* Wait for the category record (already in the store on most visits)
             before querying, so the listing is fetched once, with its facets. */
          enabled={!!category}
          emptyTitle="Nothing here yet"
          emptyDescription="This category is being restocked. Explore our other edits in the meantime."
        />
      </div>
    </>
  );
}
