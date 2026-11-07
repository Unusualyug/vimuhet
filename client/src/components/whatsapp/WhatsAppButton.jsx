import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import WhatsAppIcon from './WhatsAppIcon.jsx';
import { WHATSAPP_DISPLAY, WHATSAPP_LINK } from '../../constants/whatsapp.js';

/**
 * Floating WhatsApp button, pinned bottom-right on every storefront page.
 *
 * Collision handling — the reason this is not a two-line component:
 *
 *  1. Cookie banner. The consent banner is `fixed inset-x-0 bottom-0` at z-95.
 *     If the button sat at a fixed `bottom-6` it would be covered by the banner
 *     on a first visit, which is exactly when a hesitant visitor might want to
 *     ask a question. We listen for the banner and lift the button above it.
 *
 *  2. Product page action bar. The PDP has a mobile-only `sticky bottom-0` bar
 *     holding Add to Bag / Buy Now. On small screens the button sits above that
 *     bar so it never covers a purchase action.
 *
 *  3. Mobile navigation. The hamburger menu opens a full-screen drawer; the
 *     button is hidden while it is open so it cannot float over the nav.
 *
 * It is also suppressed inside the admin app and on the auth pages, where a
 * support pop-up in the corner competes with the form the visitor is filling in.
 */
export default function WhatsAppButton() {
  const { pathname } = useLocation();
  const [bannerOffset, setBannerOffset] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const isProductPage = /^\/product\//.test(pathname);
  const isAuthPage = /^\/(login|register|forgot-password|reset-password)/.test(pathname);
  const hidden = pathname.startsWith('/admin') || isAuthPage;

  /* Watch for the consent banner so we can move out of its way. We observe the
     DOM rather than importing consent state: the banner unmounts entirely once
     a decision is made, and this keeps the two components decoupled. */
  useEffect(() => {
    let last = -1;
    const measure = () => {
      const banner = document.querySelector('[data-cookie-banner]');
      let next = 0;
      if (banner) {
        const rect = banner.getBoundingClientRect();
        const visible = rect.height > 0 && rect.top < window.innerHeight;
        if (visible) next = Math.round(window.innerHeight - rect.top) + 12;
      }
      /* Only commit when the number actually changes. The previous version
         called setState on every tick, so this component re-rendered once a
         second forever — each render dirtying a `fixed` layer for no reason.
         Reading getBoundingClientRect also forces layout, so an 800ms interval
         did that on a timer too. The observer below already fires on every
         mount/unmount/attribute change inside <body>, which is the only thing
         that can move the banner; the timer is now a slow safety net. */
      if (next !== last) {
        last = next;
        setBannerOffset(next);
      }
    };
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-cookie-banner', 'class', 'style'] });
    window.addEventListener('resize', measure);
    const id = window.setInterval(measure, 2000);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.clearInterval(id);
    };
  }, []);

  /* Hide while the mobile navigation drawer is open (the header publishes this
     flag on <html>), so the button never floats on top of the menu. */
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const sync = () => setMenuOpen(document.documentElement.getAttribute('data-mobile-menu') === 'open');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mobile-menu'] });
    return () => observer.disconnect();
  }, []);

  /* Briefly reveal the label so the button is understood at a glance, then
     settle into the compact form. Suppressed for reduced-motion users. */
  useEffect(() => {
    if (hidden) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduce) { setShowHint(true); return undefined; }
    const on = window.setTimeout(() => setShowHint(true), 1200);
    const off = window.setTimeout(() => setShowHint(false), 6000);
    return () => { window.clearTimeout(on); window.clearTimeout(off); };
  }, [hidden]);

  if (hidden || menuOpen) return null;

  /* Bottom offset: base + banner lift + product-page mobile action bar. */
  const base = isProductPage ? 88 : 24;

  return (
    <div
      className="pointer-events-none fixed right-4 z-[88] flex flex-col items-end gap-2 sm:right-6"
      /* The banner lift is applied as a transform, not as `bottom`.
         Animating a layout property (bottom/height/width) makes the browser
         re-run layout for a `fixed` layer and counts as a layout shift each time
         the consent banner mounts or unmounts; a translateY is composited
         off-main-thread, changes nothing in layout, and is visually identical. */
      style={{
        bottom: `calc(${base}px + env(safe-area-inset-bottom, 0px))`,
        transform: bannerOffset ? `translateY(-${bannerOffset}px)` : undefined,
        transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none hidden max-w-[190px] rounded-lg rounded-br-sm border border-[var(--line-color)] bg-[var(--surface-raised)] px-3 py-1.5 text-[11.5px] leading-snug text-[var(--ink)] shadow-[0_6px_20px_-8px_rgba(61,16,29,0.3)] sm:block"
          >
            Need help? Chat with us.
          </motion.div>
        )}
      </AnimatePresence>

      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat with Vimuhet on WhatsApp at ${WHATSAPP_DISPLAY}`}
        className="whatsapp-fab pointer-events-auto group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_28px_-8px_rgba(37,211,102,0.65)] transition-transform duration-200 hover:scale-105 hover:shadow-[0_14px_34px_-8px_rgba(37,211,102,0.75)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6b34] active:scale-95"
      >
        {/* Soft pulsing halo — subtle, and removed for reduced-motion users. */}
        <span aria-hidden="true" className="whatsapp-halo absolute inset-0 rounded-full bg-[#25D366]" />
        <WhatsAppIcon size={29} className="relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.18)]" />
      </a>
    </div>
  );
}
