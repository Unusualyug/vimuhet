import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';
import PageHero from '../../components/shop/PageHero.jsx';
import { EmptyState, Skeleton } from '../../components/ui/States.jsx';
import Button from '../../components/ui/Button.jsx';
import Rating from '../../components/ui/Rating.jsx';
import { ColorSelector, SizeSelector } from '../../components/ui/Selectors.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { inr } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function Wishlist() {
  useDocumentTitle('My Wishlist', 'Pieces you have saved at Vimuhet.');
  const { wishlist, loading, refreshWishlist, addItem, toggleWishlist } = useCart();
  const items = wishlist.items || [];
  const [selecting, setSelecting] = useState(null);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const openPicker = (product) => {
    setSelecting(product);
    setSize('');
    setColor(product.colors?.[0]?.name || '');
    setError('');
  };

  const availability = (product) => {
    const map = {};
    (product.variants || [])
      .filter((v) => !color || v.color === color)
      .forEach((v) => {
        map[v.size] = (map[v.size] || false) || v.stock - (v.reserved || 0) > 0;
      });
    return map;
  };

  const addSelected = async () => {
    if (!size) {
      setError('Please select a size');
      return;
    }
    const variant = selecting.variants.find((v) => v.size === size && v.color === color);
    if (!variant) {
      setError('That combination is unavailable');
      return;
    }
    setAdding(true);
    const ok = await addItem({ productId: selecting._id, variantId: variant._id, quantity: 1 }, { openDrawer: false });
    setAdding(false);
    if (ok) {
      setSelecting(null);
      await toggleWishlist(selecting._id); // remove from wishlist once moved to bag
      refreshWishlist();
    }
  };

  if (loading && !items.length) {
    return (
      <div className="container-page grid grid-cols-2 gap-4 py-14 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Saved For Later"
        title="My"
        accent="Wishlist"
        description={items.length ? `${items.length} ${items.length === 1 ? 'piece' : 'pieces'} saved.` : undefined}
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]}
        compact
      />
      <div className="container-page py-10">
        {items.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Tap the heart on any piece to save it here — your wishlist stays with you across devices."
            action="Discover new arrivals"
            actionTo="/new-arrivals"
            secondaryAction={{ label: 'Shop best sellers', to: '/best-sellers' }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => (
              <article key={p._id} className="group flex flex-col">
                <div className="relative">
                  <Link to={`/product/${p.slug}`}>
                    <img src={p.images?.[0]?.url} alt={p.name} loading="lazy" className="aspect-[4/5] w-full rounded-xl object-cover" />
                  </Link>
                  <button
                    onClick={() => toggleWishlist(p._id)}
                    aria-label="Remove from wishlist"
                    className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/90 text-[var(--accent)] transition hover:bg-white dark:border-white/10 dark:bg-black/50"
                  >
                    <Heart size={15} fill="currentColor" />
                  </button>
                  {!p.inStock && (
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-[var(--surface-inverse)] px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--surface)]">
                      Out of stock
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col pt-3">
                  <Link to={`/product/${p.slug}`} className="line-clamp-2 font-display text-[15px] leading-snug hover:text-[var(--accent)]">
                    {p.name}
                  </Link>
                  {p.rating > 0 && <Rating value={p.rating} count={p.reviewCount} size={11} className="mt-1" />}
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold">{inr(p.price)}</span>
                    {p.mrp > p.price && <span className="text-xs text-[var(--ink-muted)] line-through">{inr(p.mrp)}</span>}
                  </div>
                  <Button
                    size="sm"
                    variant={p.inStock ? 'primary' : 'outline'}
                    className="mt-3 w-full"
                    icon={ShoppingBag}
                    disabled={!p.inStock}
                    onClick={() => openPicker(p)}
                  >
                    {p.inStock ? 'Move to Bag' : 'Out of stock'}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal open={Boolean(selecting)} onClose={() => setSelecting(null)} title={selecting?.name} size="sm">
        {selecting && (
          <div className="space-y-5">
            <ColorSelector colors={selecting.colors || []} value={color} onChange={(c) => { setColor(c); setSize(''); }} />
            <SizeSelector sizes={selecting.sizes || []} value={size} onChange={setSize} availability={availability(selecting)} error={error} />
            <Button className="w-full" onClick={addSelected} loading={adding}>
              Add to Bag
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
