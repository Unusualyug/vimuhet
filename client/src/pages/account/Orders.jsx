import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Download, MapPin, Package, Truck } from 'lucide-react';
import { orderApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../context/UIContext.jsx';
import { inr, formatDate, formatDateTime } from '../../utils/format.js';
import { ORDER_STATUS_LABELS, ORDER_TIMELINE } from '../../constants/index.js';
import Button from '../../components/ui/Button.jsx';
import { Skeleton, ErrorState, EmptyState } from '../../components/ui/States.jsx';
import { Tabs } from '../../components/ui/Accordion.jsx';
import { Modal, ConfirmDialog } from '../../components/ui/Modal.jsx';
import { Textarea } from '../../components/ui/Field.jsx';
import { statusTone } from './Dashboard.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING,CONFIRMED,PROCESSING,PACKED', label: 'Processing' },
  { value: 'SHIPPED,OUT_FOR_DELIVERY', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURN_REQUESTED,RETURNED,REFUNDED', label: 'Returned' },
];

export function Orders() {
  useDocumentTitle('My Orders', 'Track and manage your Vimuhet orders.');
  const [status, setStatus] = useState('ALL');
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    orderApi
      .mine({ status, limit: 20 })
      .then((res) => {
        if (!alive) return;
        setOrders(res.data || []);
        setMeta(res.meta || null);
      })
      .catch(() => alive && setOrders([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [status]);

  return (
    <div>
      <h2 className="font-display text-2xl">My Orders</h2>
      <div className="mt-4">
        <Tabs
          tabs={FILTERS.map((f) => ({
            ...f,
            count: f.value === 'ALL' ? undefined : undefined,
          }))}
          value={status}
          onChange={setStatus}
        />
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders in this view"
            description="When you place an order it will appear here with live tracking."
            action="Start shopping"
            actionTo="/shop"
          />
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o._id} className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-color)] px-4 py-3">
                  <div>
                    <p className="text-[12.5px] font-semibold">Order #{o.orderNumber}</p>
                    <p className="text-[11px] text-[var(--ink-muted)]">Placed {formatDate(o.createdAt)} · {o.payment?.method || '—'} · {inr(o.pricing.total)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] ${statusTone(o.status)}`}>
                    {ORDER_STATUS_LABELS[o.status] || o.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="flex gap-1.5">
                    {o.items.slice(0, 3).map((item) => (
                      <img key={item._id} src={item.image} alt={item.name} className="h-16 w-12 rounded-lg object-cover" loading="lazy" />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px]">{o.items.map((i) => i.name).join(', ')}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">{o.items.length} {o.items.length === 1 ? 'item' : 'items'}</p>
                  </div>
                  <Button to={`/account/orders/${o._id}`} variant="outline" size="sm">
                    View details
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function OrderDetail() {
  const { orderId } = useParams();
  const { toast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useDocumentTitle(order ? `Order ${order.orderNumber}` : 'Order Details');

  const load = () => {
    setLoading(true);
    orderApi
      .detail(orderId)
      .then((res) => setOrder(res.data))
      .catch((err) => setError(apiErrorMessage(err, 'Order not found')))
      .finally(() => setLoading(false));
  };

  useEffect(load, [orderId]);

  const doAction = async (type) => {
    setBusy(true);
    try {
      if (type === 'cancel') await orderApi.cancel(orderId, reason);
      else await orderApi.requestReturn(orderId, reason);
      toast(type === 'cancel' ? 'Order cancelled' : 'Return requested — our team will be in touch');
      setCancelOpen(false);
      setReturnOpen(false);
      setReason('');
      load();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not complete this action'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }
  if (error || !order) return <ErrorState title="Order unavailable" message={error} onRetry={load} />;

  const timelineIndex = ORDER_TIMELINE.indexOf(order.status);
  const canCancel = ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status);
  const canReturn = order.status === 'DELIVERED';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/account/orders" className="mb-1 inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.12em] text-[var(--ink-muted)] hover:text-[var(--accent)]">
            <ArrowLeft size={11} /> All orders
          </Link>
          <h2 className="font-display text-2xl">Order #{order.orderNumber}</h2>
          <p className="text-[12px] text-[var(--ink-muted)]">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCancel && (
            <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}>Cancel order</Button>
          )}
          {canReturn && (
            <Button variant="outline" size="sm" onClick={() => setReturnOpen(true)}>Request return</Button>
          )}
          <Button variant="subtle" size="sm" onClick={() => window.print()} icon={Download}>Invoice</Button>
        </div>
      </div>

      {/* Tracking timeline */}
      {!['CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'].includes(order.status) && (
        <div className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              <Truck size={12} /> Tracking
            </h3>
            {order.shipping?.trackingNumber && (
              <p className="text-[11px] text-[var(--ink-muted)]">
                {order.shipping.courier} · <span className="font-medium text-[var(--ink)]">{order.shipping.trackingNumber}</span>
              </p>
            )}
          </div>
          <ol className="mt-5 grid gap-4 sm:grid-cols-4">
            {ORDER_TIMELINE.slice(0, 5).map((step, i) => {
              const done = timelineIndex >= i;
              return (
                <li key={step} className="relative flex flex-col items-start gap-1.5">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] ${done ? 'bg-[#2F7A4D] text-white' : 'border border-[var(--line-color)] text-[var(--ink-muted)]'}`}>
                    {done ? <Check size={12} strokeWidth={3} /> : i + 1}
                  </span>
                  <p className={`text-[11.5px] font-medium ${done ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'}`}>{ORDER_STATUS_LABELS[step]}</p>
                  {order.statusHistory?.find((h) => h.status === step) && (
                    <p className="text-[10px] text-[var(--ink-muted)]">{formatDate(order.statusHistory.find((h) => h.status === step).at)}</p>
                  )}
                </li>
              );
            })}
          </ol>
          {order.shipping?.estimatedDelivery && (
            <p className="mt-4 rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-[11.5px] text-[var(--ink-muted)]">
              Estimated delivery: <strong className="text-[var(--ink)]">{formatDate(order.shipping.estimatedDelivery)}</strong>
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Items</h3>
          <ul className="mt-3 divide-y divide-[var(--line-color)]">
            {order.items.map((item) => (
              <li key={item._id} className="flex gap-3 py-3">
                <img src={item.image} alt={item.name} className="h-20 w-16 rounded-lg object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <Link to={`/product/${item.slug}`} className="text-[13px] font-medium hover:text-[var(--accent)]">{item.name}</Link>
                  <p className="mt-0.5 text-[11.5px] text-[var(--ink-muted)]">Size {item.size} · {item.color} · Qty {item.quantity}</p>
                  <p className="mt-1 text-[12px] font-semibold">{inr(item.total)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1.5 border-t border-[var(--line-color)] pt-3 text-[12.5px]">
            <div className="flex justify-between text-[var(--ink-muted)]"><span>Subtotal</span><span>{inr(order.pricing.subtotal)}</span></div>
            {order.pricing.couponDiscount > 0 && (
              <div className="flex justify-between text-[#2F7A4D] dark:text-emerald-400"><span>Coupon {order.pricing.couponCode}</span><span>− {inr(order.pricing.couponDiscount)}</span></div>
            )}
            <div className="flex justify-between text-[var(--ink-muted)]"><span>Shipping</span><span>{order.pricing.shipping === 0 ? 'Free' : inr(order.pricing.shipping)}</span></div>
            <div className="flex items-center justify-between border-t border-[var(--line-color)] pt-2 font-display text-base">
              <span>Total</span><span>{inr(order.pricing.total)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              <MapPin size={12} /> Shipping address
            </h3>
            <p className="mt-2 text-[12.5px] font-medium">{order.shippingAddress?.fullName}</p>
            <p className="text-[12px] leading-relaxed text-[var(--ink-muted)]">
              {[order.shippingAddress?.house, order.shippingAddress?.street, order.shippingAddress?.area, order.shippingAddress?.landmark].filter(Boolean).join(', ')},{' '}
              {order.shippingAddress?.city}, {order.shippingAddress?.state} — {order.shippingAddress?.pincode}
            </p>
            <p className="mt-1 text-[12px] text-[var(--ink-muted)]">{order.shippingAddress?.mobile}</p>
          </div>

          <div className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Payment</h3>
            <dl className="mt-2 space-y-1.5 text-[12px]">
              <div className="flex justify-between"><dt className="text-[var(--ink-muted)]">Status</dt><dd className="font-medium">{order.payment?.status}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--ink-muted)]">Method</dt><dd>{order.payment?.method || '—'}</dd></div>
              {order.payment?.razorpayPaymentId && (
                <div className="flex items-start justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Reference</dt>
                  <dd className="max-w-[60%] break-all text-right text-[11px]">{order.payment.razorpayPaymentId}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Status history</h3>
            <ul className="mt-2 space-y-2">
              {[...(order.statusHistory || [])].reverse().map((h, i) => (
                <li key={i} className="text-[11.5px]">
                  <p className="font-medium text-[var(--ink)]">{ORDER_STATUS_LABELS[h.status] || h.status}</p>
                  <p className="text-[var(--ink-muted)]">{formatDateTime(h.at)} {h.note ? `· ${h.note}` : ''}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => doAction('cancel')}
        loading={busy}
        title="Cancel this order?"
        message="Cancelled orders cannot be reinstated. If you have already paid, the refund is initiated automatically."
        confirmLabel="Cancel order"
      />

      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title="Request a return" size="sm">
        <p className="text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
          Returns are accepted within 7 days of delivery for unused pieces with tags intact. Tell us briefly why so we can help faster.
        </p>
        <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-3" placeholder="e.g. size did not fit" />
        <Button className="mt-4 w-full" onClick={() => doAction('return')} loading={busy}>
          Submit return request
        </Button>
      </Modal>
    </div>
  );
}
