/**
 * Cookie & consent policy — the single source of truth.
 *
 * The server is authoritative: every tracking write is checked against the
 * categories the visitor actually consented to. The client mirrors this list
 * when rendering the consent panel, so the copy can never drift from the rules.
 */

/** Consent categories. Essential cannot be disabled by a visitor. */
export const COOKIE_CATEGORIES = [
  {
    key: 'essential',
    label: 'Strictly necessary',
    locked: true,
    summary: 'Required for the site to work. These cannot be switched off.',
    purpose:
      'Secure sign-in, fraud protection, your shopping bag and wishlist, and remembering your cookie choices. The store cannot function without them.',
    examples: [
      'vimuhet_guest_id — your guest shopping session',
      'vimuhet_token — your signed-in session',
      'vimuhet_consent — your cookie preferences',
    ],
    retention: 'Guest session: 180 days. Sign-in session: refresh token lifetime.',
  },
  {
    key: 'functional',
    label: 'Functional',
    locked: false,
    summary: 'Remember your preferences and settings.',
    purpose:
      'Keeps your theme (light or dark), interface preferences, recently viewed pieces and your place in a size guide so you do not have to set them again.',
    examples: ['vimuhet_theme — light or dark theme', 'vimuhet_recent — recently viewed products'],
    retention: 'Up to 12 months, or until you change your preferences.',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    locked: false,
    summary: 'Help us understand how the site is used.',
    purpose:
      'Aggregated, de-identified measurement of page views, product views and the checkout funnel so we can fix what is confusing and stock what you want. We never store your IP address with these events and never attempt to identify you from them.',
    examples: ['Anonymous session and visitor identifiers', 'Page view and product interaction events'],
    retention: 'Retained for 14 months, then deleted.',
  },
  {
    key: 'marketing',
    label: 'Marketing',
    locked: false,
    summary: 'Measure campaigns and show relevant offers.',
    purpose:
      'Lets us attribute visits to our own campaigns so we know which ones are worth running. We do not sell your data and we do not run third-party ad networks on this site.',
    examples: ['Campaign and referral attribution'],
    retention: 'Retained for 14 months, then deleted.',
  },
];

export const CONSENT_CATEGORY_KEYS = COOKIE_CATEGORIES.map((c) => c.key);

/** Categories a visitor may toggle. Everything except essential. */
export const OPTIONAL_CATEGORIES = COOKIE_CATEGORIES.filter((c) => !c.locked).map((c) => c.key);

/** Policy version. Bumping this re-asks for consent. */
export const CONSENT_VERSION = 1;

/** Retention policy, surfaced in the Cookie Policy page and the admin settings. */
export const DATA_RETENTION_DAYS = {
  visitorSessions: 180,
  analyticsEvents: 420,
  consentRecords: 420,
  guestCarts: 180,
  guestWishlists: 180,
  recentViews: 90,
};

/** The consent object for a visitor who has never chosen. Nothing optional is on. */
export const DENY_ALL_CONSENT = Object.freeze({
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
});

/** Normalise any incoming consent payload into a safe, complete object. */
export function normaliseConsent(input = {}) {
  const consent = { essential: true };
  for (const key of OPTIONAL_CATEGORIES) consent[key] = Boolean(input?.[key]);
  return consent;
}

/** Every optional category granted. */
export const ACCEPT_ALL_CONSENT = normaliseConsent({
  functional: true,
  analytics: true,
  marketing: true,
});

export const cookiePolicy = { COOKIE_CATEGORIES, CONSENT_VERSION, DATA_RETENTION_DAYS };
export default cookiePolicy;
