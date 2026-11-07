import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Package, ShoppingBag, Sparkles, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { orderApi } from '../../services/endpoints.js';
import { inr, formatDate } from '../../utils/format.js';
import { ORDER_STATUS_LABELS } from '../../constants/index.js';
import Button from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/States.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function Dashboard() {
  useDocumentTitle('Account Dashboard', 'Your Vimuhet account overview.');
  const { user } = useAuth();
  const { wishlistCount } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi
      .mine({ limit: 3 })
      .then((res) => setOrders(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Total Orders', value: user?.stats?.orders ?? orders.length, icon: Package },
    { label: 'Wishlist', value: wishlistCount, icon: Heart, to: '/wishlist' },
    { label: 'Total Spent', value: inr(user?.stats?.spent || 0), icon: Wallet },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl">Welcome Back, {user?.fullName.split(' ')[0]}!</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">Here is your shopping overview.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => {
          const Wrapper = s.to ? Link : 'div';
          return (
            <Wrapper key={s.label} {...(s.to ? { to: s.to } : {})} className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5 transition hover:border-[var(--accent)]/50">
              <div className="flex items-center justify-between">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">{s.label}</p>
                <s.icon size={15} className="text-[var(--accent)]" />
              </div>
              <p className="mt-2 font-display text-[26px] leading-none">{s.value}</p>
            </Wrapper>
          );
        })}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl">Recent Orders</h3>
          <Link to="/account/orders" className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)] hover:underline">
            View All <ArrowRight size={11} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line-color)] px-6 py-10 text-center">
            <ShoppingBag size={22} className="mx-auto text-[var(--ink-muted)]" />
            <p className="mt-3 font-display text-lg">No orders yet</p>
            <p className="mt-1 text-[12.5px] text-[var(--ink-muted)]">Your first Vimuhet piece is waiting.</p>
            <Button to="/shop" size="sm" className="mt-4">Start shopping</Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li key={o._id}>
                <Link to={`/account/orders/${o._id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-3 transition hover:border-[var(--accent)]/50">
                  <img src={o.items[0]?.image} alt="" className="h-16 w-12 rounded-lg object-cover" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold">Order #{o.orderNumber}</p>
                    <p className="mt-0.5 text-[11.5px] text-[var(--ink-muted)]">
                      {formatDate(o.createdAt)} · {o.items.length} {o.items.length === 1 ? 'item' : 'items'} · {inr(o.pricing.total)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] ${statusTone(o.status)}`}>
                    {ORDER_STATUS_LABELS[o.status] || o.status}
                  </span>
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">Track</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Promo */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#521021] via-[#78152F] to-[#3d101d] p-6 text-[#FFF9F3]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-[#D9A5A5]/25" />
        <Sparkles size={18} className="text-[#D9A5A5]" />
        <p className="mt-2 font-display text-xl">Special Offers, Just for You</p>
        <p className="mt-1 max-w-sm text-[12.5px] text-[#F7E2DF]/80">Members get early access to new edits and private sales.</p>
        <Button to="/shop?onSale=true" size="sm" className="mt-4 bg-[#FFF9F3] text-[#3d101d] hover:bg-white">
          Shop Now
        </Button>
      </div>
    </div>
  );
}

export const statusTone = (status) => {
  if (['DELIVERED'].includes(status)) return 'bg-[#2F7A4D]/12 text-[#2F7A4D] dark:text-emerald-400';
  if (['CANCELLED', 'RETURNED', 'REFUNDED'].includes(status)) return 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300';
  if (['SHIPPED', 'OUT_FOR_DELIVERY'].includes(status)) return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300';
  if (['RETURN_REQUESTED'].includes(status)) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
  return 'bg-[var(--accent-soft)] text-[var(--accent)]';
};
