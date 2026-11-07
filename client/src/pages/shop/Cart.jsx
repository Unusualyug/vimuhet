import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, ShoppingBag, Tag, Trash2, Truck } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { QuantitySelector, Input } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHero from '../../components/shop/PageHero.jsx';
import { EmptyState, Skeleton, Alert } from '../../components/ui/States.jsx';
import { inr } from '../../utils/format.js';
import { apiErrorMessage } from '../../services/api.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useToast } from '../../context/UIContext.jsx';
import { CHECKOUT_LOGIN_MESSAGE, loginUrlFor } from '../../utils/checkoutIntent.js';

export default function Cart() {
  useDocumentTitle('Shopping Bag', 'Review the pieces in your Vimuhet bag.');
  const { cart, updateItem, removeItem, moveToWishlist, applyCoupon, removeCoupon, pricing, loading, busyItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [couponState, setCouponState] = useState({ loading: false, error: '' });

  const items = cart.items || [];
  const progress = Math.min(100, Math.round(((pricing.subtotal || 0) / (pricing.freeShippingThreshold || 1999)) * 100));
  const remaining = Math.max(0, (pricing.freeShippingThreshold || 1999) - (pricing.subtotal || 0));

  const handleApply = async (e) => {
    e?.preventDefault();
    if (!code.trim()) return;
    setCouponState({ loading: true, error: '' });
    try {
      await applyCoupon(code.trim());
      setCode('');
      setCouponState({ loading: false, error: '' });
    } catch (err) {
      setCouponState({ loading: false, error: apiErrorMessage(err, 'This coupon could not be applied') });
    }
  };

  if (loading && !items.length) {
    return (
      <div className="container-page py-16">
        <Skeleton className="h-8 w-52" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <>
        <PageHero eyebrow="Shopping Bag" title="Your" accent="Shopping Bag" breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Shopping Bag' }]} compact />
        <div className="container-page py-14">
          <EmptyState
            icon={ShoppingBag}
            title="Your bag is empty"
            description="Beautiful things are waiting. Explore new arrivals and best sellers curated for you."
            action="Start shopping"
            actionTo="/shop"
            secondaryAction={{ label: 'View best sellers', to: '/best-sellers' }}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Shopping Bag"
        title="My Shopping"
        accent="Bag"
        description={`${cart.count} ${cart.count === 1 ? 'piece' : 'pieces'} ready to be yours.`}
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Shopping Bag' }]}
        compact
      />
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_380px] lg:gap-10">
        <div>
          {cart.warnings?.length > 0 && (
            <div className="mb-4 space-y-2">
              {cart.warnings.map((w, i) => (
                <Alert key={i} variant="warning">{w}</Alert>
              ))}
            </div>
          )}

          {/* Free shipping progress */}
          <div className="mb-5 rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] px-4 py-3.5">
            <p className="flex items-center gap-2 text-[12px] text-[var(--ink)]">
              <Truck size={14} className="text-[var(--accent)]" />
              {remaining > 0 ? (
                <>Add <strong>{inr(remaining)}</strong> more to unlock free shipping</>
              ) : (
                <span className="text-[#2F7A4D] dark:text-emerald-400">Free shipping unlocked on this order</span>
              )}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
              <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <ul className="divide-y divide-[var(--line-color)] border-y border-[var(--line-color)]">
            {items.map((item) => (
              <li key={item._id} className="flex gap-4 py-5">
                <Link to={`/product/${item.product.slug}`} className="shrink-0">
                  <img src={item.product.image} alt={item.product.name} className="h-32 w-24 rounded-lg object-cover sm:h-36 sm:w-28" loading="lazy" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/product/${item.product.slug}`} className="font-display text-[15px] leading-snug hover:text-[var(--accent)]">
                        {item.product.name}
                      </Link>
                      <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">
                        Size {item.size} · {item.color}
                      </p>
                      {item.available < item.quantity && <p className="mt-1 text-[11px] text-amber-600">Only {item.available} left</p>}
                    </div>
                    <button onClick={() => removeItem(item._id)} aria-label="Remove item" className="text-[var(--ink-muted)] transition hover:text-red-600" disabled={busyItem === item._id}>
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{inr(item.price)}</span>
                    {item.mrp > item.price && <span className="text-[11.5px] text-[var(--ink-muted)] line-through">{inr(item.mrp)}</span>}
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                    <QuantitySelector value={item.quantity} max={item.maxQuantity || 10} onChange={(q) => updateItem(item._id, q)} disabled={busyItem === item._id} size="sm" />
                    <div className="flex items-center gap-3">
                      <button onClick={() => moveToWishlist(item._id)} className="flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--ink-muted)] hover:text-[var(--accent)]">
                        <Heart size={12} /> Wishlist
                      </button>
                      <span className="text-sm font-semibold">{inr(item.lineTotal)}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" size="sm" to="/shop">
              Continue Shopping
            </Button>
            <p className="text-[11px] text-[var(--ink-muted)]">Prices and stock are recalculated at checkout.</p>
          </div>
        </div>

        {/* Order summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
            <h2 className="font-display text-xl">Order Summary</h2>

            <div className="mt-4 space-y-2.5 text-[13px]">
              <Row label={`Subtotal (${cart.count} items)`} value={inr(pricing.mrpTotal)} />
              {pricing.productDiscount > 0 && <Row label="Product discount" value={`− ${inr(pricing.productDiscount)}`} tone="green" />}
              {pricing.couponDiscount > 0 && (
                <Row
                  label={
                    <span className="flex items-center gap-1.5">
                      Coupon {pricing.couponCode}
                      <button onClick={() => removeCoupon()} className="text-[10px] uppercase tracking-[0.08em] text-[var(--accent)] hover:underline">remove</button>
                    </span>
                  }
                  value={`− ${inr(pricing.couponDiscount)}`}
                  tone="green"
                />
              )}
              <Row label="Shipping" value={pricing.shipping === 0 ? 'Free' : inr(pricing.shipping)} />
              <Row label="Includes GST" value={inr(pricing.tax)} muted />
              <div className="flex items-center justify-between border-t border-[var(--line-color)] pt-3 font-display text-lg">
                <span>Total</span>
                <span>{inr(pricing.total)}</span>
              </div>
            </div>

            <form onSubmit={handleApply} className="mt-5 border-t border-[var(--line-color)] pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                <Tag size={11} /> Have a coupon?
              </p>
              <div className="flex gap-2">
                <Input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setCouponState({ loading: false, error: '' }); }} placeholder="Enter code" aria-label="Coupon code" containerClass="flex-1" />
                <Button type="submit" variant="outline" size="md" loading={couponState.loading}>
                  Apply
                </Button>
              </div>
              {couponState.error && <p className="mt-2 text-[11.5px] text-red-600">{couponState.error}</p>}
              {pricing.couponDiscount > 0 && <p className="mt-2 text-[11.5px] text-[#2F7A4D] dark:text-emerald-400">You saved {inr(pricing.couponDiscount)} with {pricing.couponCode}</p>}
            </form>

            {user ? (
              <Button className="mt-5 w-full" size="lg" iconRight={ArrowRight} onClick={() => navigate('/checkout')}>
                Proceed to Checkout
              </Button>
            ) : (
              <div className="mt-5 rounded-xl border border-[var(--line-color)] bg-[var(--surface-sunken)] p-4">
                <p className="text-[12.5px] font-medium leading-relaxed text-[var(--ink)]">
                  {CHECKOUT_LOGIN_MESSAGE}
                </p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">
                  Your bag is saved — you can pick up right here after signing in.
                </p>
                <div className="mt-3.5 flex flex-col gap-2">
                  <Button
                    className="w-full"
                    size="lg"
                    iconRight={ArrowRight}
                    onClick={() => {
                      toast(CHECKOUT_LOGIN_MESSAGE, 'info');
                      navigate(loginUrlFor('/checkout', { intent: 'checkout' }));
                    }}
                  >
                    Log In
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    size="lg"
                    onClick={() => navigate(`/register?redirect=${encodeURIComponent('/checkout')}&intent=checkout`)}
                  >
                    Create Account
                  </Button>
                </div>
              </div>
            )}
            <p className="mt-3 text-center text-[10.5px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">Secure payments by Razorpay</p>
          </div>
        </aside>
      </div>
    </>
  );
}

const Row = ({ label, value, tone, muted }) => (
  <div className="flex items-center justify-between gap-3">
    <span className={muted ? 'text-[11.5px] text-[var(--ink-muted)]' : 'text-[var(--ink-muted)]'}>{label}</span>
    <span className={`${tone === 'green' ? 'text-[#2F7A4D] dark:text-emerald-400' : 'text-[var(--ink)]'} ${muted ? 'text-[11.5px]' : ''}`}>{value}</span>
  </div>
);
