import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BadgeCheck,
  Check,
  ChevronRight,
  Heart,
  MapPin,
  Package,
  RotateCcw,
  Ruler,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { catalogApi, checkoutApi, miscApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { useCart } from '../../context/CartContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useQuickView } from '../../context/QuickViewContext.jsx';
import { useToast } from '../../context/UIContext.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { trackEvent } from '../../hooks/useAnalytics.js';
import ProductGallery from '../../components/product/ProductGallery.jsx';
import ReviewsPanel from '../../components/product/ReviewsPanel.jsx';
import SizeGuideModal from '../../components/product/SizeGuideModal.jsx';
import SizeFinder from '../../components/product/SizeFinder.jsx';
import Rating from '../../components/ui/Rating.jsx';
import Button from '../../components/ui/Button.jsx';
import { ColorSelector, SizeSelector } from '../../components/ui/Selectors.jsx';
import { QuantitySelector, Input } from '../../components/ui/Field.jsx';
import { Accordion } from '../../components/ui/Accordion.jsx';
import { Breadcrumbs, ErrorState } from '../../components/ui/States.jsx';
import { DetailSkeleton } from '../../components/ui/Skeletons.jsx';
import { Skeleton } from '../../components/ui/States.jsx';
import { ProductCard } from '../../components/ui/ProductCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { inr, formatDate } from '../../utils/format.js';
import { guardCheckout } from '../../utils/checkoutIntent.js';

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem, toggleWishlist, isWishlisted } = useCart();
  const { user } = useAuth();
  const { trackRecentlyViewed, recent, shipping } = useStore();
  const { toast } = useToast();
  const { openQuickView } = useQuickView();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [sizeFinderOpen, setSizeFinderOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [sizeError, setSizeError] = useState('');
  const [pincode, setPincode] = useState('');
  const [pinResult, setPinResult] = useState(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyState, setNotifyState] = useState({ loading: false, done: false });

  const product = data?.product;
  useDocumentTitle(product?.name || 'Product', product?.shortDescription || product?.description?.slice(0, 150));

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    catalogApi
      .product(slug)
      .then((res) => {
        if (!alive) return;
        setData(res.data);
        setSize('');
        setColor(res.data.product.colors?.[0]?.name || '');
        setImageIndex(0);
        setQty(1);
        trackRecentlyViewed(res.data.product);
        trackEvent({ type: 'product_view', path: `/product/${slug}`, product: res.data.product._id });
        window.scrollTo({ top: 0 });
      })
      .catch((err) => alive && setError(apiErrorMessage(err, 'This product is unavailable')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const variants = product?.variants || [];
  const galleryImages = useMemo(() => {
    if (!product) return [];
    const forColor = product.images.filter((i) => !color || !i.color || i.color === color);
    return forColor.length ? forColor : product.images;
  }, [product, color]);

  useEffect(() => {
    setImageIndex(0);
  }, [color]);

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
  const maxQty = selectedVariant ? Math.max(1, Math.min(10, selectedVariant.stock - (selectedVariant.reserved || 0))) : 1;
  const soldOut = product ? (product.stock ?? 0) <= 0 : false;

  useEffect(() => {
    setQty(1);
  }, [size, color]);

  const checkPincode = async () => {
    if (!/^\d{6}$/.test(pincode)) {
      setPinResult({ error: 'Enter a valid 6-digit PIN code' });
      return;
    }
    setPinLoading(true);
    try {
      const res = await checkoutApi.pincode(pincode);
      setPinResult(res.data);
    } catch (err) {
      setPinResult({ error: apiErrorMessage(err, 'Could not check delivery') });
    } finally {
      setPinLoading(false);
    }
  };

  const requireSize = () => {
    if (!size) {
      setSizeError('Please select a size to continue');
      return false;
    }
    setSizeError('');
    return true;
  };

  /* Refs, not state, for the in-flight guards. `disabled` on the button is the
     visual cue, but setState is asynchronous: three taps dispatched in one task
     all read the pre-commit `adding` value and each fire a request (measured:
     3 taps = 3 POSTs to /cart/items). A ref flips synchronously, so only the
     first tap gets through. */
  const addInFlight = useRef(false);
  const buyInFlight = useRef(false);

  const handleAdd = async () => {
    if (addInFlight.current || !requireSize()) return;
    addInFlight.current = true;
    setAdding(true);
    try {
      await addItem({ productId: product._id, variantId: selectedVariant._id, quantity: qty });
    } finally {
      addInFlight.current = false;
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (buyInFlight.current || !requireSize()) return;
    buyInFlight.current = true;
    setBuying(true);
    let ok = false;
    try {
      ok = await addItem({ productId: product._id, variantId: selectedVariant._id, quantity: qty }, { openDrawer: false });
    } finally {
      buyInFlight.current = false;
      setBuying(false);
    }
    if (ok) {
      /* Buy Now is an order-placement intent, so it is the one place on the
         product page where sign-in is required. The item is already in the bag
         server-side, so the guest returns to an identical checkout. */
      const gate = guardCheckout(Boolean(user), '/checkout');
      if (!gate.allowed) toast(gate.message, 'info');
      navigate(gate.allowed ? '/checkout' : gate.to);
    }
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: `Loved this from Vimuhet: ${product.name}`, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard?.writeText(url);
    toast('Product link copied', 'info');
  };

  const submitNotify = async () => {
    if (notifyState.loading || notifyState.done) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) return;
    setNotifyState({ loading: true, done: false });
    try {
      await miscApi.backInStock({ productId: product._id, variantId: selectedVariant?._id || variants[0]?._id, email: notifyEmail });
      setNotifyState({ loading: false, done: true });
    } catch {
      setNotifyState({ loading: false, done: false });
      toast('Could not save your request. Please try again.', 'error');
    }
  };

  if (loading) {
    /* The skeleton mirrors the real layout's container widths and vertical
       rhythm (breadcrumb strip, then the two-column grid) instead of a single
       narrower block. Previously the loading frame was ~100px narrower and a
       different height, so the swap to real content re-laid-out the whole page
       — a 0.037 layout shift, the largest shift on the product page. */
    return (
      <div aria-busy="true">
        <div className="container-page py-5">
          <Skeleton className="h-3 w-40 rounded" />
        </div>
        <div className="container-page grid gap-8 pb-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container-page py-20">
        <ErrorState title="Product unavailable" message={error || 'This piece may have sold out or moved.'} onRetry={() => navigate('/shop')} />
        <div className="mt-4 text-center">
          <Link to="/shop" className="text-[11px] uppercase tracking-[0.14em] text-[var(--accent)] hover:underline">Back to shop</Link>
        </div>
      </div>
    );
  }

  const discount = product.discountPercent || 0;
  const wishlisted = isWishlisted(product._id);
  const estimatedDelivery = new Date(Date.now() + (shipping.estimatedDeliveryDays || 5) * 86400000);

  const specRows = [
    ['Fabric', product.attributes?.fabric],
    ['Pattern', product.attributes?.pattern],
    ['Sleeve', product.attributes?.sleeve],
    ['Neckline', product.attributes?.neckline],
    ['Length', product.attributes?.length],
    ['Fit', product.attributes?.fit],
    ['Occasion', product.attributes?.occasion],
    ['Work', product.attributes?.work],
    ['Package contains', product.attributes?.packageContains],
    ['SKU', product.sku],
  ].filter(([, v]) => v);

  return (
    <div>
      <div className="container-page py-5">
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Shop', to: '/shop' },
            ...(product.category ? [{ label: product.category.name, to: `/category/${product.category.slug}` }] : []),
            { label: product.name },
          ]}
        />
      </div>

      <div className="container-page grid gap-8 pb-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        <ProductGallery product={product} images={galleryImages} activeIndex={imageIndex} onChange={setImageIndex} />

        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">{product.category?.name || 'Vimuhet'}</p>
          <h1 className="mt-2 font-display text-[28px] leading-tight text-[var(--ink)] sm:text-[34px]">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {product.rating > 0 && (
              <a href="#reviews" className="hover:opacity-80">
                <Rating value={product.rating} count={product.reviewCount} size={14} />
              </a>
            )}
            <span className="h-3 w-px bg-[var(--line-color)]" />
            <span className="text-[11.5px] text-[var(--ink-muted)]">SKU {product.sku}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-2.5">
            <span className="text-[26px] font-semibold text-[var(--ink)]">{inr(product.price)}</span>
            {product.mrp > product.price && <span className="text-base text-[var(--ink-muted)] line-through">{inr(product.mrp)}</span>}
            {discount > 0 && <span className="rounded-full bg-[#2F7A4D]/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2F7A4D] dark:text-emerald-400">{discount}% OFF</span>}
          </div>
          <p className="mt-1 text-[11px] text-[var(--ink-muted)]">Inclusive of all taxes</p>

          <div className="mt-4 flex items-center gap-1.5 text-[12px]">
            <span className={`h-1.5 w-1.5 rounded-full ${soldOut ? 'bg-red-500' : 'bg-[#2F7A4D]'}`} />
            <span className={soldOut ? 'text-red-600' : 'text-[#2F7A4D] dark:text-emerald-400'}>
              {soldOut ? 'Out of stock' : selectedVariant ? `${Math.max(0, selectedVariant.stock - (selectedVariant.reserved || 0))} in stock` : 'In stock'}
            </span>
          </div>

          <p className="mt-4 text-[13px] leading-relaxed text-[var(--ink-muted)]">{product.shortDescription || product.description}</p>

          <div className="mt-6 space-y-5 border-t border-[var(--line-color)] pt-6">
            <ColorSelector colors={product.colors || []} value={color} onChange={(c) => { setColor(c); setSize(''); }} />
            <SizeSelector
              sizes={product.sizes || []}
              value={size}
              onChange={(s) => { setSize(s); setSizeError(''); }}
              availability={availability}
              sizeGuide={() => setSizeGuideOpen(true)}
              error={sizeError}
            />

            {/* "Not sure?" entry point — expands an inline finder rather than
                opening a modal, so the selection stays on screen behind it. */}
            <button
              type="button"
              onClick={() => setSizeFinderOpen((v) => !v)}
              aria-expanded={sizeFinderOpen}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              <Ruler size={13} />
              {sizeFinderOpen ? 'Hide size finder' : 'Not sure? Find your size'}
            </button>

            <SizeFinder
              open={sizeFinderOpen}
              product={{ ...product, selectedSize: size }}
              onApply={(recommended) => {
                setSize(recommended);
                setSizeError('');
              }}
            />

            <div className="flex flex-wrap items-center gap-3">
              <QuantitySelector value={qty} max={maxQty} onChange={setQty} disabled={!size} />
              {selectedVariant && (
                <span className="text-[11.5px] text-[var(--ink-muted)]">
                  {qty} × {inr(product.price)} = <strong className="text-[var(--ink)]">{inr(product.price * qty)}</strong>
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleAdd} loading={adding} disabled={soldOut} icon={ShoppingBag} className="flex-1 min-w-[150px]">
                Add to Bag
              </Button>
              <Button variant="secondary" onClick={handleBuyNow} loading={buying} disabled={soldOut} className="flex-1 min-w-[130px]">
                Buy Now
              </Button>
              {soldOut && (
                <Button variant="outline" onClick={() => setNotifyOpen(true)} icon={Package}>
                  Notify me
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={() => toggleWishlist(product._id)} aria-label="Wishlist">
                <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
              </Button>
              <Button variant="outline" size="icon" onClick={share} aria-label="Share product">
                <Share2 size={16} />
              </Button>
            </div>
          </div>

          {/* Delivery check */}
          <div className="mt-6 rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-4">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              <MapPin size={12} /> Check Delivery
            </p>
            <div className="flex gap-2">
              <Input
                value={pincode}
                onChange={(e) => { setPincode(e.target.value.replace(/\D/g, '').slice(0, 6)); setPinResult(null); }}
                placeholder="Enter PIN code"
                inputMode="numeric"
                aria-label="PIN code"
                containerClass="flex-1"
              />
              <Button variant="outline" size="md" onClick={checkPincode} loading={pinLoading}>
                Check
              </Button>
            </div>
            {pinResult?.error && <p className="mt-2 text-[11.5px] text-red-600">{pinResult.error}</p>}
            {pinResult && !pinResult.error && (
              <div className="mt-2.5 space-y-1 text-[11.5px]">
                <p className={pinResult.serviceable ? 'text-[#2F7A4D] dark:text-emerald-400' : 'text-red-600'}>
                  {pinResult.serviceable ? `Delivery available to ${pinResult.pincode}` : 'We do not deliver to this PIN code yet'}
                </p>
                {pinResult.serviceable && (
                  <p className="text-[var(--ink-muted)]">
                    Estimated by <strong className="text-[var(--ink)]">{formatDate(pinResult.estimatedDelivery)}</strong> ·{' '}
                    {pinResult.shippingCharge === 0 ? 'Free shipping' : `Shipping ${inr(pinResult.shippingCharge)}`}
                  </p>
                )}
              </div>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--line-color)] pt-3 text-[10.5px] text-[var(--ink-muted)]">
              <span className="flex flex-col items-center gap-1 text-center">
                <Truck size={14} className="text-[var(--accent)]" /> Free above {inr(shipping.freeShippingThreshold)}
              </span>
              <span className="flex flex-col items-center gap-1 text-center">
                <RotateCcw size={14} className="text-[var(--accent)]" /> {shipping.returnWindowDays || 7}-day returns
              </span>
              <span className="flex flex-col items-center gap-1 text-center">
                <ShieldCheck size={14} className="text-[var(--accent)]" /> Secure payment
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Accordion
              defaultOpen={['description']}
              items={[
                {
                  id: 'description',
                  title: 'Product Description',
                  content: <div className="space-y-3"><p>{product.description}</p></div>,
                },
                {
                  id: 'specs',
                  title: 'Specifications',
                  content: (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {specRows.map(([k, v]) => (
                        <div key={k} className="flex flex-col">
                          <dt className="text-[10.5px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">{k}</dt>
                          <dd className="text-[12.5px] text-[var(--ink)]">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  ),
                },
                {
                  id: 'care',
                  title: 'Fabric & Wash Care',
                  content: (
                    <div className="space-y-2">
                      <p><strong className="text-[var(--ink)]">Fabric:</strong> {product.attributes?.fabric || '—'}</p>
                      <p><strong className="text-[var(--ink)]">Care:</strong> {product.attributes?.washCare}</p>
                    </div>
                  ),
                },
                {
                  id: 'returns',
                  title: 'Shipping & Returns',
                  content: (
                    <div className="space-y-2">
                      <p>Dispatched within 24–48 hours. Metro cities typically receive orders in 3–4 working days; other serviceable PIN codes in 5–7.</p>
                      <p>{shipping.returnWindowDays || 7}-day returns on unused, unwashed pieces with tags intact. Raise a return from My Account → Orders.</p>
                    </div>
                  ),
                },
                {
                  id: 'reviews-link',
                  title: `Reviews (${product.reviewCount || 0})`,
                  content: (
                    <a href="#reviews" className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline">
                      Read customer reviews <ChevronRight size={12} />
                    </a>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="container-page border-t border-[var(--line-color)] py-10">
        <ReviewsPanel product={product} />
      </div>

      {/* Similar products */}
      {data.related?.length > 0 && (
        <div className="container-page py-10">
          <h2 className="mb-6 font-display text-2xl">Similar Products</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
            {data.related.slice(0, 8).map((p) => (
              <ProductCard key={p._id} product={p} onQuickView={openQuickView} />
            ))}
          </div>
        </div>
      )}

      {recent.filter((p) => String(p._id) !== String(product._id)).length > 0 && (
        <div className="container-page py-10">
          <h2 className="mb-6 font-display text-2xl">Recently Viewed</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
            {recent.filter((p) => String(p._id) !== String(product._id)).slice(0, 4).map((p) => (
              <ProductCard key={p._id} product={p} onQuickView={openQuickView} />
            ))}
          </div>
        </div>
      )}

      {/* Sticky mobile purchase bar */}
      <div className="sticky bottom-0 z-30 border-t border-[var(--line-color)] bg-[var(--surface-raised)]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] text-[var(--ink-muted)]">{selectedVariant ? `${size} · ${color}` : 'Select size'}</p>
            <p className="text-sm font-semibold">{inr(product.price)}</p>
          </div>
          <Button onClick={handleAdd} loading={adding} disabled={soldOut} className="flex-1">
            Add to Bag
          </Button>
        </div>
      </div>

      <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />

      <Modal open={notifyOpen} onClose={() => setNotifyOpen(false)} title="Back in stock alert" size="sm">
        {notifyState.done ? (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#2F7A4D]/10 text-[#2F7A4D] dark:text-emerald-400">
              <Check size={20} />
            </span>
            <p className="text-sm text-[var(--ink)]">You are on the list.</p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">We will email you as soon as this piece is restocked.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-[var(--ink-muted)]">Enter your email and we will notify you when this piece is available again.</p>
            <Input value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)} placeholder="you@example.com" type="email" aria-label="Email address" />
            <Button className="w-full" onClick={submitNotify} loading={notifyState.loading}>
              Notify me
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
