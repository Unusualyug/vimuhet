import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, Mail } from 'lucide-react';
import AuthLayout from './AuthLayout.jsx';
import { Input, PasswordInput, Checkbox, FieldError } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { authApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { isEmail, passwordStrength } from '../../utils/validators.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import {
  CHECKOUT_LOGIN_MESSAGE,
  isCheckoutPath,
  loginUrlFor,
  registerUrlFor,
} from '../../utils/checkoutIntent.js';

/**
 * Shown only when the visitor arrived here from a checkout action. It states the
 * requirement plainly and offers both ways forward without a modal interruption.
 */
function CheckoutNotice() {
  return (
    <div className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/[0.06] p-3.5">
      <p className="text-[12.5px] font-medium leading-relaxed text-[var(--ink)]">
        {CHECKOUT_LOGIN_MESSAGE}
      </p>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">
        Your bag and wishlist are saved and will be waiting for you.
      </p>
    </div>
  );
}

/* ---------------------------------- Login --------------------------------- */

export function Login() {
  useDocumentTitle('Sign In', 'Sign in to your Vimuhet account.');
  const { login } = useAuth();
  const { refresh } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/account';
  /* Set by the checkout guards (bag drawer, bag page, Buy Now). It changes the
     framing copy only - the form, validation and session handling are unchanged. */
  const checkoutIntent = searchParams.get('intent') === 'checkout' || isCheckoutPath(redirect);
  const registerHref = registerUrlFor(redirect, { checkoutIntent });
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!isEmail(form.email)) next.email = 'Enter a valid email address';
    if (!form.password) next.password = 'Password is required';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    setServerError('');
    try {
      await login(form);
      await refresh();
      navigate(redirect, { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={checkoutIntent ? 'Sign in to complete your order' : 'Welcome back'}
      subtitle={
        checkoutIntent
          ? 'Your bag is saved exactly as you left it.'
          : 'Sign in to track orders, save pieces and check out faster.'
      }
      footer={
        <p>
          New to Vimuhet?{' '}
          <Link to={registerHref} className="font-medium text-[var(--accent)] hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {checkoutIntent && <CheckoutNotice />}
        {serverError && <Alert variant="error">{serverError}</Alert>}
        <Input label="Email or mobile" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} placeholder="you@example.com" />
        <PasswordInput label="Password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} placeholder="••••••••" />
        <div className="flex items-center justify-between">
          <Checkbox label="Keep me signed in" checked={form.remember} onChange={() => setForm({ ...form, remember: !form.remember })} />
          <Link to="/forgot-password" className="text-[11.5px] font-medium text-[var(--accent)] hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Sign In
        </Button>
        <p className="text-center text-[11px] leading-relaxed text-[var(--ink-muted)]">
          By continuing you agree to our{' '}
          <Link to="/terms" className="text-[var(--accent)] hover:underline">Terms</Link> and{' '}
          <Link to="/privacy-policy" className="text-[var(--accent)] hover:underline">Privacy Policy</Link>.
        </p>
        <div className="rounded-lg border border-dashed border-[var(--line-color)] bg-[var(--surface-sunken)] p-3 text-[11px] leading-relaxed text-[var(--ink-muted)]">
          <strong className="text-[var(--ink)]">Demo account:</strong> riya@example.com / Customer@123
        </div>
      </form>
    </AuthLayout>
  );
}

/* -------------------------------- Register -------------------------------- */

export function Register() {
  useDocumentTitle('Create Account', 'Create your Vimuhet account.');
  const { register } = useAuth();
  const { refresh } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/account';
  const checkoutIntent = searchParams.get('intent') === 'checkout' || isCheckoutPath(redirect);
  const loginHref = loginUrlFor(redirect, { intent: checkoutIntent ? 'checkout' : null });
  const [form, setForm] = useState({ fullName: '', email: '', mobile: '', password: '', confirm: '', terms: false, marketingOptIn: true });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const strength = passwordStrength(form.password);

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.fullName.trim().length < 2) next.fullName = 'Enter your full name';
    if (!isEmail(form.email)) next.email = 'Enter a valid email address';
    if (form.mobile && !/^[0-9+\-\s]{10,15}$/.test(form.mobile)) next.mobile = 'Enter a valid mobile number';
    if (form.password.length < 8) next.password = 'Use at least 8 characters';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) next.password = 'Include at least one letter and one number';
    if (form.password !== form.confirm) next.confirm = 'Passwords do not match';
    if (!form.terms) next.terms = 'Please accept the terms to continue';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    setServerError('');
    try {
      await register({ fullName: form.fullName, email: form.email, mobile: form.mobile, password: form.password, marketingOptIn: form.marketingOptIn });
      await refresh();
      navigate(redirect, { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={checkoutIntent ? 'Create an account to check out' : 'Create your account'}
      subtitle={
        checkoutIntent
          ? 'Your bag and wishlist come with you — we will return you straight to checkout.'
          : 'One account for orders, addresses, reviews and your wishlist.'
      }
      image="/media/banners/hero-2-2000.jpg"
      footer={
        <p>
          Already have an account?{' '}
          <Link to={loginHref} className="font-medium text-[var(--accent)] hover:underline">Sign in</Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {checkoutIntent && <CheckoutNotice />}
        {serverError && <Alert variant="error">{serverError}</Alert>}
        <Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} error={errors.fullName} autoComplete="name" />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} autoComplete="email" />
        <Input label="Mobile (optional)" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} error={errors.mobile} autoComplete="tel" />
        <div>
          <PasswordInput label="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} autoComplete="new-password" />
          {form.password && (
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={`h-1 flex-1 rounded-full ${strength >= i ? (strength >= 3 ? 'bg-[#2F7A4D]' : 'bg-amber-500') : 'bg-[var(--line-color)]'}`} />
              ))}
            </div>
          )}
        </div>
        <PasswordInput label="Confirm password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={errors.confirm} autoComplete="new-password" />
        <div className="space-y-2">
          <Checkbox
            label={<span>I agree to the <Link to="/terms" className="text-[var(--accent)] hover:underline">Terms</Link> and <Link to="/privacy-policy" className="text-[var(--accent)] hover:underline">Privacy Policy</Link></span>}
            checked={form.terms}
            onChange={() => setForm({ ...form, terms: !form.terms })}
          />
          <FieldError>{errors.terms}</FieldError>
          <Checkbox label="Email me new arrivals and private sales" checked={form.marketingOptIn} onChange={() => setForm({ ...form, marketingOptIn: !form.marketingOptIn })} />
        </div>
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Create Account
        </Button>
      </form>
    </AuthLayout>
  );
}

