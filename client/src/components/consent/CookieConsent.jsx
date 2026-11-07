import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Cookie, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { useConsent } from '../../context/ConsentContext.jsx';
import useScrollLock from '../../hooks/useScrollLock.js';

/**
 * Cookie consent: a first-visit banner plus a preferences panel that can be
 * reopened at any time from the footer ("Cookie Settings").
 *
 * Three routes out of the banner, as required:
 *   Accept All · Reject Optional · Customise Preferences
 *
 * Nothing optional is enabled until the visitor acts. Dismissing the banner with
 * the close button is treated as "reject optional" so a visitor is never asked
 * again and no optional tracking silently starts.
 */
export default function CookieConsent() {
  const {
    decided,
    saving,
    settingsOpen,
    consent,
    categories,
    acceptAll,
    rejectOptional,
    saveCustom,
    openSettings,
    closeSettings,
  } = useConsent();

  const [draft, setDraft] = useState(consent);
  const bannerRef = useRef(null);
  const showBanner = !decided && !settingsOpen;

  /* Keep the draft in sync whenever the panel opens. */
  useEffect(() => {
    if (settingsOpen) setDraft(consent);
  }, [settingsOpen, consent]);

  const toggle = (key) => setDraft((d) => ({ ...d, [key]: !d[key] }));

  /* ---------- Banner ---------- */
  const banner = (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 240 }}
          className="fixed inset-x-0 bottom-0 z-[95] px-3 pb-3 sm:px-5 sm:pb-5"
          role="region"
          aria-label="Cookie consent"
          /* The WhatsApp button reads this to lift itself clear of the banner. */
          data-cookie-banner=""
        >
          <div
            ref={bannerRef}
            className="mx-auto max-w-4xl rounded-2xl border border-[var(--line-color)] bg-[var(--surface-raised)] shadow-[0_-8px_40px_rgba(61,16,29,0.16)]"
          >
            <div className="flex items-start gap-3 p-4 sm:p-5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                <Cookie size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] leading-snug text-[var(--ink)]">A note about cookies</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
                  We use cookies and similar technologies to keep the site working, remember your preferences,
                  maintain your shopping bag and understand how the site is used. You can accept everything,
                  allow only what is strictly necessary, or choose category by category.{' '}
                  <Link to="/cookie-policy" className="font-medium text-[var(--accent)] underline underline-offset-2 hover:no-underline">
                    Cookie Policy
                  </Link>
                  {' · '}
                  <Link to="/privacy-policy" className="font-medium text-[var(--accent)] underline underline-offset-2 hover:no-underline">
                    Privacy Policy
                  </Link>
                </p>

                <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button size="sm" onClick={acceptAll} loading={saving} className="w-full sm:w-auto">
                    Accept All
                  </Button>
                  <Button size="sm" variant="secondary" onClick={rejectOptional} loading={saving} className="w-full sm:w-auto">
                    Reject Optional
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={SlidersHorizontal}
                    onClick={openSettings}
                    className="w-full sm:w-auto"
                  >
                    Customize Preferences
                  </Button>
                </div>
                <p className="mt-2.5 flex items-center gap-1.5 text-[10.5px] leading-relaxed text-[var(--ink-muted)]">
                  <ShieldCheck size={11} className="shrink-0" />
                  Necessary cookies always stay on. Rejecting optional cookies never stops you browsing, using your bag or checking out.
                </p>
              </div>
              <button
                type="button"
                onClick={rejectOptional}
                aria-label="Dismiss and allow only necessary cookies"
                className="shrink-0 rounded-full p-1.5 text-[var(--ink-muted)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /* ---------- Preferences panel ---------- */
  return (
    <>
      {banner}
      <PreferencesPanel
        open={settingsOpen}
        draft={draft}
        toggle={toggle}
        saving={saving}
        categories={categories}
        onClose={closeSettings}
        onAcceptAll={async () => {
          await acceptAll();
          closeSettings();
        }}
        onRejectAll={async () => {
          await rejectOptional();
          closeSettings();
        }}
        onSave={async () => {
          await saveCustom(draft);
          closeSettings();
        }}
        onToggleAll={(value) => {
          setDraft((d) => {
            const next = { ...d };
            for (const c of categories) if (!c.locked) next[c.key] = value;
            return next;
          });
        }}
      />
    </>
  );
}

function PreferencesPanel({ open, draft, toggle, saving, categories, onClose, onAcceptAll, onRejectAll, onSave, onToggleAll }) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="cookie-prefs-title">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#3d101d]/45 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[var(--line-color)] bg-[var(--surface-raised)] sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line-color)] px-5 py-4">
              <div>
                <h2 id="cookie-prefs-title" className="font-display text-lg text-[var(--ink)]">Cookie preferences</h2>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink-muted)]">
                  Choose which categories you are happy for us to use. You can change this at any time from the footer.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close cookie preferences"
                className="shrink-0 rounded-full p-1.5 text-[var(--ink-muted)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]"
              >
                <X size={17} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-3">
                {categories.map((cat) => (
                  <div
                    key={cat.key}
                    className="rounded-xl border border-[var(--line-color)] bg-[var(--surface)] p-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[var(--ink)]">{cat.label}</p>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">{cat.summary}</p>
                      </div>
                      {cat.locked ? (
                        <span className="shrink-0 rounded-full bg-[var(--surface-sunken)] px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                          Always on
                        </span>
                      ) : (
                        <ConsentSwitch
                          checked={Boolean(draft[cat.key])}
                          onChange={() => toggle(cat.key)}
                          label={`${cat.label} cookies`}
                        />
                      )}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-[var(--ink-muted)] opacity-90">{cat.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-[var(--line-color)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onToggleAll(true)}
                  className="text-[11px] font-medium text-[var(--accent)] underline underline-offset-2 hover:no-underline"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => onToggleAll(false)}
                  className="text-[11px] font-medium text-[var(--ink-muted)] underline underline-offset-2 hover:text-[var(--ink)] hover:no-underline"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button size="sm" variant="secondary" onClick={onRejectAll} loading={saving}>
                  Reject Optional
                </Button>
                <Button size="sm" onClick={onSave} loading={saving}>
                  Save Preferences
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Accessible toggle. */
function ConsentSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--line-color)]'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
