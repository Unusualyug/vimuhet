import { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { checkoutApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import Button from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/States.jsx';
import { loadRazorpay } from '../../utils/razorpay.js';
import { useCart } from '../../context/CartContext.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useNavigate } from 'react-router-dom';

export default function PaymentFailed() {
  useDocumentTitle('Payment Failed', 'Your payment could not be completed.');
  const { orderId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { refresh } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const retry = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await checkoutApi.retry(orderId);
      const { gateway } = res.data;
      if (gateway.mode === 'sandbox') {
        const sandbox = await checkoutApi.sandbox(gateway.razorpayOrderId);
        const verified = await checkoutApi.verify({
          orderId,
          razorpay_order_id: gateway.razorpayOrderId,
          razorpay_payment_id: sandbox.data.razorpay_payment_id,
          razorpay_signature: sandbox.data.razorpay_signature,
          method: 'UPI',
        });
        await refresh();
        navigate(`/order-success/${orderId}`, { replace: true, state: { order: verified.data.order, sandbox: true } });
        return;
      }
      await loadRazorpay();
      const rzp = new window.Razorpay({
        key: gateway.keyId,
        amount: gateway.amount,
        currency: gateway.currency,
        name: 'Vimuhet',
        order_id: gateway.razorpayOrderId,
        prefill: gateway.prefill,
        theme: { color: '#78152F' },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (response) => {
          try {
            const verified = await checkoutApi.verify({
              orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await refresh();
            navigate(`/order-success/${orderId}`, { replace: true, state: { order: verified.data.order } });
          } catch (err) {
            setBusy(false);
            setError(apiErrorMessage(err, 'We could not verify this payment.'));
          }
        },
      });
      rzp.open();
    } catch (err) {
      setError(apiErrorMessage(err, 'We could not restart the payment.'));
      setBusy(false);
    }
  };

  return (
    <div className="container-page py-14">
      <div className="mx-auto max-w-lg rounded-2xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300">
          <AlertTriangle size={26} />
        </span>
        <h1 className="mt-5 font-display text-[26px] leading-tight">Payment could not be completed</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
          {state?.reason ||
            'Your bank or the payment gateway declined this transaction. Nothing has been charged for this attempt, and your bag is still saved.'}
        </p>
        {orderId && (
          <p className="mt-3 text-[11.5px] text-[var(--ink-muted)]">
            Order reference: <span className="font-medium text-[var(--ink)]">{orderId}</span>
          </p>
        )}
        {error && <Alert variant="error" className="mt-4 text-left">{error}</Alert>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={retry} loading={busy} icon={RefreshCw} size="lg">
            Retry Payment
          </Button>
          <Button to="/cart" variant="outline" size="lg">
            Return to Bag
          </Button>
        </div>
        <p className="mt-5 text-[11.5px] text-[var(--ink-muted)]">
          Money deducted but no order shown? Write to{' '}
          <a href="mailto:care@vimuhet.com" className="text-[var(--accent)] hover:underline">care@vimuhet.com</a> with your order reference — failed
          payments are auto-reversed by your bank within 5–7 working days.
        </p>
      </div>
    </div>
  );
}
