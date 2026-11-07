import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const POINTS = [
  'Track every order in one place',
  'Save addresses for faster checkout',
  'Keep a wishlist across devices',
];

export default function AuthLayout({ title, subtitle, children, footer, image = '/media/banners/hero-1-2000.jpg' }) {
  return (
    <div className="grid min-h-[calc(100vh-140px)] grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-flex flex-col leading-none">
            <span className="font-display text-2xl text-[var(--ink)]">Vimuhet</span>
            <span className="mt-1 text-[8px] uppercase tracking-[0.42em] text-[var(--accent)]">Premium Ethnic</span>
          </Link>
          <h1 className="font-display text-[28px] leading-tight sm:text-[32px]">{title}</h1>
          {subtitle && <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-muted)]">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 text-[12.5px] text-[var(--ink-muted)]">{footer}</div>}
        </motion.div>
      </div>

      <div className="relative hidden overflow-hidden lg:block">
        <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#3d101d]/85 via-[#3d101d]/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-[#FFF9F3]">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#D9A5A5]">The Vimuhet Circle</p>
          <p className="mt-3 max-w-sm font-display text-[26px] leading-snug">Beautiful things, kept thoughtfully.</p>
          <ul className="mt-5 space-y-2">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-2 text-[12.5px] text-[#F7E2DF]/90">
                <Check size={13} className="text-[#D9A5A5]" /> {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
