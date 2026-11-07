import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Breadcrumbs } from '../ui/States.jsx';
import { bannerSet } from '../../utils/format.js';

export default function PageHero({ eyebrow, title, accent, description, image, breadcrumbs = [], align = 'left', compact = false }) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--line-color)] bg-[var(--surface-sunken)]">
      {image && (
        <>
          <img
            {...bannerSet(image)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-right opacity-70 sm:opacity-90"
            loading="eager"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface-sunken)] from-45% via-[var(--surface-sunken)]/80 via-75% to-transparent" />
        </>
      )}
      <div className={`container-page relative ${compact ? 'py-8 md:py-10' : 'py-10 md:py-14'}`}>
        {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={`mt-3 max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}
        >
          {eyebrow && (
            <div className={`mb-2.5 flex items-center gap-2.5 ${align === 'center' ? 'justify-center' : ''}`}>
              <span className="h-px w-8 bg-[var(--accent)]/50" />
              <span className="eyebrow">{eyebrow}</span>
            </div>
          )}
          <h1 className={`font-display leading-[1.1] text-[var(--ink)] ${compact ? 'text-[26px] sm:text-[32px]' : 'text-[30px] sm:text-[38px] lg:text-[44px]'}`}>
            {title}{' '}
            {accent && <span className="italic text-[var(--accent)]">{accent}</span>}
          </h1>
          {description && <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--ink-muted)] sm:text-sm">{description}</p>}
        </motion.div>
      </div>
    </section>
  );
}

export function CategoryStrip({ categories = [], activeSlug }) {
  return (
    <div className="border-b border-[var(--line-color)] bg-[var(--surface)]">
      <div className="container-page flex gap-2 overflow-x-auto py-3 no-scrollbar">
        <Link
          to="/shop"
          className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] transition ${
            !activeSlug ? 'border-[var(--accent)] bg-[var(--accent)] text-white dark:text-[#1a1113]' : 'border-[var(--line-color)] hover:border-[var(--accent)]'
          }`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c._id}
            to={`/category/${c.slug}`}
            className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-medium tracking-[0.04em] transition ${
              activeSlug === c.slug
                ? 'border-[var(--accent)] bg-[var(--accent)] text-white dark:text-[#1a1113]'
                : 'border-[var(--line-color)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
