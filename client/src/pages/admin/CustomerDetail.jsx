import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle2, Mail, MapPin, Phone, Star } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { Panel, StatusPill, orderTone } from '../../components/admin/AdminUI.jsx';
import { Skeleton, ErrorState } from '../../components/ui/States.jsx';
import { Rating } from '../../components/ui/Rating.jsx';
import Button from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { inr, formatDate, formatDateTime, initials } from '../../utils/format.js';
import { ORDER_STATUS_LABELS } from '../../constants/index.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function AdminCustomerDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  useDocumentTitle(data ? data.customer.fullName : 'Customer Details');

  const load = () => {
    setLoading(true);
    adminApi
      .customer(id)
      .then((res) => {
        setData(res.data);
        setError('');
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load this customer')))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const toggleBlock = async () => {
    setBusy(true);
    try {
      await adminApi.toggleCustomer(id);
      toast(data.customer.isBlocked ? 'Customer unblocked' : 'Customer blocked');
      setConfirmBlock(false);
      load();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Skeleton className="h-[420px] w-full rounded-xl" />;
  if (error || !data) return <ErrorState message={error} onRetry={load} />;

  const { customer, orders = [], reviews = [] } = data;
  const spent = customer.stats?.spent || orders.filter((o) => o.payment?.status === 'PAID').reduce((s, o) => s + (o.pricing?.total || 0), 0);
  const aov = orders.length ? Math.round(spent / orders.length) : 0;

  return (
    <div>
      <AdminPageHeader
        title={customer.fullName}
        subtitle={customer.email}
        breadcrumb="Customer details"
        actions={
          <>
            <Button to="/admin/customers" variant="outline" size="sm" icon={ArrowLeft}>Customers</Button>
            <Button variant={customer.isBlocked ? 'primary' : 'danger'} size="sm" icon={customer.isBlocked ? CheckCircle2 : Ban} onClick={() => setConfirmBlock(true)}>
              {customer.isBlocked ? 'Unblock customer' : 'Block customer'}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1.5fr]">
        <div className="space-y-4">
          <Panel title="Profile">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-[15px] font-semibold text-white dark:text-[#1a1113]">
                {initials(customer.fullName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-[var(--ink)]">{customer.fullName}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <StatusPill tone={customer.isBlocked ? 'red' : 'green'}>{customer.isBlocked ? 'Blocked' : 'Active'}</StatusPill>
                  {customer.isEmailVerified && <StatusPill tone="blue">Email verified</StatusPill>}
                </div>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-[12px]">
              <li className="flex items-center gap-2 text-[var(--ink-muted)]"><Mail size={12} /> {customer.email}</li>
              <li className="flex items-center gap-2 text-[var(--ink-muted)]"><Phone size={12} /> {customer.mobile || 'Not provided'}</li>
              <li className="flex items-center gap-2 text-[var(--ink-muted)]"><MapPin size={12} /> {customer.addresses?.length || 0} saved address(es)</li>
              <li className="flex items-center gap-2 text-[var(--ink-muted)]"><Star size={12} /> Joined {formatDate(customer.createdAt)}</li>
            </ul>
            {customer.addresses?.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-[var(--line-color)] pt-3">
                {customer.addresses.slice(0, 2).map((a) => (
                  <div key={a._id} className="rounded-lg bg-[var(--surface-sunken)] p-2.5 text-[11px] text-[var(--ink-muted)]">
                    <p className="font-medium text-[var(--ink)]">{a.label} {a.isDefault ? '(default)' : ''}</p>
                    <p className="mt-0.5 leading-relaxed">{[a.house, a.street, a.area, a.city, a.state, a.pincode].filter(Boolean).join(', ')}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Spend Summary">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Orders', orders.length],
                ['Lifetime', inr(spent)],
                ['AOV', inr(aov)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-[var(--surface-sunken)] p-2.5">
                  <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">{k}</p>
                  <p className="mt-0.5 font-display text-[16px] text-[var(--ink)]">{v}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Order History" subtitle={`${orders.length} orders`} padded={false}>
            {orders.length === 0 ? (
              <p className="p-4 text-[12px] text-[var(--ink-muted)]">This customer has not placed an order yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--line-color)]">
                {orders.map((o) => (
                  <li key={o._id} className="flex flex-wrap items-center gap-2 p-3">
                    <div className="min-w-0 flex-1">
                      <Link to={`/admin/orders/${o._id}`} className="text-[12px] font-medium text-[var(--accent)] hover:underline">#{o.orderNumber}</Link>
                      <p className="text-[10.5px] text-[var(--ink-muted)]">{formatDateTime(o.createdAt)} · {o.items?.length || 0} items</p>
                    </div>
                    <StatusPill tone={orderTone(o.status)}>{ORDER_STATUS_LABELS[o.status] || o.status}</StatusPill>
                    <span className="w-20 text-right text-[12px] font-semibold text-[var(--ink)]">{inr(o.pricing?.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Reviews" subtitle={`${reviews.length} written`} padded={false}>
            {reviews.length === 0 ? (
              <p className="p-4 text-[12px] text-[var(--ink-muted)]">No reviews written yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--line-color)]">
                {reviews.map((r) => (
                  <li key={r._id} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12px] font-medium text-[var(--ink)]">{r.product?.name || 'Product'}</p>
                      <StatusPill tone={r.status === 'APPROVED' ? 'green' : r.status === 'REJECTED' ? 'red' : 'amber'}>{r.status}</StatusPill>
                    </div>
                    <Rating value={r.rating} showValue={false} size={11} className="mt-1" />
                    {r.comment && <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        onConfirm={toggleBlock}
        loading={busy}
        tone={customer.isBlocked ? 'primary' : 'danger'}
        title={customer.isBlocked ? 'Unblock this customer?' : 'Block this customer?'}
        message={
          customer.isBlocked
            ? 'They will be able to sign in and place orders again.'
            : 'Blocked customers cannot sign in or place new orders. Existing orders are unaffected.'
        }
        confirmLabel={customer.isBlocked ? 'Unblock' : 'Block'}
      />
    </div>
  );
}
