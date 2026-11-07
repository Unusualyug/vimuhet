import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MapPin, Pencil, Plus, ShieldCheck, Star, Trash2, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { accountApi, authApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { Input, PasswordInput, Select, Textarea, Checkbox, FieldError } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { Modal, ConfirmDialog } from '../../components/ui/Modal.jsx';
import { Skeleton, EmptyState, Alert } from '../../components/ui/States.jsx';
import { Rating } from '../../components/ui/Rating.jsx';
import { inr, formatDate, formatDateTime } from '../../utils/format.js';
import { isEmail, isMobile, isPincode, passwordStrength } from '../../utils/validators.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useNavigate } from 'react-router-dom';

/* --------------------------------- Profile -------------------------------- */

export function Profile() {
  useDocumentTitle('My Profile', 'Manage your Vimuhet profile.');
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ fullName: user?.fullName || '', mobile: user?.mobile || '', marketingOptIn: user?.marketingOptIn ?? true });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.fullName.trim().length < 2) next.fullName = 'Enter your full name';
    if (form.mobile && !isMobile(form.mobile)) next.mobile = 'Enter a valid mobile number';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await updateProfile(form);
      toast('Profile updated');
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not update your profile'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="font-display text-2xl">My Profile</h2>
      <p className="mt-1 text-[13px] text-[var(--ink-muted)]">Keep your contact details up to date for smooth deliveries.</p>

      <form onSubmit={save} className="mt-6 max-w-lg space-y-4 rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
        <Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} error={errors.fullName} />
        <Input label="Email" value={user?.email || ''} disabled hint={<span className="text-[9.5px] uppercase tracking-[0.08em]">Locked</span>} />
        <Input label="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} error={errors.mobile} placeholder="10-digit mobile" />
        <Checkbox label="Email me new arrivals and private sales" checked={form.marketingOptIn} onChange={() => setForm({ ...form, marketingOptIn: !form.marketingOptIn })} />
        <p className="text-[11px] text-[var(--ink-muted)]">
          {user?.isEmailVerified ? (
            <span className="flex items-center gap-1 text-[#2F7A4D] dark:text-emerald-400"><Check size={11} /> Email verified</span>
          ) : (
            'Email not verified yet — verification keeps your account secure.'
          )}
        </p>
        <Button type="submit" loading={saving}>Save changes</Button>
      </form>
    </div>
  );
}

/* -------------------------------- Addresses ------------------------------- */

