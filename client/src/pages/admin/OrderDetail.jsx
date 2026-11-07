import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CreditCard, Download, MapPin, Printer, Receipt, RotateCcw, Truck, User, X } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { Panel, StatusPill, orderTone, paymentTone } from '../../components/admin/AdminUI.jsx';
import { Skeleton, ErrorState, Alert } from '../../components/ui/States.jsx';
import { Modal, ConfirmDialog } from '../../components/ui/Modal.jsx';
import { Input, Select, Textarea } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { inr, formatDate, formatDateTime, initials } from '../../utils/format.js';
import { ORDER_STATUS_LABELS, ORDER_TIMELINE } from '../../constants/index.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const NEXT_STATUSES = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED'],
  RETURNED: ['REFUNDED'],
};

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can } = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: '', note: '', courier: '', trackingNumber: '', trackingUrl: '' });
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '' });
  const [cancelReason, setCancelReason] = useState('');
  useDocumentTitle(data ? `Order ${data.order.orderNumber}` : 'Order Details');

  const load = () => {
    setLoading(true);
    adminApi
      .order(id)
      .then((res) => {
        setData(res.data);
        setRefundForm({ amount: String(res.data.order.pricing.total), reason: '' });
        setError('');
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load this order')))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const changeStatus = async () => {
    if (!statusForm.status) return toast('Choose a new status', 'error');
    setBusy(true);
    try {
      await adminApi.updateOrderStatus(id, statusForm);
      toast('Order status updated');
      setStatusOpen(false);
      setStatusForm({ status: '', note: '', courier: '', trackingNumber: '', trackingUrl: '' });
      load();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not update the status'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const refund = async () => {
    setBusy(true);
    try {
      const res = await adminApi.refundOrder(id, { amount: Number(refundForm.amount), reason: refundForm.reason || 'Admin refund' });
      toast(`Refund of ${inr(res.data.amount)} processed`);
      setRefundOpen(false);
      load();
    } catch (err) {
      toast(apiErrorMessage(err, 'Refund failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await adminApi.cancelOrder(id, cancelReason || 'Cancelled by admin');
      toast('Order cancelled — stock restored');
      setCancelOpen(false);
      load();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const downloadInvoice = async () => {
    try {
      const res = await adminApi.invoice(id);
      const { order, store } = res.data;
      const win = window.open('', '_blank');
      if (!win) return toast('Allow pop-ups to print the invoice', 'error');
      win.document.write(`<!doctype html><html><head><title>Invoice ${order.orderNumber}</title>
        <style>body{font-family:Inter,Arial,sans-serif;padding:40px;color:#282323;font-size:13px}
        h1{font-family:Georgia,serif;font-size:22px;margin:0 0 2px}
        table{width:100%;border-collapse:collapse;margin-top:18px}
        th,td{text-align:left;padding:8px;border-bottom:1px solid #E9DAD0;font-size:12px}
        .right{text-align:right}.muted{color:#756A66}.total{font-weight:600;font-size:14px}</style></head><body>
        <h1>${store.name}</h1><p class="muted">${store.email} · ${store.phone || ''}</p>
        <h2 style="font-size:15px;margin-top:26px">Invoice ${res.data.invoiceNumber}</h2>
        <p class="muted">Order ${order.orderNumber} · ${formatDate(order.createdAt)}<br/>${order.customer.fullName} · ${order.customer.email}<br/>
        ${[order.shippingAddress?.house, order.shippingAddress?.street, order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.pincode].filter(Boolean).join(', ')}</p>
        <table><thead><tr><th>Item</th><th>Size</th><th>Qty</th><th class="right">Amount</th></tr></thead><tbody>
        ${order.items.map((i) => `<tr><td>${i.name}</td><td>${i.size} / ${i.color}</td><td>${i.quantity}</td><td class="right">${inr(i.total)}</td></tr>`).join('')}
        </tbody></table>
        <table style="width:280px;margin-left:auto">
        <tr><td class="muted">Subtotal</td><td class="right">${inr(order.pricing.subtotal)}</td></tr>
        <tr><td class="muted">Discount</td><td class="right">- ${inr((order.pricing.productDiscount || 0) + (order.pricing.couponDiscount || 0))}</td></tr>
        <tr><td class="muted">Shipping</td><td class="right">${inr(order.pricing.shipping)}</td></tr>
        <tr><td class="total">Total</td><td class="right total">${inr(order.pricing.total)}</td></tr></table>
        <p class="muted" style="margin-top:26px">GST included: ${inr(order.pricing.tax)} · Payment: ${order.payment?.status}</p>
        </body></html>`);
      win.document.close();
      win.print();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not generate the invoice'), 'error');
    }
  };

  if (loading) return <Skeleton className="h-[520px] w-full rounded-xl" />;
  if (error || !data) return <ErrorState message={error} onRetry={load} />;

  const { order, payments } = data;
  const nextStatuses = NEXT_STATUSES[order.status] || [];
  const timelineIndex = ORDER_TIMELINE.indexOf(order.status);
  const canRefund = can('payments:refund') && order.payment?.status === 'PAID';
  const refundable = Math.max(0, (order.pricing.total || 0) - (payments?.reduce((s, p) => s + (p.refundedAmount || 0), 0) || 0));

  return (
    <div>
      <AdminPageHeader
        title={`Order #${order.orderNumber}`}
        subtitle={`${formatDateTime(order.createdAt)} · ${order.items.length} item${order.items.length > 1 ? 's' : ''} · ${inr(order.pricing.total)}`}
        breadcrumb="Order details"
        actions={
          <>
            <Button to="/admin/orders" variant="outline" size="sm" icon={ArrowLeft}>Orders</Button>
            <Button variant="outline" size="sm" icon={Printer} onClick={downloadInvoice}>Invoice</Button>
            {nextStatuses.length > 0 && can('orders:write') && (
              <Button size="sm" onClick={() => { setStatusForm({ ...statusForm, status: nextStatuses[0] }); setStatusOpen(true); }} icon={Truck}>
                Update status
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill tone={orderTone(order.status)}>{ORDER_STATUS_LABELS[order.status]}</StatusPill>
        <StatusPill tone={paymentTone(order.payment?.status)}>Payment {order.payment?.status}</StatusPill>
        {order.payment?.verifiedAt && <span className="text-[11px] text-[var(--ink-muted)]">Verified {formatDateTime(order.payment.verifiedAt)}</span>}
        {order.couponCode || order.pricing.couponCode ? <StatusPill tone="accent">Coupon {order.pricing.couponCode}</StatusPill> : null}
        {order.isDemo && <StatusPill tone="neutral">Demo data</StatusPill>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Panel title="Items" subtitle={`${order.items.length} line items`} padded={false}>
            <ul className="divide-y divide-[var(--line-color)]">
              {order.items.map((item) => (
                <li key={item._id} className="flex flex-wrap items-center gap-3 p-3">
                  {item.image && <img src={item.image} alt="" className="h-16 w-12 rounded-lg object-cover" loading="lazy" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-[var(--ink)]">{item.name}</p>
                    <p className="text-[11px] text-[var(--ink-muted)]">
                      Size {item.size} · {item.color} · Qty {item.quantity} · {inr(item.price)} each
                    </p>
                    <p className="font-mono text-[10px] text-[var(--ink-muted)]">{item.sku}</p>
                  </div>
                  <span className="text-[12.5px] font-semibold text-[var(--ink)]">{inr(item.total)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1.5 border-t border-[var(--line-color)] p-3 text-[12px]">
              <div className="flex justify-between text-[var(--ink-muted)]"><span>Subtotal</span><span>{inr(order.pricing.subtotal)}</span></div>
              {order.pricing.productDiscount > 0 && <div className="flex justify-between text-[#2F7A4D] dark:text-emerald-400"><span>Product discount</span><span>− {inr(order.pricing.productDiscount)}</span></div>}
              {order.pricing.couponDiscount > 0 && <div className="flex justify-between text-[#2F7A4D] dark:text-emerald-400"><span>Coupon {order.pricing.couponCode}</span><span>− {inr(order.pricing.couponDiscount)}</span></div>}
              <div className="flex justify-between text-[var(--ink-muted)]"><span>Shipping</span><span>{order.pricing.shipping === 0 ? 'Free' : inr(order.pricing.shipping)}</span></div>
              <div className="flex justify-between text-[var(--ink-muted)]"><span>GST (included)</span><span>{inr(order.pricing.tax)}</span></div>
              <div className="flex justify-between border-t border-[var(--line-color)] pt-2 font-display text-[15px]"><span>Total</span><span>{inr(order.pricing.total)}</span></div>
            </div>
          </Panel>

          <Panel title="Status Timeline">
            <ol className="space-y-3">
              {(order.statusHistory || []).map((h, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[9.5px] font-semibold text-[var(--accent)]">
                    <Check size={11} />
                  </span>
                  <div>
                    <p className="text-[12px] font-medium text-[var(--ink)]">{ORDER_STATUS_LABELS[h.status] || h.status}</p>
                    <p className="text-[10.5px] text-[var(--ink-muted)]">{formatDateTime(h.at)} · {h.by || 'system'}{h.note ? ` · ${h.note}` : ''}</p>
                  </div>
                </li>
              ))}
              {!(order.statusHistory || []).length && <li className="text-[12px] text-[var(--ink-muted)]">No status changes recorded yet</li>}
            </ol>
            {timelineIndex >= 0 && (
              <div className="mt-4 flex gap-1">
                {ORDER_TIMELINE.map((s, i) => (
                  <span key={s} className={`h-1 flex-1 rounded-full ${timelineIndex >= i ? 'bg-[#2F7A4D]' : 'bg-[var(--line-color)]'}`} title={ORDER_STATUS_LABELS[s]} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Payments" subtitle="Gateway references and refunds" padded={false}>
            {payments.length === 0 ? (
              <p className="p-4 text-[12px] text-[var(--ink-muted)]">No payment records attached to this order.</p>
            ) : (
              <ul className="divide-y divide-[var(--line-color)]">
                {payments.map((p) => (
                  <li key={p._id} className="flex flex-wrap items-center gap-3 p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-sunken)] text-[var(--ink-muted)]">
                      <CreditCard size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-[var(--ink)]">{inr(p.amount)} · {p.method || 'Razorpay'}</p>
                      <p className="truncate font-mono text-[10px] text-[var(--ink-muted)]">{p.razorpayPaymentId || p.razorpayOrderId || '—'}</p>
                      <p className="text-[10px] text-[var(--ink-muted)]">{formatDateTime(p.createdAt)}{p.signatureVerified ? ' · signature verified' : ''}</p>
                    </div>
                    <StatusPill tone={paymentTone(p.status)}>{p.status}</StatusPill>
                    <Link to={`/admin/payments/${p._id}`} className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)] hover:underline">Open</Link>
                  </li>
                ))}
              </ul>
            )}
            {payments.some((p) => p.refunds?.length) && (
              <div className="border-t border-[var(--line-color)] p-3">
                <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">Refunds</p>
                <ul className="space-y-1">
                  {payments.flatMap((p) => (p.refunds || []).map((r) => (
                    <li key={r._id} className="flex justify-between text-[11.5px] text-[var(--ink-muted)]">
                      <span>{inr(r.amount)} · {r.reason || 'Refund'} · {r.status}</span>
                      <span>{formatDate(r.at)}</span>
                    </li>
                  )))}
                </ul>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Customer">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[11px] font-semibold text-[var(--accent)]">
                {initials(order.customer?.fullName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-[var(--ink)]">{order.customer?.fullName}</p>
                <p className="truncate text-[10.5px] text-[var(--ink-muted)]">{order.customer?.email}</p>
              </div>
            </div>
            <p className="mt-2 text-[11.5px] text-[var(--ink-muted)]">{order.customer?.mobile}</p>
            {order.user && (
              <Link to={`/admin/customers/${order.user._id || order.user}`} className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)] hover:underline">
                <User size={11} /> View customer profile
              </Link>
            )}
          </Panel>

          <Panel title="Shipping Address">
            <p className="text-[12.5px] font-medium text-[var(--ink)]">{order.shippingAddress?.fullName}</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">
              {[order.shippingAddress?.house, order.shippingAddress?.street, order.shippingAddress?.area, order.shippingAddress?.landmark].filter(Boolean).join(', ')},{' '}
              {order.shippingAddress?.city}, {order.shippingAddress?.state} — {order.shippingAddress?.pincode}
            </p>
            <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">{order.shippingAddress?.mobile}</p>
            {order.shipping?.trackingNumber ? (
              <div className="mt-3 rounded-lg bg-[var(--surface-sunken)] p-2.5">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">Tracking</p>
                <p className="text-[11.5px] text-[var(--ink)]">{order.shipping.courier} · {order.shipping.trackingNumber}</p>
              </div>
            ) : null}
            {order.shipping?.estimatedDelivery && <p className="mt-2 text-[11px] text-[var(--ink-muted)]">ETA {formatDate(order.shipping.estimatedDelivery)}</p>}
          </Panel>

          <Panel title="Actions">
            <div className="space-y-2">
              {nextStatuses.length > 0 && can('orders:write') && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setStatusOpen(true)} icon={Truck}>
                  Change status
                </Button>
              )}
              {canRefund && refundable > 0 && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setRefundOpen(true)} icon={RotateCcw}>
                  Issue refund ({inr(refundable)})
                </Button>
              )}
              {can('orders:write') && !['CANCELLED', 'DELIVERED', 'REFUNDED', 'RETURNED'].includes(order.status) && (
                <Button variant="danger" size="sm" className="w-full" onClick={() => setCancelOpen(true)} icon={X}>
                  Cancel order
                </Button>
              )}
              <Button variant="ghost" size="sm" className="w-full" onClick={downloadInvoice} icon={Receipt}>
                Download invoice
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/admin/orders')} icon={Download}>
                Back to order list
              </Button>
            </div>
          </Panel>

          {order.cancelReason && (
            <Alert variant="warning" title="Cancellation reason">{order.cancelReason}</Alert>
          )}
          {order.returnReason && (
            <Alert variant="info" title="Return reason">{order.returnReason}</Alert>
          )}
          {order.notes && (
            <Panel title="Internal notes">
              <p className="text-[11.5px] leading-relaxed text-[var(--ink-muted)]">{order.notes}</p>
            </Panel>
          )}
        </div>
      </div>

      <Modal open={statusOpen} onClose={() => setStatusOpen(false)} title="Update order status" size="sm">
        <div className="space-y-4">
          <Select
            label="New status"
            options={nextStatuses.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] || s }))}
            value={statusForm.status}
            onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
          />
          {statusForm.status === 'SHIPPED' && (
            <>
              <Input label="Courier" value={statusForm.courier} onChange={(e) => setStatusForm({ ...statusForm, courier: e.target.value })} placeholder="e.g. Delhivery" />
              <Input label="Tracking number" value={statusForm.trackingNumber} onChange={(e) => setStatusForm({ ...statusForm, trackingNumber: e.target.value })} />
              <Input label="Tracking URL" value={statusForm.trackingUrl} onChange={(e) => setStatusForm({ ...statusForm, trackingUrl: e.target.value })} placeholder="https://…" />
            </>
          )}
          <Textarea label="Note (optional)" rows={2} value={statusForm.note} onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })} placeholder="Visible to the customer in the order timeline" />
          <Button className="w-full" onClick={changeStatus} loading={busy}>Save status</Button>
        </div>
      </Modal>

      <Modal open={refundOpen} onClose={() => setRefundOpen(false)} title="Issue refund" size="sm">
        <div className="space-y-4">
          <p className="text-[12px] leading-relaxed text-[var(--ink-muted)]">
            Refunds are processed through Razorpay to the original payment method. Maximum refundable amount is {inr(refundable)}.
          </p>
          <Input label="Amount (₹)" type="number" min={1} max={refundable} value={refundForm.amount} onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })} />
          <Textarea label="Reason" rows={2} value={refundForm.reason} onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })} placeholder="Internal reason for this refund" />
          <Button className="w-full" variant="danger" onClick={refund} loading={busy}>Process refund</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={cancel}
        loading={busy}
        title="Cancel this order?"
        message="Reserved stock is released and the coupon usage is returned. Any captured payment must be refunded separately."
        confirmLabel="Cancel order"
      />
    </div>
  );
}
