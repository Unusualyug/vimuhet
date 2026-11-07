import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { consentApi } from '../services/endpoints.js';
import { guestId } from '../services/api.js';

/**
 * Cookie consent store.
 *
 * The choice lives in localStorage under `vimuhet_consent` and is mirrored to the
 * API (which writes a cookie and a ConsentRecord). Every tracking call reads this
 * store, so nothing optional is sent until the visitor has said yes.
 *
 * Default before a decision: everything optional OFF.
 */

export const CONSENT_STORAGE_KEY = 'vimuhet_consent';

export const CATEGORY_META = [
  {
    key: 'essential',
    label: 'Strictly necessary',
    locked: true,
    summary: 'Required for the site to work — sign-in, security, your bag and this choice.',
    detail:
      'These keep you signed in securely, protect your session, remember your shopping bag and wishlist, and store the cookie preference you set here. The store cannot run without them, so they cannot be switched off.',
  },
  {
    key: 'functional',
    label: 'Functional',
    locked: false,
    summary: 'Remember your preferences — theme, recently viewed pieces.',
    detail:
      'Remembers your light or dark theme, interface preferences and the pieces you have recently viewed so you can find them again. Turning this off does not affect browsing, the bag or checkout.',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    locked: false,
    summary: 'Help us understand how the site is used, in aggregate.',
    detail:
      'Records anonymous page views and product interactions so we can see which pages confuse people and which pieces are popular. No IP addresses are stored and we never try to identify you from this data.',
  },
  {
    key: 'marketing',
    label: 'Marketing',
    locked: false,
    summary: 'Measure our own campaigns and understand what brings visitors in.',
    detail:
      'Lets us attribute visits to our campaigns so we know which are worth running. We do not sell your data and we do not run third-party advertising networks on this site.',
  },
];

export const DENY_ALL = Object.freeze({ essential: true, functional: false, analytics: false, marketing: false });
export const ACCEPT_ALL = Object.freeze({ essential: true, functional: true, analytics: true, marketing: true });

const OPTIONAL_KEYS = CATEGORY_META.filter((c) => !c.locked).map((c) => c.key);

export const normalise = (raw) => {
  const out = { essential: true };
  for (const key of OPTIONAL_KEYS) out[key] = Boolean(raw?.[key]);
  return out;
};

const readStored = () => {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return { consent: normalise(parsed.consent || parsed), decidedAt: parsed.decidedAt || null };
  } catch {
    return null;
  }
};

/**
 * Visitor and session identifiers must exist *before* a consent decision is
 * saved, otherwise the record cannot be looked up on a later visit (the banner
 * would still be suppressed locally, but the server would have no idea what the
 * visitor chose). These are essential-category identifiers.
 */
function ensureVisitorIds() {
  let visitorId = localStorage.getItem('vimuhet_visitor');
  if (!visitorId) {
    visitorId = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem('vimuhet_visitor', visitorId);
  }
  let sessionId = sessionStorage.getItem('vimuhet_session');
  if (!sessionId) {
    sessionId = `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    sessionStorage.setItem('vimuhet_session', sessionId);
  }
  return { visitorId, sessionId };
}

const ConsentContext = createContext(null);

export function ConsentProvider({ children }) {
  const [stored, setStored] = useState(() => readStored());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const consent = stored?.consent || DENY_ALL;
  const decided = Boolean(stored?.decidedAt);

  /* Keep an API-readable mirror so the server can enforce consent even on
     requests the JS layer did not originate. */
  useEffect(() => {
    if (!stored) return;
    document.cookie = `vimuhet_consent=${encodeURIComponent(
      JSON.stringify(stored.consent)
    )}; path=/; max-age=${60 * 60 * 24 * 180}; SameSite=Lax`;
  }, [stored]);

  const persist = useCallback(async (nextConsent, action, source = 'banner') => {
    const normalised = normalise(nextConsent);
    setSaving(true);
    const { visitorId, sessionId } = ensureVisitorIds();
    const payload = {
      consent: normalised,
      action,
      visitorId,
      guestId: guestId(),
      sessionId,
      source,
    };
    try {
      await consentApi.save(payload);
    } catch {
      /* The local decision still stands even if the network call fails — the
         visitor must never be re-asked because of a transient error. */
    } finally {
      const record = { consent: normalised, decidedAt: new Date().toISOString(), action };
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
      setStored(record);
      setSaving(false);
    }
    return normalised;
  }, []);

  const acceptAll = useCallback(() => persist(ACCEPT_ALL, 'ACCEPT_ALL'), [persist]);
  const rejectOptional = useCallback(() => persist(DENY_ALL, 'REJECT_OPTIONAL'), [persist]);
  const saveCustom = useCallback((choices) => persist(choices, 'CUSTOM', 'settings'), [persist]);

  const withdrawOptional = useCallback(async () => {
    setSaving(true);
    try {
      const { visitorId } = ensureVisitorIds();
      await consentApi.withdraw({ visitorId, guestId: guestId() });
    } catch {
      /* fall through to the local reset */
    } finally {
      const record = { consent: DENY_ALL, decidedAt: new Date().toISOString(), action: 'WITHDRAWN' };
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
      setStored(record);
      setSaving(false);
    }
    return DENY_ALL;
  }, []);

  const allows = useCallback((category) => (category === 'essential' ? true : Boolean(consent[category])), [consent]);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const value = useMemo(
    () => ({
      consent,
      decided,
      decidedAt: stored?.decidedAt || null,
      saving,
      settingsOpen,
      allows,
      acceptAll,
      rejectOptional,
      saveCustom,
      withdrawOptional,
      openSettings,
      closeSettings,
      categories: CATEGORY_META,
    }),
    [consent, decided, stored, saving, settingsOpen, allows, acceptAll, rejectOptional, saveCustom, withdrawOptional, openSettings, closeSettings]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export const useConsent = () => {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used inside ConsentProvider');
  return ctx;
};

/** Read consent without React — used by the API layer on every request. */
export const readConsentSync = () => readStored()?.consent || DENY_ALL;