const EMPTY = { label: 'Home', fullName: '', mobile: '', house: '', street: '', area: '', landmark: '', city: '', state: '', pincode: '', country: 'India', isDefault: false };
const STATES = ['Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];

export function Addresses() {
  useDocumentTitle('Saved Addresses', 'Manage your delivery addresses.');
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    accountApi
      .addresses()
      .then((res) => setAddresses(res.data.addresses || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew = () => {
    setForm({ ...EMPTY, fullName: user?.fullName || '', mobile: user?.mobile || '' });
    setEditing('new');
    setErrors({});
  };

  const save = async () => {
    const next = {};
    if (!form.fullName.trim()) next.fullName = 'Recipient name is required';
    if (!isMobile(form.mobile)) next.mobile = 'Enter a valid mobile number';
    if (!form.house.trim()) next.house = 'House / flat is required';
    if (!form.street.trim()) next.street = 'Street is required';
    if (!form.city.trim()) next.city = 'City is required';
    if (!form.state) next.state = 'Select a state';
    if (!isPincode(form.pincode)) next.pincode = 'Enter a valid 6-digit PIN';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const res = editing === 'new' ? await accountApi.addAddress(form) : await accountApi.updateAddress(editing._id, form);
      setAddresses(res.data.addresses);
      setEditing(null);
      toast('Address saved');
      refresh();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not save this address'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await accountApi.deleteAddress(deleting._id);
      setAddresses(res.data.addresses);
      setDeleting(null);
      toast('Address removed', 'info');
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not remove this address'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (id) => {
    try {
      const res = await accountApi.setDefault(id);
      setAddresses(res.data.addresses);
      toast('Default address updated');
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Saved Addresses</h2>
          <p className="mt-1 text-[13px] text-[var(--ink-muted)]">Checkout is faster with a saved address.</p>
        </div>
        <Button size="sm" icon={Plus} onClick={openNew}>Add address</Button>
      </div>

      {loading ? (
        <div className="mt-6 space-y-2">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={MapPin} title="No saved addresses" description="Add an address to make checkout quicker next time." action={{ label: 'Add address', onClick: openNew }} />
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <div key={a._id} className={`rounded-xl border p-4 ${a.isDefault ? 'border-[var(--accent)] bg-[var(--accent-soft)]/30' : 'border-[var(--line-color)] bg-[var(--surface-raised)]'}`}>
              <div className="flex items-start justify-between">
                <p className="text-[13px] font-semibold">
                  {a.fullName}
                  <span className="ml-2 rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">{a.label}</span>
                </p>
                {a.isDefault && <span className="text-[9.5px] uppercase tracking-[0.1em] text-[var(--accent)]">Default</span>}
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
                {[a.house, a.street, a.area, a.landmark].filter(Boolean).join(', ')}, {a.city}, {a.state} — {a.pincode}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--ink-muted)]">{a.mobile}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.1em]">
                <button onClick={() => { setForm(a); setEditing(a); setErrors({}); }} className="flex items-center gap-1 text-[var(--accent)] hover:underline">
                  <Pencil size={11} /> Edit
                </button>
                <button onClick={() => setDeleting(a)} className="flex items-center gap-1 text-[var(--ink-muted)] hover:text-red-600">
                  <Trash2 size={11} /> Remove
                </button>
                {!a.isDefault && (
                  <button onClick={() => makeDefault(a._id)} className="text-[var(--ink-muted)] hover:text-[var(--accent)]">Set default</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add a new address' : 'Edit address'} size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Recipient name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} error={errors.fullName} />
          <Input label="Mobile" required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} error={errors.mobile} />
          <Input label="House / Flat / Building" required value={form.house} onChange={(e) => setForm({ ...form, house: e.target.value })} error={errors.house} />
          <Input label="Street / Road" required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} error={errors.street} />
          <Input label="Area / Locality" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          <Input label="Landmark" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
          <Input label="City" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} error={errors.city} />
          <Select label="State" required placeholder="Select state" options={STATES} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} error={errors.state} />
          <Input label="PIN code" required value={form.pincode} maxLength={6} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })} error={errors.pincode} />
          <Select label="Address type" options={['Home', 'Office', 'Other']} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <div className="sm:col-span-2">
            <Checkbox label="Make this my default address" checked={form.isDefault} onChange={() => setForm({ ...form, isDefault: !form.isDefault })} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={save} loading={busy}>Save address</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title="Remove this address?"
        message="You can add it again later if you need to."
        confirmLabel="Remove"
      />
    </div>
  );
}

/* --------------------------------- Reviews -------------------------------- */

