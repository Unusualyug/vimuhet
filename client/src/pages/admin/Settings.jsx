import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, CreditCard, Lock, Save, Shield, Store, Truck } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { Panel, StatusPill } from '../../components/admin/AdminUI.jsx';
import { Input, Textarea, Toggle, Select, PasswordInput } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { Skeleton, ErrorState, Alert } from '../../components/ui/States.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { authApi } from '../../services/endpoints.js';
import { formatDateTime } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const SECTIONS = [
  { key: 'general', label: 'Store', icon: Store, to: '/admin/settings' },
  { key: 'payment', label: 'Payment', icon: CreditCard, to: '/admin/settings/payment' },
  { key: 'shipping', label: 'Shipping', icon: Truck, to: '/admin/settings/shipping' },
  { key: 'notifications', label: 'Notifications', icon: Bell, to: '/admin/settings/notifications' },
  { key: 'security', label: 'Security', icon: Shield, to: '/admin/settings/security' },
];

export default function AdminSettings({ section = 'general' }) {
  const title = SECTIONS.find((s) => s.key === section)?.label || 'Store';
  useDocumentTitle(`${title} Settings`, 'Store configuration.');
  const { toast } = useToast();
  const { admin, refresh: refreshAdmin } = useAdminAuth();
  const { refreshHome } = useStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi
      .settings()
      .then((res) => {
        setData(res.data);
        setError('');
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load settings')))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const patch = (group, key, value) => setData((d) => ({ ...d, settings: { ...d.settings, [group]: { ...d.settings[group], [key]: value } } }));

  const save = async () => {
    setSaving(true);
    try {
      const { general, shipping, payment, notifications, seo } = data.settings;
      await adminApi.saveSettings({ general, shipping, payment, notifications, seo });
      toast('Settings saved');
      await refreshHome();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not save settings'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton className="h-[460px] w-full rounded-xl" />;
  if (error || !data) return <ErrorState message={error} onRetry={load} />;

  const s = data.settings;

  return (
    <div>
      <AdminPageHeader
        title={`${title} Settings`}
        subtitle="Changes apply to the storefront and future orders immediately"
        breadcrumb="Administration"
        actions={section !== 'security' ? <Button size="sm" onClick={save} loading={saving} icon={Save}>Save changes</Button> : null}
      />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-[var(--line-color)] bg-[var(--surface-raised)] p-1 no-scrollbar">
        {SECTIONS.map((sec) => (
          <Link
            key={sec.key}
            to={sec.to}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
              section === sec.key ? 'bg-[var(--accent)] text-white dark:text-[#1a1113]' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            <sec.icon size={13} /> {sec.label}
          </Link>
        ))}
      </div>

      {section === 'general' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Store identity">
            <div className="grid gap-4">
              <Input label="Store name" value={s.general?.storeName || ''} onChange={(e) => patch('general', 'storeName', e.target.value)} />
              <Input label="Tagline" value={s.general?.tagline || ''} onChange={(e) => patch('general', 'tagline', e.target.value)} />
              <Input label="Support email" type="email" value={s.general?.email || ''} onChange={(e) => patch('general', 'email', e.target.value)} />
              <Input label="Support phone" value={s.general?.phone || ''} onChange={(e) => patch('general', 'phone', e.target.value)} />
              <Input label="WhatsApp number" value={s.general?.whatsapp || ''} onChange={(e) => patch('general', 'whatsapp', e.target.value)} placeholder="91XXXXXXXXXX" />
              <Textarea label="Studio address" rows={2} value={s.general?.address || ''} onChange={(e) => patch('general', 'address', e.target.value)} />
            </div>
          </Panel>
          <div className="space-y-4">
            <Panel title="Locale">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Currency" value={s.general?.currency || 'INR'} onChange={(e) => patch('general', 'currency', e.target.value)} />
                <Input label="Timezone" value={s.general?.timezone || 'Asia/Kolkata'} onChange={(e) => patch('general', 'timezone', e.target.value)} />
              </div>
            </Panel>
            <Panel title="Social profiles">
              <div className="grid gap-4">
                {['instagram', 'facebook', 'pinterest', 'youtube'].map((k) => (
                  <Input
                    key={k}
                    label={k.charAt(0).toUpperCase() + k.slice(1)}
                    value={s.general?.social?.[k] || ''}
                    onChange={(e) => setData((d) => ({ ...d, settings: { ...d.settings, general: { ...d.settings.general, social: { ...d.settings.general.social, [k]: e.target.value } } } }))}
                    placeholder={`https://${k}.com/vimuhet`}
                  />
                ))}
              </div>
            </Panel>
            <Panel title="SEO defaults">
              <div className="grid gap-4">
                <Input label="Meta title" value={s.seo?.metaTitle || ''} onChange={(e) => patch('seo', 'metaTitle', e.target.value)} />
                <Textarea label="Meta description" rows={2} value={s.seo?.metaDescription || ''} onChange={(e) => patch('seo', 'metaDescription', e.target.value)} />
              </div>
            </Panel>
          </div>
        </div>
      )}

      {section === 'payment' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Gateway status" subtitle="Read-only — configured through server environment variables">
            <ul className="space-y-2.5 text-[12px]">
              <li className="flex items-center justify-between">
                <span className="text-[var(--ink-muted)]">Razorpay</span>
                <StatusPill tone={data.integrations?.razorpay?.configured ? 'green' : 'amber'}>
                  {data.integrations?.razorpay?.configured ? 'Live keys configured' : 'Sandbox mode'}
                </StatusPill>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[var(--ink-muted)]">Mode</span>
                <span className="font-medium text-[var(--ink)]">{data.integrations?.razorpay?.mode}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[var(--ink-muted)]">Key id</span>
                <span className="font-mono text-[11px] text-[var(--ink)]">{data.integrations?.razorpay?.keyIdMasked || 'not set'}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[var(--ink-muted)]">Webhook secret</span>
                <StatusPill tone={data.integrations?.razorpay?.webhookConfigured ? 'green' : 'amber'}>
                  {data.integrations?.razorpay?.webhookConfigured ? 'Configured' : 'Not configured'}
                </StatusPill>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[var(--ink-muted)]">Media storage</span>
                <StatusPill tone={data.integrations?.cloudinary?.configured ? 'green' : 'neutral'}>{data.integrations?.cloudinary?.provider}</StatusPill>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[var(--ink-muted)]">Transactional email</span>
                <StatusPill tone={data.integrations?.mail?.configured ? 'green' : 'neutral'}>{data.integrations?.mail?.configured ? 'Configured' : 'Disabled'}</StatusPill>
              </li>
            </ul>
            <Alert variant="info" className="mt-3">
              Secret keys never leave the server. Add <code className="text-[11px]">RAZORPAY_KEY_ID</code> and <code className="text-[11px]">RAZORPAY_KEY_SECRET</code> to the backend <code className="text-[11px]">.env</code> to switch to live payments.
            </Alert>
          </Panel>
          <Panel title="Accepted methods" subtitle="Shown at checkout">
            <div className="space-y-3">
              {[
                ['upiEnabled', 'UPI'],
                ['cardsEnabled', 'Debit & credit cards'],
                ['netbankingEnabled', 'Net banking'],
                ['walletsEnabled', 'Wallets'],
              ].map(([key, label]) => (
                <Toggle key={key} label={label} checked={s.payment?.[key] !== false} onChange={(v) => patch('payment', key, v)} />
              ))}
              <div className="border-t border-[var(--line-color)] pt-3">
                <Toggle label="Cash on delivery" description="Disabled by design — every order must be prepaid and verified" checked={s.payment?.codEnabled === true} onChange={() => toast('COD is disabled for this store', 'info')} disabled />
              </div>
              <Input label="Provider" value={s.payment?.provider || 'razorpay'} onChange={(e) => patch('payment', 'provider', e.target.value)} />
            </div>
          </Panel>
        </div>
      )}

      {section === 'shipping' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Shipping charges">
            <div className="grid gap-4">
              <Input label="Shipping fee (₹)" type="number" value={s.shipping?.shippingCharge ?? 99} onChange={(e) => patch('shipping', 'shippingCharge', Number(e.target.value))} />
              <Input label="Free shipping above (₹)" type="number" value={s.shipping?.freeShippingThreshold ?? 1999} onChange={(e) => patch('shipping', 'freeShippingThreshold', Number(e.target.value))} />
              <Input label="Estimated delivery (days)" type="number" value={s.shipping?.estimatedDeliveryDays ?? 5} onChange={(e) => patch('shipping', 'estimatedDeliveryDays', Number(e.target.value))} />
              <Input label="Return window (days)" type="number" value={s.shipping?.returnWindowDays ?? 7} onChange={(e) => patch('shipping', 'returnWindowDays', Number(e.target.value))} />
            </div>
          </Panel>
          <Panel title="Delivery regions">
            <Input label="Regions served" value={(s.shipping?.deliveryRegions || []).join(', ')} onChange={(e) => patch('shipping', 'deliveryRegions', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} />
            <div className="mt-3 rounded-lg bg-[var(--surface-sunken)] p-3 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">
              <p className="font-medium text-[var(--ink)]">How the fee is calculated</p>
              <p className="mt-1">
                Orders at or above ₹{(s.shipping?.freeShippingThreshold ?? 1999).toLocaleString('en-IN')} ship free. Below that, a flat ₹{s.shipping?.shippingCharge ?? 99} is
                added at checkout. Free-shipping coupons override both rules.
              </p>
            </div>
          </Panel>
        </div>
      )}

      {section === 'notifications' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Email notifications" subtitle="Sent to customers and the care team">
            <div className="space-y-3">
              {[
                ['orderEmail', 'Order confirmation emails'],
                ['paymentEmail', 'Payment receipt emails'],
                ['registrationEmail', 'Welcome email on registration'],
              ].map(([key, label]) => (
                <Toggle key={key} label={label} checked={s.notifications?.[key] !== false} onChange={(v) => patch('notifications', key, v)} />
              ))}
            </div>
          </Panel>
          <Panel title="Admin alerts">
            <div className="space-y-3">
              <Toggle label="Low stock alerts" description="Notify the team when variants drop below threshold" checked={s.notifications?.lowStockAlert !== false} onChange={(v) => patch('notifications', 'lowStockAlert', v)} />
              <Toggle label="New review alerts" checked={s.notifications?.reviewAlert !== false} onChange={(v) => patch('notifications', 'reviewAlert', v)} />
              <Input label="Low stock threshold" type="number" value={s.notifications?.lowStockThreshold ?? 5} onChange={(e) => patch('notifications', 'lowStockThreshold', Number(e.target.value))} />
            </div>
          </Panel>
        </div>
      )}

      {section === 'security' && <SecuritySection admin={admin} refreshAdmin={refreshAdmin} />}

      {section !== 'security' && (
        <div className="sticky bottom-4 mt-5 flex justify-end">
          <Button onClick={save} loading={saving} icon={Save} size="lg">Save {title.toLowerCase()} settings</Button>
        </div>
      )}
    </div>
  );
}

function SecuritySection({ admin, refreshAdmin }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const history = (admin?.loginHistory || []).slice(-4).reverse();

  const change = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 8) return toast('New password must be at least 8 characters', 'error');
    if (form.newPassword !== form.confirm) return toast('Passwords do not match', 'error');
    setBusy(true);
    try {
      await authApi.adminChangePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast('Password changed');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      refreshAdmin?.();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not change the password'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <form onSubmit={change}>
        <Panel title="Change password" subtitle="Use at least 8 characters with a number and a symbol">
          <div className="space-y-4">
            <PasswordInput label="Current password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
            <PasswordInput label="New password" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
            <PasswordInput label="Confirm new password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
            <Button type="submit" loading={busy} icon={Lock}>Update password</Button>
          </div>
        </Panel>
      </form>

      <div className="space-y-4">
        <Panel title="Current session">
          <ul className="space-y-2 text-[11.5px]">
            <li className="flex justify-between"><span className="text-[var(--ink-muted)]">Signed in as</span><span className="font-medium text-[var(--ink)]">{admin?.email}</span></li>
            <li className="flex justify-between"><span className="text-[var(--ink-muted)]">Role</span><span className="font-medium text-[var(--ink)]">{admin?.role?.replace('_', ' ')}</span></li>
            <li className="flex justify-between"><span className="text-[var(--ink-muted)]">Last sign-in</span><span className="text-[var(--ink)]">{admin?.lastLoginAt ? formatDateTime(admin.lastLoginAt) : '—'}</span></li>
            <li className="flex justify-between"><span className="text-[var(--ink-muted)]">Permissions</span><span className="text-[var(--ink)]">{admin?.permissions?.length || 0}</span></li>
          </ul>
        </Panel>

        <Panel title="Protections in place">
          <ul className="space-y-2 text-[11.5px] text-[var(--ink-muted)]">
            {[
              'Passwords hashed with bcrypt — never stored in plain text',
              'Access tokens are short-lived; refresh tokens rotate on use',
              'All admin routes require a valid admin token and permission',
              'Every admin action is written to the audit log',
              'Rate limiting protects sign-in and checkout endpoints',
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Check size={12} className="mt-0.5 shrink-0 text-[#2F7A4D] dark:text-emerald-400" /> {t}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Recent sign-in attempts" subtitle="Kept on this account for your review">
          {history.length === 0 ? (
            <p className="text-[11.5px] text-[var(--ink-muted)]">No sign-in history recorded yet.</p>
          ) : (
            <ul className="space-y-1.5 text-[11px] text-[var(--ink-muted)]">
              {history.map((x, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span className="truncate">{x.userAgent?.slice(0, 42) || 'Unknown device'}</span>
                  <span className="shrink-0">
                    {formatDateTime(x.at)} {x.success === false ? '· failed' : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
