import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { Input, PasswordInput, Checkbox } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/States.jsx';
import { isEmail } from '../../utils/validators.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function AdminLogin() {
  useDocumentTitle('Admin Sign In', 'Vimuhet administration.');
  const { admin, loading, login } = useAdminAuth();
  useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && admin) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!isEmail(form.email)) next.email = 'Enter a valid work email';
    if (!form.password) next.password = 'Password is required';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    setServerError('');
    try {
      await login({ email: form.email, password: form.password });
      navigate('/admin', { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-[#3d101d] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#D9A5A5]/20" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full border border-[#D9A5A5]/10" />
        <Link to="/" className="relative flex flex-col leading-none">
          <span className="font-display text-2xl text-[#FFF9F3]">Vimuhet</span>
          <span className="mt-1 text-[8px] uppercase tracking-[0.42em] text-[#D9A5A5]">Admin Suite</span>
        </Link>
        <div className="relative max-w-sm">
          <h2 className="font-display text-[34px] leading-tight text-[#FFF9F3]">Run the store with clarity.</h2>
          <p className="mt-3 text-[13px] leading-relaxed text-[#F7E2DF]/70">
            Orders, inventory, customers and live traffic — one calm workspace built for the Vimuhet team.
          </p>
          <ul className="mt-7 space-y-3">
            {[
              { icon: TrendingUp, text: 'Revenue, conversion and traffic at a glance' },
              { icon: ShieldCheck, text: 'Role-based permissions and audit trails' },
              { icon: Users, text: 'Every customer detail in a single timeline' },
            ].map((i) => (
              <li key={i.text} className="flex items-center gap-2.5 text-[12px] text-[#F7E2DF]/80">
                <i.icon size={14} className="text-[#D9A5A5]" /> {i.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[10.5px] text-[#F7E2DF]/40">Authorised personnel only. All access is logged.</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-[var(--surface)] px-5 py-12">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="mb-7 lg:hidden">
            <span className="font-display text-xl text-[var(--ink)]">Vimuhet</span>
            <span className="ml-2 text-[8px] uppercase tracking-[0.3em] text-[var(--accent)]">Admin</span>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Administration</p>
          <h1 className="mt-1.5 font-display text-[27px] leading-tight text-[var(--ink)]">Sign in to the console</h1>
          <p className="mt-1.5 text-[12.5px] text-[var(--ink-muted)]">Use your work email and password to continue.</p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {serverError && <Alert variant="error">{serverError}</Alert>}
            <Input label="Work email" type="email" icon={Mail} autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} placeholder="admin@vimuhet.com" />
            <PasswordInput label="Password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
            <div className="flex items-center justify-between">
              <Checkbox label="Keep me signed in" checked={form.remember} onChange={() => setForm({ ...form, remember: !form.remember })} />
              <span className="flex items-center gap-1 text-[10.5px] text-[var(--ink-muted)]">
                <Lock size={10} /> JWT protected
              </span>
            </div>
            <Button type="submit" className="w-full" size="lg" loading={busy}>
              Sign in
            </Button>
          </form>

          <div className="mt-5 rounded-lg border border-dashed border-[var(--line-color)] bg-[var(--surface-sunken)] p-3 text-[11px] leading-relaxed text-[var(--ink-muted)]">
            <strong className="text-[var(--ink)]">Demo admin:</strong> admin@vimuhet.com / Admin@12345
          </div>
          <p className="mt-6 text-center text-[11px] text-[var(--ink-muted)]">
            <Link to="/" className="text-[var(--accent)] hover:underline">← Back to storefront</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
