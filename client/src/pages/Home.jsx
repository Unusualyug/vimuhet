import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Crown,
  Flower2,
  Layers,
  Leaf,
  Sparkles,
  Star,
  Shirt,
  Star as StarIcon,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';
import { useQuickView } from '../context/QuickViewContext.jsx';
import { ProductCard } from '../components/ui/ProductCard.jsx';
import Button from '../components/ui/Button.jsx';
import { SectionHeading, FadeIn } from '../components/ui/Section.jsx';
import { ProductGridSkeleton, HeroSkeleton } from '../components/ui/Skeletons.jsx';
import { ErrorState } from '../components/ui/States.jsx';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { inr, bannerSet, imageSet } from '../utils/format.js';

const COLLECTION_ICONS = { Shirt, Sparkles, Crown, Leaf, Flower2, Layers, Briefcase: Layers };
const FALLBACK_ICONS = [Shirt, Sparkles, Crown, Layers, Leaf, Flower2];

/* ------------------------------- Hero carousel ------------------------------- */

/**
 * Campaign artwork (`hero-1/2/3`) is one asymmetric 2000×900 composition: the
 * left ~60% is empty ivory wall reserved for the headline and the model stands
 * in the right ~30%.
 *
 * The hero therefore renders as two real layouts instead of one stretched
 * background:
 *   · < lg  — copy first, artwork below it in its own band, cropped horizontally
 *             only, anchored on the model so she is never cut or hidden.
 *   · ≥ lg  — copy on the left, artwork full bleed with the model pinned to the
 *             right edge, and a wash that only spans the artwork's own empty
 *             wall lane (60%) so nothing is painted over her.
 */

