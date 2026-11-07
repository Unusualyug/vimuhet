import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Check, Globe, Mail, MapPin, Phone, Send, Video } from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';
import { miscApi } from '../services/endpoints.js';
import { apiErrorMessage } from '../services/api.js';
import { isEmail } from '../utils/validators.js';
import { TRUST_ITEMS } from '../constants/index.js';
import { useConsent } from '../context/ConsentContext.jsx';

const PAYMENT_BADGES = ['UPI', 'VISA', 'Mastercard', 'RuPay', 'Net Banking'];

export default function Footer() {
  const { general, categories, collections } = useStore();
  const { openSettings } = useConsent();
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ loading: false, done: false, error: '' });

  const subscribe = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) {
      setState({ loading: false, done: false, error: 'Please enter a valid email address' });
      return;
    }
    setState({ loading: true, done: false, error: '' });
    try {
      await miscApi.subscribe(email, 'footer');
      setState({ loading: false, done: true, error: '' });
      setEmail('');
    } catch (err) {
      setState({ loading: false, done: false, error: apiErrorMessage(err, 'Could not subscribe right now') });
    }
  };

  return (
    <footer className="mt-20 border-t border-[var(--line-color)] bg-[var(--surface-sunken)]">
      {/* Trust strip */}
      <div className="border-b border-[var(--line-color)]">
        <div className="container-page grid grid-cols-2 gap-x-4 gap-y-6 py-8 md:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--line-color)] bg-[var(--surface-raised)] text-[var(--accent)]">
                <TrustIcon name={item.icon} />
              </div>
              <div>
                <p className="text-[12.5px] font-semibold text-[var(--ink)]">{item.title}</p>
                <p className="text-[11px] text-[var(--ink-muted)]">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Link to="/" className="inline-flex flex-col leading-none">
            <span className="font-display text-2xl text-[var(--ink)]">Vimuhet</span>
            <span className="mt-1 text-[8px] uppercase tracking-[0.42em] text-[var(--accent)]">Premium Ethnic</span>
          </Link>
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-[var(--ink-muted)]">
            Premium ethnic wear for women — crafted in small batches with fabrics chosen for how they feel, not just how they photograph.
          </p>
          <div className="mt-5 space-y-2 text-[13px] text-[var(--ink-muted)]">
            <p className="flex items-start gap-2">
              <MapPin size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" />
              {general.address || 'Ahmedabad, Gujarat, India'}
            </p>
            <a href={`mailto:${general.email}`} className="flex items-center gap-2 hover:text-[var(--accent)]">
              <Mail size={14} className="shrink-0 text-[var(--accent)]" />
              {general.email}
            </a>
            <a href={`tel:${(general.phone || '').replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-[var(--accent)]">
              <Phone size={14} className="shrink-0 text-[var(--accent)]" />
              {general.phone}
            </a>
          </div>
          <div className="mt-5 flex items-center gap-2">
            {[Camera, Globe, Video].map((Icon, i) => (
              <a
                key={i}
                href={[general.social?.instagram, general.social?.facebook, general.social?.youtube][i] || '#'}
                target="_blank"
                rel="noreferrer"
                aria-label={["Instagram", "Facebook", "YouTube"][i]}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line-color)] text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Icon size={15} strokeWidth={1.7} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--ink)]">Shop</h4>
          <ul className="space-y-2.5 text-[13px] text-[var(--ink-muted)]">
            {categories.slice(0, 6).map((c) => (
              <li key={c._id}>
                <Link to={`/category/${c.slug}`} className="link-underline hover:text-[var(--accent)]">{c.name}</Link>
              </li>
            ))}
            <li><Link to="/shop" className="link-underline hover:text-[var(--accent)]">Shop All</Link></li>
            <li><Link to="/collections" className="link-underline hover:text-[var(--accent)]">Collections</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--ink)]">Customer Care</h4>
          <ul className="space-y-2.5 text-[13px] text-[var(--ink-muted)]">
            <li><Link to="/contact" className="link-underline hover:text-[var(--accent)]">Contact Us</Link></li>
            <li><Link to="/track-order" className="link-underline hover:text-[var(--accent)]">Track Order</Link></li>
            <li><Link to="/faqs" className="link-underline hover:text-[var(--accent)]">FAQs</Link></li>
            <li><Link to="/shipping-policy" className="link-underline hover:text-[var(--accent)]">Shipping Policy</Link></li>
            <li><Link to="/return-policy" className="link-underline hover:text-[var(--accent)]">Returns & Refunds</Link></li>
            <li><Link to="/account/orders" className="link-underline hover:text-[var(--accent)]">My Orders</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--ink)]">Join the Circle</h4>
          <p className="text-[13px] leading-relaxed text-[var(--ink-muted)]">
            Early access to collections, private sales and styling notes — no noise.
          </p>
          <form onSubmit={subscribe} className="mt-4">
            <div className="flex items-center gap-2 rounded-full border border-[var(--line-color)] bg-[var(--surface-raised)] p-1 pl-4">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setState((s) => ({ ...s, error: '', done: false }));
                }}
                placeholder="Enter your email"
                aria-label="Email address for newsletter"
                className="h-9 w-full min-w-0 bg-transparent text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70 focus:outline-none"
              />
              <button
                type="submit"
                disabled={state.loading}
                aria-label="Subscribe"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition hover:bg-[#5f0f24] disabled:opacity-60 dark:text-[#1a1113]"
              >
                {state.done ? <Check size={15} /> : <Send size={14} />}
              </button>
            </div>
            {state.error && <p className="mt-2 text-[11px] text-red-500">{state.error}</p>}
            {state.done && <p className="mt-2 text-[11px] text-[#2F7A4D] dark:text-emerald-400">You are on the list. Welcome to Vimuhet.</p>}
          </form>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {PAYMENT_BADGES.map((b) => (
              <span key={b} className="rounded border border-[var(--line-color)] bg-[var(--surface-raised)] px-2 py-1 text-[9.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--line-color)]">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-5 text-[11.5px] text-[var(--ink-muted)] sm:flex-row">
          <p>© {new Date().getFullYear()} Vimuhet. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link to="/privacy-policy" className="hover:text-[var(--accent)]">Privacy Policy</Link>
            <Link to="/cookie-policy" className="hover:text-[var(--accent)]">Cookie Policy</Link>
            <button
              type="button"
              onClick={openSettings}
              className="hover:text-[var(--accent)] underline-offset-2 hover:underline"
            >
              Cookie Settings
            </button>
            <Link to="/terms" className="hover:text-[var(--accent)]">Terms & Conditions</Link>
            <Link to="/return-policy" className="hover:text-[var(--accent)]">Refund Policy</Link>
          </div>
          <p className="text-[10.5px] uppercase tracking-[0.14em]">Secure payments by Razorpay</p>
        </div>
      </div>
    </footer>
  );
}

function TrustIcon({ name }) {
  const common = { size: 17, strokeWidth: 1.7 };
  const icons = {
    Truck: <TruckIcon {...common} />,
    ShieldCheck: <ShieldIcon {...common} />,
    RotateCcw: <ReturnIcon {...common} />,
    Gift: <GiftIcon {...common} />,
  };
  return icons[name] || icons.Truck;
}

const TruckIcon = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 18V6H2v12h12Zm0-8h4l4 4v4h-8" /><circle cx="5.5" cy="18.5" r="1.5" /><circle cx="17.5" cy="18.5" r="1.5" /></svg>
);
const ShieldIcon = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" /><path d="m9 12 2 2 4-4" /></svg>
);
const ReturnIcon = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
);
const GiftIcon = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M3 12h18M12 8v13M12 8S9 3 6.5 5.5 9 8 12 8Zm0 0s3-5 5.5-2.5S15 8 12 8Z" /></svg>
);
