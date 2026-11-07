import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { Modal } from './ui/Modal.jsx';
import { useQuickView } from '../context/QuickViewContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { ColorSelector, SizeSelector } from './ui/Selectors.jsx';
import { QuantitySelector } from './ui/Field.jsx';
import Rating from './ui/Rating.jsx';
import Button from './ui/Button.jsx';
import { inr, imageSet } from '../utils/format.js';

export default function QuickViewModal() {
  const { product, closeQuickView } = useQuickView();
  const { addItem, toggleWishlist, isWishlisted } = useCart();
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!product) return;
    setSize('');
    setColor(product.colors?.[0]?.name || '');
    setQty(1);
    setError('');
  }, [product]);

  const variants = useMemo(() => product?.variants || [], [product]);
  const availability = useMemo(() => {
    const map = {};
    variants
      .filter((v) => !color || v.color === color)
      .forEach((v) => {
        map[v.size] = (map[v.size] || false) || v.stock - (v.reserved || 0) > 0;
      });
    return map;
  }, [variants, color]);

  const selectedVariant = variants.find((v) => v.size === size && v.color === color);
  const max = selectedVariant ? Math.min(10, Math.max(1, selectedVariant.stock - (selectedVariant.reserved || 0))) : 10;

  const handleAdd = async () => {
    if (!size) {
      setError('Please select a size');
      return;
    }
    if (!selectedVariant || selectedVariant.stock - (selectedVariant.reserved || 0) < 1) {
      setError('That combination is out of stock');
      return;
    }
    setAdding(true);
    const ok = await addItem({ productId: product._id, variantId: selectedVariant._id, quantity: qty });
    setAdding(false);
    if (ok) closeQuickView();
  };

  if (!product) return null;
  const main = imageSet(product.images?.[0]?.url);

  return (
    <Modal open={Boolean(product)} onClose={closeQuickView} size="xl" hideClose={false} title="Quick View">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="overflow-hidden rounded-xl bg-[var(--surface-sunken)]">
          <img src={main.src} srcSet={main.srcSet} sizes="(max-width: 640px) 90vw, 360px" alt={product.name} className="aspect-[4/5] w-full object-cover" />
        </div>
        <div>
          <p className="eyebrow">{product.category?.name || 'Vimuhet'}</p>
          <h2 className="mt-1.5 font-display text-2xl leading-tight">{product.name}</h2>
          {product.rating > 0 && <Rating value={product.rating} count={product.reviewCount} className="mt-2" />}
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-semibold">{inr(product.price)}</span>
            {product.mrp > product.price && <span className="text-sm text-[var(--ink-muted)] line-through">{inr(product.mrp)}</span>}
            {product.discountPercent > 0 && <span className="text-xs font-semibold text-[#2F7A4D] dark:text-emerald-400">{product.discountPercent}% OFF</span>}
          </div>
          <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-[var(--ink-muted)]">{product.shortDescription || product.description}</p>

          <div className="mt-5 space-y-4">
            <ColorSelector colors={product.colors || []} value={color} onChange={(c) => { setColor(c); setSize(''); }} />
            <SizeSelector sizes={product.sizes || []} value={size} onChange={setSize} availability={availability} error={error} />
            <div className="flex items-center gap-3">
              <QuantitySelector value={qty} max={max} onChange={setQty} />
              <span className="text-[11px] text-[var(--ink-muted)]">{selectedVariant ? `${Math.max(0, selectedVariant.stock - (selectedVariant.reserved || 0))} in stock` : 'Select a size'}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={handleAdd} loading={adding} icon={ShoppingBag} className="flex-1">
              Add to Bag
            </Button>
            <Button variant="outline" size="icon" onClick={() => toggleWishlist(product._id)} aria-label="Add to wishlist">
              <Heart size={16} fill={isWishlisted(product._id) ? 'currentColor' : 'none'} />
            </Button>
          </div>
          <Link to={`/product/${product.slug}`} onClick={closeQuickView} className="mt-4 inline-block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] hover:underline">
            View full details
          </Link>
        </div>
      </div>
    </Modal>
  );
}