function Hero({ slides = [] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;

  const next = useCallback(() => setIndex((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + total) % total), [total]);

  useEffect(() => {
    if (paused || total < 2) return undefined;
    const t = setInterval(next, 7000);
    return () => clearInterval(t);
  }, [paused, next, total]);

  if (!total) return null;
  const slide = slides[index];
  const slideKey = slide._id || index;
  const desktopArt = slide.image?.url || '/media/banners/hero-1-2000.jpg';
  const mobileArt = slide.mobileImage?.url || desktopArt;
  const artAlt = slide.title ? `${slide.title} ${slide.titleAccent || ''}`.trim() : 'Vimuhet campaign';

  return (
    <section
      className="relative bg-[var(--surface-sunken)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured campaigns"
    >
      <div className="relative flex flex-col lg:block lg:h-[560px]">
        {/* ------------------------------ Artwork ------------------------------
            One <img> serves both layouts. Below lg it sits in its own band under
            the copy at a 3:2 crop; from lg it fills the hero, anchored on the
            right edge so the model's pose lands inside the frame exactly as
            composed. Only the horizontal crop is ever tightened. */}
        <div className="relative order-2 aspect-[4/5] max-h-[54vh] w-full overflow-hidden bg-[var(--surface-sunken)] sm:max-h-[62vh] lg:absolute lg:inset-0 lg:order-none lg:h-full lg:max-h-none lg:aspect-auto">
          <AnimatePresence initial={false}>
            <motion.div
              key={slideKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              {/* Below lg: the portrait derivative (same photograph, framed for a
                  phone) so nothing is sliced. Falls back to the campaign art,
                  anchored on the model, when no mobile image is set. */}
              <img
                {...bannerSet(mobileArt, '(max-width: 1023px) 100vw, 100vw')}
                alt={artAlt}
                className="h-full w-full object-cover object-top lg:hidden"
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
              />
              <img
                {...bannerSet(desktopArt, '100vw')}
                alt=""
                aria-hidden="true"
                className="hidden h-full w-full object-cover object-[100%_50%] lg:block"
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
              />
            </motion.div>
          </AnimatePresence>
          {/* Feathered seam with the copy above — replaces the old full-bleed
              wash that used to grey out the headline in dark mode. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[var(--surface-sunken)]/70 to-transparent lg:hidden" />
          {/* Desktop wash — confined to the artwork's empty wall lane so the
              model (right third of the frame) is never painted over. Light mode
              feathers into the copy; dark mode joins on a short, deliberate ramp
              instead of a long grey gradient, which used to read as murk. */}
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[62%] bg-gradient-to-r from-[var(--surface-sunken)] from-45% to-transparent lg:block dark:hidden" />
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[58%] bg-[#16100f] dark:lg:block" />
          <div className="pointer-events-none absolute inset-y-0 left-[58%] hidden w-40 bg-gradient-to-r from-[#16100f] from-35% to-transparent dark:lg:block" />
          <div className="pointer-events-none absolute inset-y-0 left-[58%] right-0 hidden bg-[#16100f]/20 dark:lg:block" />
        </div>

        {/* -------------------------------- Copy -------------------------------- */}
        <div className="order-1 lg:absolute lg:inset-0 lg:order-none lg:pointer-events-none">
          <div className="container-page flex h-full items-center">
            <motion.div
              key={`copy-${index}`}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-full py-9 sm:py-11 lg:max-w-xl lg:py-10 lg:pointer-events-auto"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px w-10 bg-[var(--accent)]" />
                <span className="eyebrow">{slide.eyebrow || 'Premium Ethnic Wear'}</span>
              </div>
              <h1 className="font-display text-[34px] leading-[1.06] text-[var(--ink)] sm:text-[52px] lg:text-[62px]">
                {slide.title}{' '}
                {slide.titleAccent && (
                  <span className="relative inline-block italic text-[var(--accent)]">
                    {slide.titleAccent}
                    <svg
                      className="absolute -bottom-2 left-0 h-3 w-full text-[var(--muted-rose)]"
                      viewBox="0 0 200 12"
                      fill="none"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path d="M2 8c40-6 80-6 120-2 26 2.6 46 2 76-2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </span>
                )}
              </h1>
              <p className="mt-5 max-w-md text-[14px] leading-relaxed text-[var(--ink-muted)] sm:text-[15px]">{slide.subtitle}</p>
              <div className="mt-7 flex flex-col items-stretch gap-3 min-[420px]:flex-row min-[420px]:items-center sm:mt-8">
                <Button to={slide.primaryCta?.to || '/shop'} size="md" className="w-full min-[420px]:w-auto min-[420px]:flex-1 sm:flex-none sm:h-12 sm:px-8">
                  {slide.primaryCta?.label || 'Shop Now'}
                </Button>
                <Button to={slide.secondaryCta?.to || '/collections'} variant="secondary" size="md" className="w-full min-[420px]:w-auto min-[420px]:flex-1 sm:flex-none sm:h-12 sm:px-8">
                  {slide.secondaryCta?.label || 'Explore Collection'}
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Controls live in the copy column so they never sit on the artwork. */}
          {total > 1 && (
            <div className="container-page">
              <div className="flex items-center gap-2 pb-5 lg:pb-0 lg:pt-2">
                {slides.map((s, i) => (
                  <button
                    key={s._id || i}
                    onClick={() => setIndex(i)}
                    aria-label={`Go to slide ${i + 1} of ${total}`}
                    aria-current={i === index}
                    className="group flex h-8 min-w-6 cursor-pointer items-center justify-center px-0.5 lg:h-11"
                  >
                    <span
                      className={`block h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                        i === index ? 'w-7 bg-[var(--accent)]' : 'w-1.5 bg-[var(--ink-muted)]/40 group-hover:bg-[var(--ink-muted)]/70'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Desktop arrows: vertically centred on the copy, clear of the model. */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous slide"
              className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line-color)] bg-[var(--surface-raised)]/85 text-[var(--ink)] backdrop-blur transition hover:border-[var(--accent)] hover:text-[var(--accent)] lg:flex"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              aria-label="Next slide"
              className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line-color)] bg-[var(--surface-raised)]/85 text-[var(--ink)] backdrop-blur transition hover:border-[var(--accent)] hover:text-[var(--accent)] lg:flex"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/* ---------------------------- Featured collections --------------------------- */

function FeaturedCollections({ collections = [], loading = false }) {
  /* While the collections request is in flight the section used to collapse to
     nothing and then insert itself above New Arrivals — ~540px of content
     appearing under the hero, which shoved everything below it down. Rendering
     the same six-tile grid as a placeholder reserves the exact space, so the
     swap is invisible. Same shell, same dimensions, same heading. */
  if (!collections.length) {
    if (!loading) return null;
    return (
      <section className="container-page py-14 md:py-16" aria-busy="true">
        <SectionHeading
          eyebrow="Explore Our Collections"
          title="Curated Collections for You"
          subtitle="Six edits, each built around a mood — from quiet workday minimalism to hand-embroidered celebration."
          actionTo="/collections"
          actionLabel="View All Collections"
          align="center"
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] overflow-hidden rounded-xl">
              <div className="skeleton h-full w-full rounded-none" />
            </div>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className="container-page py-14 md:py-16">
      <SectionHeading
        eyebrow="Explore Our Collections"
        title="Curated Collections for You"
        subtitle="Six edits, each built around a mood — from quiet workday minimalism to hand-embroidered celebration."
        actionTo="/collections"
        actionLabel="View All Collections"
        align="center"
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
        {collections.slice(0, 6).map((c, i) => {
          const Icon = COLLECTION_ICONS[c.icon] || FALLBACK_ICONS[i % FALLBACK_ICONS.length];
          return (
            <FadeIn key={c._id} delay={i * 0.05}>
              <Link to={`/collection/${c.slug}`} className="group relative block overflow-hidden rounded-xl">
                <div className="relative aspect-[3/4] overflow-hidden bg-[var(--surface-sunken)]">
                  <img
                    {...imageSet(c.image?.url, { sizes: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw' })}
                    alt={c.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#3d101d]/85 via-[#3d101d]/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3.5 text-[#FFF9F3]">
                    <Icon size={18} className="mb-2 opacity-90" strokeWidth={1.5} />
                    <p className="font-display text-[15px] leading-tight sm:text-[16.5px]">{c.name}</p>
                    <span className="mt-1 flex items-center gap-1 text-[9.5px] uppercase tracking-[0.16em] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      Explore <ArrowRight size={10} />
                    </span>
                  </div>
                </div>
              </Link>
            </FadeIn>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------- Product band ------------------------------- */

function ProductBand({ eyebrow, title, subtitle, products = [], actionTo, columns = 4, loading }) {
  const { openQuickView } = useQuickView();
  if (loading) {
    return (
      <section className="container-page py-10">
        <ProductGridSkeleton count={columns} />
      </section>
    );
  }
  if (!products.length) return null;
  return (
    <section className="container-page py-12 md:py-14">
      <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} actionTo={actionTo} actionLabel="View All" />
      <div className={`grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 ${columns === 4 ? 'md:grid-cols-3 xl:grid-cols-4' : 'lg:grid-cols-4'}`}>
        {products.map((p, i) => (
          <ProductCard key={p._id} product={p} onQuickView={openQuickView} priority={i < 2} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------- Promo banner ------------------------------- */

function PromoBanner({ promo }) {
  if (!promo?.enabled) return null;
  return (
    <section className="container-page py-6">
      <FadeIn>
        <div className="relative overflow-hidden rounded-2xl bg-[#3d101d]">
          <img
            {...bannerSet(promo.image?.url || '/media/banners/promo-festive-2000.jpg')}
            alt={promo.title || 'Featured promotion'}
            loading="lazy"
            decoding="async"
            className="h-[280px] w-full object-cover object-right opacity-95 sm:h-[320px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#3d101d] via-[#3d101d]/80 to-transparent sm:via-[#3d101d]/60" />
          <div className="absolute inset-0 flex items-center">
            <div className="container-page">
              <div className="max-w-md text-[#FFF9F3]">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="h-px w-8 bg-[#D9A5A5]" />
                  <span className="text-[10px] uppercase tracking-[0.28em] text-[#D9A5A5]">Limited Edit</span>
                </div>
                <h3 className="font-display text-[28px] leading-tight sm:text-[36px]">{promo.title}</h3>
                <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-[#F7E2DF]/85">{promo.subtitle}</p>
                <Button to={promo.cta?.to || '/collections'} variant="dark" size="md" className="mt-6 bg-[#FFF9F3] text-[#3d101d] hover:bg-white">
                  {promo.cta?.label || 'Shop the edit'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

/* -------------------------------- Brand story ------------------------------- */

function BrandStory({ story }) {
  if (!story?.enabled) return null;
  return (
    <section className="container-page py-14">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
        <FadeIn>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl">
              <img
                {...imageSet(story.image?.url || '/media/banners/brand-story-1000.jpg', {
                  sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 46vw',
                })}
                alt="Hand embroidery at the Vimuhet studio"
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full object-cover sm:aspect-[5/4] lg:aspect-[4/5]"
              />
            </div>
            <div className="absolute -bottom-5 -right-2 hidden rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] px-5 py-4 shadow-[var(--shadow-soft)] sm:block">
              <p className="font-display text-xl text-[var(--accent)]">Small‑batch</p>
              <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.16em] text-[var(--ink-muted)]">Craft-led production</p>
            </div>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="h-px w-8 bg-[var(--accent)]/50" />
              <span className="eyebrow">Our Story</span>
            </div>
            <h2 className="font-display text-[27px] leading-tight sm:text-[34px]">{story.title}</h2>
            <p className="mt-4 text-[13.5px] leading-relaxed text-[var(--ink-muted)] sm:text-sm">{story.body}</p>
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--line-color)] pt-6">
              {[
                ['Fabrics chosen for feel', 'Breathable cottons, soft georgette, chanderi silk.'],
                ['Finished inside out', 'Seams, linings and trims held to the same standard.'],
              ].map(([t, d]) => (
                <div key={t}>
                  <p className="text-[12.5px] font-semibold text-[var(--ink)]">{t}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">{d}</p>
                </div>
              ))}
            </div>
            <Button to={story.cta?.to || '/about'} variant="secondary" size="md" className="mt-7">
              {story.cta?.label || 'Explore Our Story'}
            </Button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ------------------------------- Testimonials ------------------------------- */

function Testimonials({ reviews = [], config }) {
  if (!reviews.length) return null;
  return (
    <section className="border-y border-[var(--line-color)] bg-[var(--surface-sunken)] py-14">
      <div className="container-page">
        <SectionHeading eyebrow="Verified Reviews" title={config?.title || 'Words From Our Customers'} subtitle={config?.subtitle} align="center" />
        <div className="grid gap-4 md:grid-cols-3">
          {reviews.slice(0, 3).map((r, i) => (
            <FadeIn key={r._id} delay={i * 0.06}>
              <figure className="flex h-full flex-col rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-6">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <StarIcon key={s} size={13} className={s < r.rating ? 'text-[#C99A2E]' : 'text-[var(--line-color)]'} fill="currentColor" strokeWidth={0} />
                  ))}
                </div>
                {r.title && <p className="mt-3 font-display text-[16px] leading-snug">{r.title}</p>}
                <blockquote className="mt-2 flex-1 text-[13px] leading-relaxed text-[var(--ink-muted)]">“{r.comment}”</blockquote>
                <figcaption className="mt-5 border-t border-[var(--line-color)] pt-4">
                  <p className="text-[12.5px] font-semibold text-[var(--ink)]">{r.customerName}</p>
                  <p className="text-[11px] text-[var(--ink-muted)]">
                    {r.product?.name ? (
                      <Link to={`/product/${r.product.slug}`} className="hover:text-[var(--accent)]">{r.product.name}</Link>
                    ) : (
                      'Verified customer'
                    )}
                    {r.verifiedPurchase && <span className="ml-1.5 text-[#2F7A4D] dark:text-emerald-400">· Verified purchase</span>}
                  </p>
                </figcaption>
              </figure>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- Newsletter ------------------------------- */

function Newsletter({ config }) {
  if (!config?.enabled) return null;
  return (
    <section className="container-page py-14">
      <FadeIn>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#521021] via-[#78152F] to-[#3d101d] px-6 py-12 text-center sm:px-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-[#D9A5A5]/25" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full border border-[#D9A5A5]/20" />
          <div className="relative mx-auto max-w-lg text-[#FFF9F3]">
            <Sparkles size={20} className="mx-auto mb-4 text-[#D9A5A5]" />
            <h3 className="font-display text-[26px] leading-tight sm:text-[32px]">{config.title}</h3>
            <p className="mt-2.5 text-[13px] leading-relaxed text-[#F7E2DF]/80">{config.subtitle}</p>
            <NewsletterForm placeholder={config.placeholder} />
            <p className="mt-3 text-[10.5px] uppercase tracking-[0.14em] text-[#F7E2DF]/60">No spam · Unsubscribe anytime</p>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

function NewsletterForm({ placeholder }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ loading: false, done: false, error: '' });
  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus({ loading: false, done: false, error: 'Please enter a valid email address' });
      return;
    }
    setStatus({ loading: true, done: false, error: '' });
    try {
      const { miscApi } = await import('../services/endpoints.js');
      await miscApi.subscribe(email, 'homepage');
      setStatus({ loading: false, done: true, error: '' });
      setEmail('');
    } catch {
      setStatus({ loading: false, done: false, error: 'Could not subscribe right now. Please try again.' });
    }
  };
  return (
    <form onSubmit={submit} className="mx-auto mt-7 flex max-w-md flex-col gap-2 sm:flex-row">
      <input
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setStatus({ loading: false, done: false, error: '' });
        }}
        placeholder={placeholder || 'Enter your email address'}
        aria-label="Email address"
        className="h-12 w-full rounded-full border border-white/25 bg-white/10 px-5 text-[13px] text-[#FFF9F3] placeholder:text-[#F7E2DF]/60 focus:border-white/60 focus:outline-none"
      />
      <Button type="submit" loading={status.loading} size="lg" className="shrink-0 bg-[#FFF9F3] text-[#3d101d] hover:bg-white">
        {status.done ? 'Subscribed' : 'Subscribe'}
      </Button>
      {status.error && <p className="mt-1 text-[11px] text-[#FFD9D9] sm:hidden">{status.error}</p>}
    </form>
  );
}

/* --------------------------------- Page --------------------------------- */

export default function Home() {
  useDocumentTitle('Premium Ethnic Wear for Women', 'Vimuhet crafts premium kurtis, kurti sets and designer ethnic wear for women.');
  const { home, loading } = useStore();
  const { openQuickView } = useQuickView();

  const heroSlides = home?.homepage?.hero?.filter((s) => s.isActive !== false) || [];
  const sections = home?.homepage?.sections || {};
  const collections = home?.collections || [];
  const newArrivals = home?.newArrivals || [];
  const bestSellers = home?.bestSellers || [];
  const trending = home?.trending || [];
  const testimonials = home?.testimonials || [];

  if (!loading && !home) {
    return (
      <div className="container-page py-24">
        <ErrorState title="We could not load the storefront" message="Please check your connection and try again." onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div>
      {/* Gated on the homepage payload alone, not on the global `loading`
          flag: the hero no longer waits for categories, collections and
          settings to arrive before it can paint. */}
      {home ? <Hero slides={heroSlides} /> : <HeroSkeleton />}

      {sections.featuredCollections?.enabled !== false && <FeaturedCollections collections={collections} loading={loading} />}

      <ProductBand
        eyebrow="Just In"
        title={sections.newArrivals?.title || 'New Arrivals'}
        subtitle={sections.newArrivals?.subtitle}
        products={newArrivals}
        actionTo="/new-arrivals"
        loading={loading}
      />

      <PromoBanner promo={sections.promoBanner} />

      <ProductBand
        eyebrow="Most Loved"
        title={sections.bestSellers?.title || 'Best Sellers'}
        subtitle={sections.bestSellers?.subtitle}
        products={bestSellers}
        actionTo="/best-sellers"
        loading={loading}
      />

      <BrandStory story={sections.brandStory} />

      <ProductBand
        eyebrow="Trending"
        title={sections.trending?.title || 'Trending Now'}
        subtitle={sections.trending?.subtitle}
        products={trending}
        actionTo="/trending"
        loading={loading}
      />

      <Testimonials reviews={testimonials} config={sections.testimonials} />
      <Newsletter config={sections.newsletter} />
    </div>
  );
}
