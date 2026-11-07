import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { Drawer } from './ui/Modal.jsx';
import { useCart } from '../context/CartContext.jsx';
import { QuantitySelector } from './ui/Field.jsx';
import { inr } from '../utils/format.js';
import Button from './ui/Button.jsx';

export default function CartDrawer({ onCheckout }) {
  const { cart, drawerOpen, setDrawerOpen, updateItem, removeItem, pricing, busyItem } = useCart();
  const items = cart.items || [];

  const freeShippingRemaining = Math.max(0, (pricing.freeShippingThreshold || 1999) - pricing.subtotal);
  const progress = Math.min(100, Math.round(((pricing.subtotal || 0) / (pricing.freeShippingThreshold || 1999)) * 100));

  return (
    <Drawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      title={`Your Bag${items.length ? ` (${cart.count})` : ''}`}
      footer={
        items.length ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--ink-muted)]">Subtotal</span>
              <span className="font-semibold">{inr(pricing.subtotal)}</span>
            </div>
            {pricing.couponDiscount > 0 && (
              <div className="flex items-center justify-between text-sm text-[#2F7A4D]">
                <span>Coupon {pricing.couponCode}</span>
                <span>− {inr(pricing.couponDiscount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--ink-muted)]">Shipping</span>
              <span>{pricing.shipping === 0 ? 'Free' : inr(pricing.shipping)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--line-color)] pt-3 font-display text-lg">
              <span>Total</span>
              <span>{inr(pricing.total)}</span>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                setDrawerOpen(false);
                onCheckout?.();
              }}
              iconRight={ArrowRight}
            >
              Proceed to Checkout
            </Button>
            <Link to="/cart" onClick={() => setDrawerOpen(false)} className="block text-center text-[11px] uppercase tracking-[0.14em] text-[var(--ink-muted)] hover:text-[var(--accent)]">
              View full bag
            </Link>
          </div>
        ) : null
      }
    >
      {items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-[var(--ink-muted)]">
            <ShoppingBag size={24} strokeWidth={1.5} />
          </div>
          <p className="font-display text-xl">Your bag is empty</p>
          <p className="mt-1.5 max-w-[240px] text-sm text-[var(--ink-muted)]">Discover pieces crafted to make every moment beautiful.</p>
          <Button to="/shop" size="sm" className="mt-6" onClick={() => setDrawerOpen(false)}>
            Start shopping
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {freeShippingRemaining > 0 ? (
            <div className="rounded-xl bg-[var(--surface-sunken)] px-3.5 py-3">
              <p className="text-[11.5px] text-[var(--ink)]">
                You are <strong>{inr(freeShippingRemaining)}</strong> away from free shipping
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line-color)]">
                <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-[#2F7A4D]/10 px-3.5 py-2.5 text-[11.5px] text-[#2F7A4D] dark:text-emerald-400">
              🎉 You have unlocked free shipping
            </p>
          )}

          {items.map((item) => (
            <div key={item._id} className="flex gap-3 border-b border-[var(--line-color)] pb-4 last:border-0">
              <Link to={`/product/${item.product.slug}`} onClick={() => setDrawerOpen(false)} className="shrink-0">
                <img src={item.product.image} alt={item.product.name} className="h-24 w-[74px] rounded-lg object-cover" loading="lazy" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/product/${item.product.slug}`} onClick={() => setDrawerOpen(false)} className="line-clamp-2 text-[13px] font-medium leading-snug hover:text-[var(--accent)]">
                    {item.product.name}
                  </Link>
                  <button onClick={() => removeItem(item._id)} aria-label="Remove item" className="text-[var(--ink-muted)] transition hover:text-red-600">
                    ×
                  </button>
                </div>
                <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
                  {item.size} · {item.color}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <QuantitySelector size="sm" value={item.quantity} max={item.maxQuantity || 10} onChange={(q) => updateItem(item._id, q)} disabled={busyItem === item._id} />
                  <span className="text-[13px] font-semibold">{inr(item.lineTotal)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
