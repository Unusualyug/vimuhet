import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Check, Clock, MapPin, Package, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { orderApi } from '../../services/endpoints.js';
import Button from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/States.jsx';
import { inr, formatDate } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function OrderSuccess() {
  useDocumentTitle('Order Confirmed', 'Thank you for your Vimuhet order.');
  const { orderId } = useParams();
  const { state } = useLocation();
  const [order, setOrder] = useState(state?.order || null);
  const [loading, setLoading] = useState(!state?.order);

  useEffect(() => {
    if (order) return;
    orderApi
      .detail(orderId)
      .then((res) => setOrder(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId, order]);

  if (loading) {
    return (
      <div className="container-page py-16">
        <Skeleton className="mx-auto h-64 w-full max-w-2xl rounded-2xl" />
      </div>
    );
  }

  const paid = order?.payment?.status === 'PAID';

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-6 text-center sm:p-9">
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${paid ? 'bg-[#2F7A4D]/12 text-[#2F7A4D] dark:text-emerald-400' : 'bg-amber-100 text-amber-700'}`}
          >
            {paid ? <Check size={28} strokeWidth={2.5} /> : <Clock size={26} />}
          </motion.span>
          <h1 className="mt-5 font-display text-[26px] leading-tight sm:text-[32px]">
            {paid ? 'Thank you — your order is confirmed' : 'Order received, payment pending'}
          </h1>
          <p className="mt-2 text-[13.5px] text-[var(--ink-muted)]">
            {paid
              ? 'We have started preparing your pieces with care. A confirmation email is on its way.'
              : 'We have not received payment confirmation for this order yet. You can retry the payment from your orders page.'}
          </p>

          <div className="mt-6 grid gap-3 rounded-xl bg-[var(--surface-sunken)] p-4 text-left sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">Order number</p>
              <p className="text-[13.5px] font-semibold">{order?.orderNumber}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">Amount {paid ? 'paid' : 'due'}</p>
              <p className="text-[13.5px] font-semibold">{inr(order?.pricing?.total)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">Payment status</p>
              <p className={`text-[13.5px] font-semibold ${paid ? 'text-[#2F7A4D] dark:text-emerald-400' : 'text-amber-700'}`}>
                {paid ? 'Verified & successful' : 'Pending verification'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">Expected delivery</p>
              <p className="text-[13.5px] font-semibold">{formatDate(order?.shipping?.estimatedDelivery)}</p>
            </div>
          </div>

          <div className="mt-5 space-y-2 text-left">
            {(order?.items || []).map((item) => (
              <div key={item._id} className="flex items-center gap-3 rounded-lg border border-[var(--line-color)] p-2.5">
                <img src={item.image} alt={item.name} className="h-14 w-11 rounded object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{item.name}</p>
                  <p className="text-[11px] text-[var(--ink-muted)]">Size {item.size} · {item.color} · Qty {item.quantity}</p>
                </div>
                <span className="text-[12.5px] font-semibold">{inr(item.total)}</span>
              </div>
            ))}
          </div>

          {order?.shippingAddress && (
            <div className="mt-4 rounded-xl border border-[var(--line-color)] p-4 text-left">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                <MapPin size={11} /> Delivery address
              </p>
              <p className="mt-1.5 text-[12.5px] font-medium">{order.shippingAddress.fullName}</p>
              <p className="text-[12px] leading-relaxed text-[var(--ink-muted)]">
                {[order.shippingAddress.house, order.shippingAddress.street, order.shippingAddress.area, order.shippingAddress.landmark].filter(Boolean).join(', ')},{' '}
                {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button to={`/account/orders/${orderId}`} icon={Truck} size="lg">
              Track Order
            </Button>
            <Button to="/shop" variant="outline" size="lg">
              Continue Shopping
            </Button>
          </div>

          {state?.sandbox && (
            <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-left text-[11px] leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <strong>Development mode:</strong> no live Razorpay keys are configured, so this payment was completed through the server's sandbox
              path. The signature verification, inventory commit and order creation you just went through are the same code paths used in
              production.
            </p>
          )}
          <p className="mt-4">
            <Link to="/faqs" className="text-[11px] uppercase tracking-[0.12em] text-[var(--accent)] hover:underline">
              Need help with this order?
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
