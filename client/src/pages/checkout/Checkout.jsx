import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CreditCard, Loader2, Lock, MapPin, Package, ShieldCheck, Smartphone, Wallet } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { checkoutApi, accountApi, authApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import Button from '../../components/ui/Button.jsx';
import { Input, Textarea, Radio, Checkbox, Select } from '../../components/ui/Field.jsx';
import { Alert } from '../../components/ui/States.jsx';
import { inr } from '../../utils/format.js';
import { isEmail, isMobile, isPincode } from '../../utils/validators.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { loadRazorpay } from '../../utils/razorpay.js';

const STEPS = ['Address', 'Review', 'Payment'];

const emptyAddress = {
  label: 'Home',
  fullName: '',
  mobile: '',
  house: '',
  street: '',
  area: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  isDefault: false,
};

const STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

export default function Checkout() {
  useDocumentTitle('Checkout', 'Secure checkout at Vimuhet.');
  const navigate = useNavigate();
  const { cart, pricing, refresh } = useCart();
  const { user } = useAuth();
  const { shipping } = useStore();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [newAddress, setNewAddress] = useState(emptyAddress);
  const [showForm, setShowForm] = useState(false);
  const [contact, setContact] = useState({ fullName: user?.fullName || '', email: user?.email || '', mobile: user?.mobile || '' });
  const [saveAddress, setSaveAddress] = useState(true);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [method, setMethod] = useState('RAZORPAY');
  const [deliveryCheck, setDeliveryCheck] = useState(null);
  // Set the moment payment is verified. While true the empty-cart guard below
  // must stand down, otherwise it races the navigation to /order-success.
  const [completed, setCompleted] = useState(false);

  const items = cart.items || [];

  useEffect(() => {
    if (!items.length && !completed) navigate('/cart', { replace: true });
  }, [items.length, completed, navigate]);

  useEffect(() => {
    accountApi
      .addresses()
      .then((res) => {
        const list = res.data.addresses || [];
        setAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def) setSelectedAddressId(def._id);
        else setShowForm(true);
      })
      .catch(() => setShowForm(true));
  }, []);

  useEffect(() => {
    setContact((c) => ({ ...c, fullName: c.fullName || user?.fullName || '', email: c.email || user?.email || '', mobile: c.mobile || user?.mobile || '' }));
  }, [user]);

  const chosenAddress = useMemo(() => {
    if (showForm || !addresses.length) return newAddress;
    return addresses.find((a) => a._id === selectedAddressId) || addresses[0] || newAddress;
  }, [showForm, addresses, selectedAddressId, newAddress]);

  const validateStep1 = () => {
    const next = {};
    if (!contact.fullName.trim()) next.fullName = 'Enter your full name';
    if (!isEmail(contact.email)) next.email = 'Enter a valid email address';
    if (!isMobile(contact.mobile)) next.mobile = 'Enter a valid mobile number';
    if (showForm || !addresses.length) {
      if (!newAddress.fullName.trim()) next.aFullName = 'Enter the recipient name';
      if (!isMobile(newAddress.mobile)) next.aMobile = 'Enter a valid mobile number';
      if (!newAddress.house.trim()) next.house = 'House / flat number is required';
      if (!newAddress.street.trim()) next.street = 'Street is required';
      if (!newAddress.city.trim()) next.city = 'City is required';
      if (!newAddress.state) next.state = 'Select a state';
      if (!isPincode(newAddress.pincode)) next.pincode = 'Enter a valid 6-digit PIN code';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goReview = async () => {
    if (!validateStep1()) return;
    if ((showForm || !addresses.length) && saveAddress) {
      try {
        const res = await accountApi.addAddress({ ...newAddress, fullName: contact.fullName || newAddress.fullName, mobile: newAddress.mobile || contact.mobile });
        setAddresses(res.data.addresses);
        const created = res.data.addresses[res.data.addresses.length - 1];
        setSelectedAddressId(created._id);
        setShowForm(false);
      } catch {
        /* address saving is optional — continue */
      }
    }
    if (isPincode(chosenAddress.pincode)) {
      checkoutApi.pincode(chosenAddress.pincode).then((r) => setDeliveryCheck(r.data)).catch(() => {});
    }
    setStep(1);
  };

  /* One order per click. `setBusy(true)` is queued rather than committed, so a
     double-tap dispatched in the same task previously reached
     checkoutApi.create() twice and could create two orders (and two charges)
     against one bag. The ref closes that window synchronously; `completed`
     still covers the redirect tail after a successful payment. */
  const orderInFlight = useRef(false);
  const runPayment = async () => {
    if (orderInFlight.current || completed) return;
    orderInFlight.current = true;
    setPaymentError('');
    setBusy(true);
    let orderRef = null;
    try {
      const res = await checkoutApi.create({
        customer: contact,
        shippingAddress: {
          ...chosenAddress,
          fullName: chosenAddress.fullName || contact.fullName,
          mobile: chosenAddress.mobile || contact.mobile,
        },
        couponCode: pricing.couponCode || undefined,
      });

      const { gateway, orderId } = res.data;
      orderRef = { orderId, orderNumber: res.data.orderNumber };

      if (gateway.mode === 'sandbox') {
        // No live Razorpay keys configured: the server still performs the real
        // signature verification path using a sandbox-signed payload.
        const sandbox = await checkoutApi.sandbox(gateway.razorpayOrderId, orderId);
        const verified = await checkoutApi.verify({
          orderId,
          razorpay_order_id: gateway.razorpayOrderId,
          razorpay_payment_id: sandbox.data.razorpay_payment_id,
          razorpay_signature: sandbox.data.razorpay_signature,
          method: 'UPI',
        });
        setCompleted(true);
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
        description: `Order ${res.data.orderNumber}`,
        image: '/favicon.svg',
        order_id: gateway.razorpayOrderId,
        prefill: gateway.prefill,
        notes: { orderNumber: res.data.orderNumber },
        theme: { color: '#78152F' },
        modal: {
          ondismiss: async () => {
            try {
              await checkoutApi.failed({ orderId, reason: 'Payment window closed by customer' });
            } catch {
              /* ignore */
            }
            orderInFlight.current = false;
            setBusy(false);
            setPaymentError('Payment was not completed. Your bag is saved — you can retry whenever you are ready.');
          },
        },
        handler: async (response) => {
          try {
            const verified = await checkoutApi.verify({
              orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setCompleted(true);
            await refresh();
            navigate(`/order-success/${orderId}`, { replace: true, state: { order: verified.data.order } });
          } catch (err) {
            orderInFlight.current = false;
            setBusy(false);
            setPaymentError(apiErrorMessage(err, 'We could not verify this payment. If money was deducted, it will be auto-reversed.'));
            navigate(`/payment-failed/${orderId}`, { replace: true, state: { reason: apiErrorMessage(err) } });
          }
        },
      });
      rzp.on('payment.failed', async (response) => {
        const reason = response?.error?.description || 'Payment failed';
        try {
          await checkoutApi.failed({ orderId, reason });
        } catch {
          /* ignore */
        }
        orderInFlight.current = false;
        setBusy(false);
        setPaymentError(reason);
      });
      rzp.open();
    } catch (err) {
      const message = apiErrorMessage(err, 'We could not start the payment. Please try again.');
      setPaymentError(message);
      orderInFlight.current = false;
      setBusy(false);
      if (orderRef) navigate(`/payment-failed/${orderRef.orderId}`, { state: { reason: message } });
    }
  };

  return (
    <div className="container-page py-8">
      <div className="mx-auto mb-8 max-w-3xl">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold transition ${
                    i < step ? 'bg-[#2F7A4D] text-white' : i === step ? 'bg-[var(--accent)] text-white dark:text-[#1a1113]' : 'border border-[var(--line-color)] text-[var(--ink-muted)]'
                  }`}
                >
                  {i < step ? <Check size={14} /> : i + 1}
                </span>
                <span className={`text-[10.5px] font-semibold uppercase tracking-[0.12em] ${i === step ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <span className={`mx-3 h-px flex-1 ${i < step ? 'bg-[#2F7A4D]' : 'bg-[var(--line-color)]'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:gap-10">
        <div>
          {step === 0 && (
            <div className="space-y-6">
              <section className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
                <h2 className="font-display text-xl">Customer Information</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Input label="Full Name" required value={contact.fullName} onChange={(e) => setContact({ ...contact, fullName: e.target.value })} error={errors.fullName} />
                  <Input label="Email" type="email" required value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} error={errors.email} />
                  <Input label="Mobile Number" required value={contact.mobile} onChange={(e) => setContact({ ...contact, mobile: e.target.value })} error={errors.mobile} placeholder="10-digit mobile" />
                </div>
                <p className="mt-3 text-[11px] text-[var(--ink-muted)]">Order updates and the invoice will be sent to this email.</p>
              </section>

              <section className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl">Delivery Address</h2>
                  {addresses.length > 0 && (
                    <button onClick={() => setShowForm((s) => !s)} className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)] hover:underline">
                      {showForm ? 'Use saved address' : '+ Add new address'}
                    </button>
                  )}
                </div>

                {!showForm && addresses.length > 0 ? (
                  <div className="mt-4 space-y-2.5">
                    {addresses.map((a) => (
                      <button
                        key={a._id}
                        onClick={() => setSelectedAddressId(a._id)}
                        className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                          selectedAddressId === a._id ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40' : 'border-[var(--line-color)] hover:border-[var(--accent)]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[13px] font-semibold">{a.fullName} <span className="ml-1 rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">{a.label}</span></p>
                          {a.isDefault && <span className="text-[9.5px] uppercase tracking-[0.1em] text-[var(--accent)]">Default</span>}
                        </div>
                        <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink-muted)]">
                          {[a.house, a.street, a.area].filter(Boolean).join(', ')}, {a.city}, {a.state} — {a.pincode}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-[var(--ink-muted)]">{a.mobile}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Input label="Recipient Name" required value={newAddress.fullName} onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })} error={errors.aFullName} />
                    <Input label="Mobile" required value={newAddress.mobile} onChange={(e) => setNewAddress({ ...newAddress, mobile: e.target.value })} error={errors.aMobile} />
                    <Input label="House / Flat / Building" required value={newAddress.house} onChange={(e) => setNewAddress({ ...newAddress, house: e.target.value })} error={errors.house} />
                    <Input label="Street / Road" required value={newAddress.street} onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })} error={errors.street} />
                    <Input label="Area / Locality" value={newAddress.area} onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })} />
                    <Input label="Landmark" value={newAddress.landmark} onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })} />
                    <Input label="City" required value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} error={errors.city} />
                    <Select label="State" required placeholder="Select state" options={STATES} value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} error={errors.state} />
                    <Input label="PIN Code" required value={newAddress.pincode} onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} error={errors.pincode} maxLength={6} />
                    <Select label="Address Type" options={['Home', 'Office', 'Other']} value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} />
                    <label className="flex items-center gap-2 text-[12.5px] text-[var(--ink-muted)] sm:col-span-2">
                      <Checkbox label="Save this address for future orders" checked={saveAddress} onChange={() => setSaveAddress((s) => !s)} />
                    </label>
                  </div>
                )}
              </section>

              <div className="flex justify-end">
                <Button size="lg" onClick={goReview}>
                  Continue to Review
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <section className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
                <div className="flex items-start justify-between">
                  <h2 className="font-display text-xl">Order Review</h2>
                  <button onClick={() => setStep(0)} className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)] hover:underline">
                    Edit
                  </button>
                </div>
                <ul className="mt-4 divide-y divide-[var(--line-color)]">
                  {items.map((item) => (
                    <li key={item._id} className="flex gap-3 py-3">
                      <img src={item.product.image} alt={item.product.name} className="h-20 w-16 rounded-lg object-cover" loading="lazy" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium">{item.product.name}</p>
                        <p className="mt-0.5 text-[11.5px] text-[var(--ink-muted)]">
                          Size {item.size} · {item.color} · Qty {item.quantity}
                        </p>
                      </div>
                      <p className="text-[13px] font-semibold">{inr(item.lineTotal)}</p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
                <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                  <MapPin size={12} /> Delivering to
                </h3>
                <p className="mt-2 text-[13px] font-medium">{chosenAddress.fullName || contact.fullName}</p>
                <p className="text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
                  {[chosenAddress.house, chosenAddress.street, chosenAddress.area, chosenAddress.landmark].filter(Boolean).join(', ')},{' '}
                  {chosenAddress.city}, {chosenAddress.state} — {chosenAddress.pincode}
                </p>
                <p className="mt-1 text-[12px] text-[var(--ink-muted)]">
                  {chosenAddress.mobile || contact.mobile} · {contact.email}
                </p>
                {deliveryCheck?.serviceable && (
                  <p className="mt-2 text-[11.5px] text-[#2F7A4D] dark:text-emerald-400">
                    Estimated delivery in {deliveryCheck.estimatedDays} days
                  </p>
                )}
              </section>

              <div className="flex flex-wrap justify-between gap-3">
                <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                <Button size="lg" onClick={() => setStep(2)}>Continue to Payment</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <section className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
                <h2 className="font-display text-xl">Payment Method</h2>
                <div className="mt-4 space-y-3">
                  <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${method === 'RAZORPAY' ? 'border-[var(--accent)] bg-[var(--accent-soft)]/30' : 'border-[var(--line-color)]'}`}>
                    <Radio name="payment" value="RAZORPAY" checked={method === 'RAZORPAY'} onChange={() => setMethod('RAZORPAY')} label="Pay online securely" description="UPI, debit cards, credit cards, net banking and wallets — processed by Razorpay." />
                    <ShieldCheck size={16} className="text-[var(--accent)]" />
                  </label>
                  <div className="grid grid-cols-2 gap-2 pl-1 sm:grid-cols-4">
                    {[
                      { icon: Smartphone, label: 'UPI' },
                      { icon: CreditCard, label: 'Cards' },
                      { icon: Wallet, label: 'Wallets' },
                      { icon: Package, label: 'Net Banking' },
                    ].map((m) => (
                      <div key={m.label} className="flex items-center gap-1.5 rounded-lg border border-[var(--line-color)] px-2.5 py-2 text-[10.5px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                        <m.icon size={12} /> {m.label}
                      </div>
                    ))}
                  </div>
                </div>
                {paymentError && <Alert variant="error" className="mt-4">{paymentError}</Alert>}
                <p className="mt-4 flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)]">
                  <Lock size={11} /> Your payment is verified on our server before the order is confirmed. We never store card details.
                </p>
              </section>

              <div className="flex flex-wrap justify-between gap-3">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button size="lg" onClick={runPayment} loading={busy} icon={Lock}>
                  Pay {inr(pricing.total)}
                </Button>
              </div>
              {busy && (
                <p className="flex items-center justify-center gap-2 text-[12px] text-[var(--ink-muted)]">
                  <Loader2 size={13} className="animate-spin" /> Do not close this window while we confirm your payment…
                </p>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
            <h2 className="font-display text-xl">Order Summary</h2>
            <div className="mt-4 space-y-2.5 text-[13px]">
              <div className="flex justify-between"><span className="text-[var(--ink-muted)]">MRP total</span><span>{inr(pricing.mrpTotal)}</span></div>
              {pricing.productDiscount > 0 && <div className="flex justify-between text-[#2F7A4D] dark:text-emerald-400"><span>Product discount</span><span>− {inr(pricing.productDiscount)}</span></div>}
              {pricing.couponDiscount > 0 && <div className="flex justify-between text-[#2F7A4D] dark:text-emerald-400"><span>Coupon {pricing.couponCode}</span><span>− {inr(pricing.couponDiscount)}</span></div>}
              <div className="flex justify-between"><span className="text-[var(--ink-muted)]">Shipping</span><span>{pricing.shipping === 0 ? 'Free' : inr(pricing.shipping)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--ink-muted)]">GST included</span><span className="text-[11.5px]">{inr(pricing.tax)}</span></div>
              <div className="flex items-center justify-between border-t border-[var(--line-color)] pt-3 font-display text-lg">
                <span>Total</span>
                <span>{inr(pricing.total)}</span>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 rounded-lg bg-[var(--surface-sunken)] p-3 text-[11px] text-[var(--ink-muted)]">
              <p className="flex items-center gap-1.5"><ShieldCheck size={11} className="text-[var(--accent)]" /> Signature-verified payments</p>
              <p className="flex items-center gap-1.5"><Package size={11} className="text-[var(--accent)]" /> Dispatch within 24–48 hours</p>
              <p className="flex items-center gap-1.5"><Package size={11} className="text-[var(--accent)]" /> {shipping.returnWindowDays || 7}-day easy returns</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