/* ----------------------------- Forgot password ---------------------------- */

export function ForgotPassword() {
  useDocumentTitle('Forgot Password', 'Reset your Vimuhet password.');
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ loading: false, done: false, error: '' });

  const submit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) {
      setState({ loading: false, done: false, error: 'Enter a valid email address' });
      return;
    }
    setState({ loading: true, done: false, error: '' });
    try {
      await authApi.forgot(email);
      setState({ loading: false, done: true, error: '' });
    } catch (err) {
      setState({ loading: false, done: false, error: apiErrorMessage(err) });
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email on your account and we will send a secure reset link."
      footer={<Link to="/login" className="text-[var(--accent)] hover:underline">Back to sign in</Link>}
    >
      {state.done ? (
        <div className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#2F7A4D]/12 text-[#2F7A4D] dark:text-emerald-400">
            <Mail size={20} />
          </span>
          <p className="mt-4 text-sm font-medium">Check your inbox</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
            If an account exists for {email}, a reset link is on its way. The link expires in 30 minutes.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {state.error && <Alert variant="error">{state.error}</Alert>}
          <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <Button type="submit" className="w-full" size="lg" loading={state.loading}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

/* ------------------------------ Reset password ---------------------------- */

export function ResetPassword() {
  useDocumentTitle('Set New Password', 'Choose a new password for your Vimuhet account.');
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [state, setState] = useState({ loading: false, error: '', done: false });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setState({ loading: false, error: 'Use at least 8 characters', done: false });
      return;
    }
    if (form.password !== form.confirm) {
      setState({ loading: false, error: 'Passwords do not match', done: false });
      return;
    }
    setState({ loading: true, error: '', done: false });
    try {
      await authApi.reset({ token, password: form.password });
      setState({ loading: false, error: '', done: true });
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err) {
      setState({ loading: false, error: apiErrorMessage(err, 'This reset link is invalid or has expired'), done: false });
    }
  };

  return (
    <AuthLayout title="Choose a new password" subtitle="Use at least 8 characters with a letter and a number." footer={<Link to="/login" className="text-[var(--accent)] hover:underline">Back to sign in</Link>}>
      {state.done ? (
        <div className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#2F7A4D]/12 text-[#2F7A4D] dark:text-emerald-400">
            <Check size={20} />
          </span>
          <p className="mt-4 text-sm font-medium">Password updated</p>
          <p className="mt-1 text-[12.5px] text-[var(--ink-muted)]">Taking you to the sign-in page…</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {state.error && <Alert variant="error">{state.error}</Alert>}
          <PasswordInput label="New password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
          <PasswordInput label="Confirm new password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" />
          <Button type="submit" className="w-full" size="lg" loading={state.loading}>
            Update password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

/* ------------------------------- Verify email ----------------------------- */

export function VerifyEmail() {
  useDocumentTitle('Verify Email', 'Confirm your email address.');
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, ok: false, message: '' });

  useEffect(() => {
    if (!token) {
      setState({ loading: false, ok: false, message: 'This verification link is incomplete.' });
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => setState({ loading: false, ok: true, message: 'Your email is verified. Thank you!' }))
      .catch((err) => setState({ loading: false, ok: false, message: apiErrorMessage(err, 'This link is invalid or has expired.') }));
  }, [token]);

  return (
    <AuthLayout title="Email verification" subtitle="Confirming your email address keeps your account secure.">
      <div className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-6 text-center">
        <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${state.ok ? 'bg-[#2F7A4D]/12 text-[#2F7A4D] dark:text-emerald-400' : 'bg-[var(--surface-sunken)] text-[var(--ink-muted)]'}`}>
          <Mail size={20} />
        </span>
        <p className="mt-4 text-sm font-medium">{state.loading ? 'Verifying…' : state.ok ? 'Verified' : 'Verification failed'}</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink-muted)]">{state.message}</p>
        <Button to="/account" size="md" className="mt-5">Go to my account</Button>
      </div>
    </AuthLayout>
  );
}

export default Login;
