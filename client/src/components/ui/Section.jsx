import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function SectionHeading({ eyebrow, title, subtitle, action, actionTo, actionLabel, align = 'between', className = '' }) {
  const alignment = align === 'center' ? 'items-center text-center' : align === 'left' ? 'items-start' : 'items-end justify-between';
  return (
    <div className={`mb-8 flex flex-col gap-4 md:flex-row ${alignment} ${className}`}>
      <div className={align === 'center' ? 'max-w-2xl' : 'max-w-xl'}>
        {eyebrow && (
          <div className={`mb-2.5 flex items-center gap-2.5 ${align === 'center' ? 'justify-center' : ''}`}>
            <span className="h-px w-8 bg-[var(--accent)]/40" />
            <span className="eyebrow">{eyebrow}</span>
            {align === 'center' && <span className="h-px w-8 bg-[var(--accent)]/40" />}
          </div>
        )}
        <h2 className="font-display text-[26px] leading-[1.15] text-[var(--ink)] sm:text-[32px] lg:text-[36px]">{title}</h2>
        {subtitle && <p className="mt-2.5 text-[13.5px] leading-relaxed text-[var(--ink-muted)] sm:text-sm">{subtitle}</p>}
      </div>
      {(actionTo || action) && (
        <Link
          to={actionTo || '#'}
          onClick={action}
          className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--line-color)] px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {actionLabel || 'View All'}
          <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

/* A shared 0.55s reveal, matched exactly to the original easing and timing so
   the page looks identical — but driven only by opacity and translateY, both of
   which the compositor can animate without touching layout. */
export function FadeIn({ children, delay = 0, y = 18, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: 'opacity, transform' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Section({ children, className = '', container = true }) {
  return <section className={`py-12 md:py-16 ${className}`}>{container ? <div className="container-page">{children}</div> : children}</section>;
}

export function Divider({ className = '' }) {
  return <div className={`hairline my-12 ${className}`} />;
}

export default Section;
