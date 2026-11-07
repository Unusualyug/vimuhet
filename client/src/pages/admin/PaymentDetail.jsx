import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { Panel, StatusPill, paymentTone } from '../../components/admin/AdminUI.jsx';
import { Skeleton, ErrorState } from '../../components/ui/States.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { inr, formatDateTime } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function AdminPaymentDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rechecking, setRechecking] = useState(false);
  useDocumentTitle('Payment Details', 'Payment gateway transaction details.');

  const load = () => {
    setLoading(true);
    adminApi
      .payment(id)
      .then((res) => {
        setPayment(res.data);
        setError('');
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load this payment')))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const recheck = async () => {
    setRechecking(true);
    try {
      const res = await adminApi.recheckPayment(id);
      setPayment(res.data.local);
      toast('Payment status refreshed from gateway');
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not reach the payment gateway'), 'error');
    } finally {
      setRechecking(false);
    }
  };

  if (loading) return <Skeleton className="h-[420px] w-full rounded-xl" />;
  if (error || !payment) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <AdminPageHeader
        title="Payment Details"
        subtitle={payment.razorpayPaymentId || payment.razorpayOrderId || payment._id}
        breadcrumb="Payment details"
        actions={
          <>
            <Button to="/admin/payments" variant="outline" size="sm" icon={ArrowLeft}>Payments</Button>
            <Button size="sm" variant="outline" icon={RefreshCw} onClick={recheck} loading={rechecking}>Recheck gateway</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill tone={paymentTone(payment.status)}>{payment.status}</StatusPill>
        {payment.signatureVerified ? (
          <span className="flex items-center gap-1 rounded-full bg-[#2F7A4D]/12 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#2F7A4D] dark:text-emerald-400">
            <ShieldCheck size={10} /> Signature verified
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <XCircle size={10} /> Not verified
          </span>
        )}
        {payment.webhookVerified && <StatusPill tone="blue">Webhook confirmed</StatusPill>}
        <span className="text-[11px] text-[var(--ink-muted)]">{formatDateTime(payment.createdAt)}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <Panel title="Transaction">
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ['Amount', inr(payment.amount)],
                ['Currency', payment.currency],
                ['Method', payment.method || 'Razorpay'],
                ['Provider', payment.provider],
                ['Source', payment.source],
                ['Order', payment.orderNumber ? `#${payment.orderNumber}` : '—'],
                ['Razorpay order ID', payment.razorpayOrderId || '—'],
                ['Razorpay payment ID', payment.razorpayPaymentId || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">{k}</dt>
                  <dd className="mt-0.5 break-all text-[12.5px] text-[var(--ink)]">{v}</dd>
                </div>
              ))}
            </dl>
            {payment.failureReason && (
              <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-[11.5px] text-red-700 dark:bg-red-950/40 dark:text-red-300">
                Failure reason: {payment.failureReason}
              </div>
            )}
          </Panel>

          <Panel title="Refunds" subtitle={`${inr(payment.refundedAmount || 0)} refunded`} padded={false}>
            {(payment.refunds || []).length === 0 ? (
              <p className="p-4 text-[12px] text-[var(--ink-muted)]">No refunds issued for this payment.</p>
            ) : (
              <ul className="divide-y divide-[var(--line-color)]">
                {payment.refunds.map((r) => (
                  <li key={r._id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <div>
                      <p className="text-[12px] font-medium text-[var(--ink)]">{inr(r.amount)}</p>
                      <p className="text-[10.5px] text-[var(--ink-muted)]">{r.reason || 'Refund'} · {formatDateTime(r.at)}</p>
                    </div>
                    <StatusPill tone={r.status === 'PROCESSED' ? 'green' : r.status === 'FAILED' ? 'red' : 'amber'}>{r.status}</StatusPill>
                  </li>
                ))}
              </ul>
            )}
            {payment.order && (
              <div className="border-t border-[var(--line-color)] p-3">
                <Link to={`/admin/orders/${payment.order._id || payment.order}`} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)] hover:underline">
                  Open related order →
                </Link>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Customer">
            <p className="text-[12.5px] font-medium text-[var(--ink)]">{payment.user?.fullName || 'Guest checkout'}</p>
            <p className="text-[11.5px] text-[var(--ink-muted)]">{payment.user?.email || '—'}</p>
          </Panel>

          <Panel title="Verification path">
            <ul className="space-y-2 text-[11.5px]">
              {[
                ['Order created on server', true],
                ['Signature verified (HMAC SHA256)', payment.signatureVerified],
                ['Webhook confirmation received', payment.webhookVerified],
                ['Stock committed once', payment.status === 'PAID'],
              ].map(([label, ok]) => (
                <li key={label} className="flex items-center gap-2">
                  {ok ? <CheckCircle2 size={13} className="text-[#2F7A4D] dark:text-emerald-400" /> : <XCircle size={13} className="text-[var(--ink-muted)]" />}
                  <span className={ok ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'}>{label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-[var(--line-color)] pt-2 text-[10.5px] leading-relaxed text-[var(--ink-muted)]">
              <CreditCard size={10} className="mr-1 inline" />
              Secret keys stay on the server. The frontend only ever receives the publishable key id.
            </p>
          </Panel>

          {payment.notes && Object.keys(payment.notes).length > 0 && (
            <Panel title="Gateway notes">
              <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[var(--surface-sunken)] p-2.5 text-[10.5px] text-[var(--ink-muted)]">
                {JSON.stringify(payment.notes, null, 2)}
              </pre>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