export function MyReviews() {
  useDocumentTitle('My Reviews', 'Reviews you have written.');
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [reviewable, setReviewable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([accountApi.myReviews(), accountApi.reviewable()])
      .then(([a, b]) => {
        setReviews(a.data || []);
        setReviewable(b.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async () => {
    setBusy(true);
    try {
      await accountApi.createReview({
        productId: form.product._id,
        orderId: form.orderId,
        rating: form.rating,
        title: form.title,
        comment: form.comment,
      });
      toast('Thanks! Your review will appear after moderation.');
      setForm(null);
      load();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not submit your review'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Skeleton className="h-40 w-full rounded-xl" />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl">My Reviews</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">Only verified purchases can be reviewed — thank you for helping other shoppers.</p>
      </div>

      {reviewable.length > 0 && (
        <div>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Waiting for your review</h3>
          <ul className="space-y-2">
            {reviewable.map((r) => (
              <li key={`${r.product._id}-${r.orderId}`} className="flex items-center gap-3 rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-3">
                <img src={r.product.image} alt="" className="h-14 w-11 rounded-lg object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium">{r.product.name}</p>
                  <p className="text-[11px] text-[var(--ink-muted)]">Order #{r.orderNumber}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setForm({ ...r, rating: 5, title: '', comment: '' })}>Write review</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" description="Once your order is delivered you can share how the piece fits and feels." actionTo="/account/orders" action="View my orders" />
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r._id} className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-4">
              <div className="flex items-center gap-3">
                <img src={r.product?.images?.[0]?.url} alt="" className="h-12 w-10 rounded-lg object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <Link to={`/product/${r.product?.slug}`} className="text-[12.5px] font-medium hover:text-[var(--accent)]">{r.product?.name}</Link>
                  <Rating value={r.rating} showValue={false} size={11} className="mt-0.5" />
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${r.status === 'APPROVED' ? 'bg-[#2F7A4D]/12 text-[#2F7A4D] dark:text-emerald-400' : r.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                  {r.status}
                </span>
              </div>
              {r.title && <p className="mt-2 text-[12.5px] font-medium">{r.title}</p>}
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink-muted)]">{r.comment}</p>
              <p className="mt-2 text-[10.5px] text-[var(--ink-muted)]">{formatDate(r.createdAt)} {r.verifiedPurchase && '· Verified purchase'}</p>
            </li>
          ))}
        </ul>
      )}

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title="Write a review" size="md">
        {form && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={form.product.image} alt="" className="h-16 w-12 rounded-lg object-cover" />
              <p className="text-[13px] font-medium">{form.product.name}</p>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Your rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setForm({ ...form, rating: n })} aria-label={`${n} star`}>
                    <Star size={22} className={n <= form.rating ? 'text-[#C99A2E]' : 'text-[var(--line-color)]'} fill="currentColor" strokeWidth={0} />
                  </button>
                ))}
              </div>
            </div>
            <Input label="Title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Beautifully finished" />
            <Textarea label="Your review" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="How is the fabric, fit and finish?" />
            <Button className="w-full" onClick={submit} loading={busy}>Submit review</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* -------------------------------- Settings ------------------------------- */

export function AccountSettings() {
  useDocumentTitle('Account Settings', 'Password, sessions and account controls.');
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [sessions, setSessions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const strength = passwordStrength(form.newPassword);

  useEffect(() => {
    authApi.sessions().then((res) => setSessions(res.data.sessions || [])).catch(() => {});
  }, []);

  const changePassword = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 8) return toast('New password must be at least 8 characters', 'error');
    if (form.newPassword !== form.confirm) return toast('Passwords do not match', 'error');
    setBusy(true);
    try {
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast('Password updated. Please sign in again.');
      await logout();
      navigate('/login');
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not change your password'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const revokeAll = async () => {
    try {
      await authApi.revokeSessions();
      toast('Signed out of all devices');
      navigate('/login');
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    }
  };

  const requestDeletion = async () => {
    try {
      await authApi.requestDeletion();
      setDeleteOpen(false);
      toast('Your request has been logged — our team will contact you within 48 hours.');
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Account Settings</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">Password, active sessions and account controls.</p>
      </div>

      <form onSubmit={changePassword} className="max-w-lg space-y-4 rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
          <ShieldCheck size={12} /> Change password
        </h3>
        <PasswordInput label="Current password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} autoComplete="current-password" />
        <div>
          <PasswordInput label="New password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} autoComplete="new-password" />
          {form.newPassword && (
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={`h-1 flex-1 rounded-full ${strength >= i ? (strength >= 3 ? 'bg-[#2F7A4D]' : 'bg-amber-500') : 'bg-[var(--line-color)]'}`} />
              ))}
            </div>
          )}
        </div>
        <PasswordInput label="Confirm new password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" />
        <Button type="submit" loading={busy}>Update password</Button>
      </form>

      <div className="max-w-lg rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Active sessions</h3>
        {sessions.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-[var(--ink-muted)]">No other active sessions found.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {sessions.slice(0, 4).map((s) => (
              <li key={s._id} className="rounded-lg border border-[var(--line-color)] px-3 py-2 text-[11.5px]">
                <p className="font-medium text-[var(--ink)]">{s.userAgent?.slice(0, 52) || 'Unknown device'}</p>
                <p className="text-[var(--ink-muted)]">Signed in {formatDateTime(s.createdAt)} · expires {formatDate(s.expiresAt)}</p>
              </li>
            ))}
          </ul>
        )}
        <Button variant="outline" size="sm" className="mt-3" onClick={revokeAll} icon={LogOut}>Sign out of all devices</Button>
      </div>

      <div className="max-w-lg rounded-xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/50 dark:bg-red-950/20">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700 dark:text-red-300">Danger zone</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
          Requesting deletion logs a request with our care team — your account stays active until it is confirmed with you.
        </p>
        <Button variant="danger" size="sm" className="mt-3" onClick={() => setDeleteOpen(true)}>Request account deletion</Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={requestDeletion}
        title="Request account deletion?"
        message="Our team will contact you within 48 hours to confirm. Order records are retained for statutory accounting requirements."
        confirmLabel="Request deletion"
      />
    </div>
  );
}
