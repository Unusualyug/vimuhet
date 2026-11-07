import ProductListing from '../../components/shop/ProductListing.jsx';
import PageHero from '../../components/shop/PageHero.jsx';
import { catalogApi } from '../../services/endpoints.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export function NewArrivals() {
  useDocumentTitle('New Arrivals', 'The latest additions to the Vimuhet studio.');
  return (
    <>
      <PageHero
        eyebrow="Just In"
        title="New"
        accent="Arrivals"
        description="Freshly crafted pieces, added every week — first access goes to the Vimuhet Circle."
        image="/media/banners/hero-2-2000.jpg"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'New Arrivals' }]}
      />
      <div className="container-page py-8 md:py-10">
        <ProductListing fetcher={(q) => catalogApi.newArrivals(q)} defaultSort="newest" emptyTitle="New arrivals are on the way" />
      </div>
    </>
  );
}

export function BestSellers() {
  useDocumentTitle('Best Sellers', 'The most-loved Vimuhet pieces, ranked by real sales.');
  return (
    <>
      <PageHero
        eyebrow="Most Loved"
        title="Best"
        accent="Sellers"
        description="Ranked by what our customers actually keep coming back to — not by what we want to sell."
        image="/media/banners/hero-1-2000.jpg"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Best Sellers' }]}
      />
      <div className="container-page py-8 md:py-10">
        <ProductListing fetcher={(q) => catalogApi.bestSellers(q)} defaultSort="best-selling" emptyTitle="Best sellers are loading" />
      </div>
    </>
  );
}

export function Trending() {
  useDocumentTitle('Trending Now', 'What everyone is viewing at Vimuhet this week.');
  return (
    <>
      <PageHero
        eyebrow="Right Now"
        title="Trending"
        accent="at Vimuhet"
        description="Ordered by real engagement in the last few weeks — the pieces getting the most attention."
        image="/media/banners/hero-3-2000.jpg"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Trending' }]}
      />
      <div className="container-page py-8 md:py-10">
        <ProductListing fetcher={(q) => catalogApi.trending(q)} defaultSort="recommended" emptyTitle="Nothing trending yet" />
      </div>
    </>
  );
}
