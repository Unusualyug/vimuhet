import { memo, useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Heart, ShoppingBag } from 'lucide-react';
import Rating from './Rating.jsx';
import { inr, imageSet } from '../../utils/format.js';
import { useCart } from '../../context/CartContext.jsx';

export const Badge = ({ children, tone = 'burgundy', className = '' }) => {
  const tones = {
    burgundy: 'bg-[var(--accent)] text-white dark:text-[#1a1113]',
    gold: 'bg-[#C99A2E] text-white',
    sage: 'bg-[#6C7A61] text-white',
    ivory: 'bg-[#FFF9F3] text-[#78152F]',
    dark: 'bg-[#282323] text-[#FFF9F3]',
    outline: 'border border-[var(--accent)] text-[var(--accent)] bg-[var(--surface-raised)]',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[9.5px] font-semibold uppercase leading-none tracking-[0.12em] ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
};

export function ProductMedia({ product, className = '', sizes, priority = false }) {
  const [loaded, setLoaded] = useState(false);
  const primary = product.images?.[0];
  const alternate = product.images?.[1] || primary;
  const main = imageSet(primary?.url);
  const alt = imageSet(alternate?.url);

  return (
    <div className={`product-media relative overflow-hidden bg-[var(--surface-sunken)] ${className}`}>
      {!loaded && <div className="skeleton absolute inset-0 rounded-none" />}
      <img
        src={main.src}
        srcSet={main.srcSet}
        sizes={sizes || main.sizes}
        alt={product.name}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`primary absolute inset-0 h-full w-full object-cover ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
      {alt.src && alt.src !== main.src && (
        <img
          src={alt.src}
          srcSet={alt.srcSet}
          sizes={sizes || alt.sizes}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="alternate absolute inset-0 h-full w-full object-cover opacity-0"
        />
      )}
    </div>
  );
}

function ProductCardBase({ product, onQuickView, priority = false, compact = false }) {
  const { addItem, toggleWishlist, isWishlisted } = useCart();
  const wishlisted = isWishlisted(product._id);
  const [adding, setAdding] = useState(false);
  /* Synchronous in-flight flag. `adding` alone cannot dedupe a fast double-tap:
     setAdding(true) is queued, not committed, so a second tap in the same task
     still sees the old value and fires a second request (measured: 3 taps =
     3 POSTs). A ref flips immediately. */
  const inFlight = useRef(false);
  const discount = product.discountPercent ?? 0;
  const colors = product.colors || [];
  const sizesInStock = (product.variants || []).filter((v) => v.stock - (v.reserved || 0) > 0);
  const soldOut = !product.inStock && sizesInStock.length === 0 && (product.stock ?? 0) <= 0;

  /* `adding` doubles as the in-flight guard: the button is disabled while the
     request runs, so a second tap cannot queue a duplicate add-to-bag. */
  const quickAdd = useCallback(async () => {
    if (soldOut || inFlight.current) return;
    inFlight.current = true;
    const variant = sizesInStock.find((v) => v.size === 'M') || sizesInStock[0];
    if (!variant) {
      onQuickView?.(product);
      return;
    }
    setAdding(true);
    try {
      await addItem({ productId: product._id, variantId: variant._id, quantity: 1 });
    } finally {
      inFlight.current = false;
      setAdding(false);
    }
  }, [addItem, onQuickView, product, sizesInStock, soldOut]);

  const handleWishlist = useCallback(() => toggleWishlist(product._id), [toggleWishlist, product._id]);
  const handleQuickView = useCallback(() => onQuickView?.(product), [onQuickView, product]);

  return (
    /* Reveal is transform+opacity only (compositor-friendly). Cards above the
       fold start visible: previously the first four scrolled into view during
       the initial paint — while the font was still swapping — which animated an
       aspect-ratio box twice and registered as layout shift on top of the page.
       Above-the-fold cards are what LCP is measured on, so they should never
       start at opacity 0 anyway. */
    <motion.article
      initial={priority ? false : { opacity: 0, y: 12 }}
      whileInView={priority ? undefined : { opacity: 1, y: 0 }}
      viewport={priority ? undefined : { once: true, margin: '-40px' }}
      transition={priority ? undefined : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="product-card group relative flex flex-col"
    >
      <div className="relative">
        <Link to={`/product/${product.slug}`} aria-label={product.name} className="block">
          <ProductMedia product={product} className={`${compact ? 'aspect-[3/4]' : 'aspect-[4/5]'} rounded-xl`} priority={priority} />
        </Link>

        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {product.isNewArrival && <Badge tone="ivory">New</Badge>}
          {discount > 0 && <Badge tone="burgundy">{discount}% Off</Badge>}
          {product.soldCount > 100 && <Badge tone="gold">Best Seller</Badge>}
          {soldOut && <Badge tone="dark">Sold Out</Badge>}
        </div>

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wishlisted}
          className={`absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition-[background-color,border-color,color,box-shadow] duration-300 ${
            wishlisted
              ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
              : 'border-white/60 bg-white/85 text-[#78152F] hover:bg-white dark:border-white/10 dark:bg-black/40 dark:text-[#f4ebe4]'
          }`}
        >
          <motion.span key={String(wishlisted)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
            <Heart size={15} fill={wishlisted ? 'currentColor' : 'none'} strokeWidth={1.8} />
          </motion.span>
        </button>

        <div className="absolute inset-x-2.5 bottom-2.5 flex translate-y-2 gap-1.5 opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-md:translate-y-0 max-md:opacity-100">
          <button
            type="button"
            onClick={quickAdd}
            disabled={soldOut || adding}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--accent)] text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#5f0f24] disabled:opacity-50 dark:text-[#1a1113]"
          >
            <ShoppingBag size={13} className="hidden min-[380px]:block" />
            <span className="truncate">
              {soldOut ? 'Sold out' : adding ? 'Adding…' : (
                <>
                  <span className="min-[380px]:hidden">Add</span>
                  <span className="hidden min-[380px]:inline">Add to Bag</span>
                </>
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={handleQuickView}
            aria-label="Quick view"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/90 text-[#78152F] transition hover:bg-white dark:border-white/10 dark:bg-black/50 dark:text-[#f4ebe4]"
          >
            <Eye size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/product/${product.slug}`} className="line-clamp-2 font-display text-[15px] leading-snug text-[var(--ink)] transition-colors hover:text-[var(--accent)]">
            {product.name}
          </Link>
        </div>
        {product.rating > 0 && <Rating value={product.rating} count={product.reviewCount} size={11} className="mt-1" />}
        <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
          <span className="text-sm font-semibold text-[var(--ink)]">{inr(product.price)}</span>
          {product.mrp > product.price && (
            <>
              <span className="text-xs text-[var(--ink-muted)] line-through">{inr(product.mrp)}</span>
              <span className="text-[11px] font-semibold text-[#2F7A4D] dark:text-emerald-400">{discount}% OFF</span>
            </>
          )}
        </div>
        {colors.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            {colors.slice(0, 5).map((c) => (
              <span
                key={c.name}
                title={c.name}
                className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20"
                style={{ backgroundColor: c.hex }}
              />
            ))}
            {colors.length > 5 && <span className="text-[10px] text-[var(--ink-muted)]">+{colors.length - 5}</span>}
          </div>
        )}
      </div>
    </motion.article>
  );
}

