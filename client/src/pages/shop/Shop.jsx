import { useSearchParams } from 'react-router-dom';
import ProductListing from '../../components/shop/ProductListing.jsx';
import PageHero, { CategoryStrip } from '../../components/shop/PageHero.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { catalogApi } from '../../services/endpoints.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function Shop() {
  useDocumentTitle('Shop All', 'Explore the full Vimuhet collection of kurtis, kurti sets and designer ethnic wear.');
  const { categories } = useStore();
  const [searchParams] = useSearchParams();
  const params = Object.fromEntries(searchParams.entries());

  return (
    <>
      <PageHero
        eyebrow="The Collection"
        title="Shop Our"
        accent="Kurtis Collection"
        description="Every piece is cut from fabrics chosen for how they feel, finished by hand where it matters, and priced to be worn often."
        image="/media/banners/hero-2-2000.jpg"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Shop All' }]}
      />
      <CategoryStrip categories={categories} />
      <div className="container-page py-8 md:py-10">
        <ProductListing
          fetcher={(q) => catalogApi.products(q)}
          params={params.q ? { q: params.q } : {}}
          emptyTitle="No pieces match yet"
          emptyDescription="New arrivals are added every week — try clearing a filter or two."
        />
      </div>
    </>
  );
}