/**
 * Placeholder that is the same size as a real card, not just visually similar.
 *
 * The text block on a real card settles at 98.6px (a two-line title, rating,
 * price row and colour swatches) and at 119.3px below 480px, where the title
 * wraps to three lines. The skeleton used to be ~33px shorter, so the centred
 * `ProductGridSkeleton` sat 25px higher than the real grid and every listing
 * page snapped downwards the moment products arrived (the 0.0095 `/shop` shift,
 * plus the header/footer moves it dragged with it). These min-heights pin the
 * skeleton to the measured values, so the swap is invisible.
 */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="skeleton aspect-[4/5] rounded-xl" />
      <div className="min-h-[98.6px] space-y-2 pt-3 max-[479px]:min-h-[119.3px]">
        <div className="skeleton h-3.5 w-4/5" />
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  );
}

/**
 * Memoised card.
 *
 * Product grids render 12–24 of these at once, and every add-to-bag, wishlist
 * toggle or filter change re-rendered all of them because `onQuickView` was a
 * new closure on each parent render. `useCart()` already memoises its actions,
 * so the default shallow compare now holds: a card only re-renders when its own
 * product, its priority flag, or its own local state changes.
 *
 * Declared before the default export on purpose — a `export default ProductCard`
 * placed above the `const` is evaluated during hoisting and throws
 * "Cannot access 'ProductCard' before initialization" in the browser, even
 * though the bundler builds it happily.
 */
export const ProductCard = memo(ProductCardBase);

export default ProductCard;
