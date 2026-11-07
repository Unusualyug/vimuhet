import ConsentRecord from '../models/ConsentRecord.js';
import VisitorSession from '../models/VisitorSession.js';
import {
  ACCEPT_ALL_CONSENT,
  CONSENT_VERSION,
  COOKIE_CATEGORIES,
  DENY_ALL_CONSENT,
  OPTIONAL_CATEGORIES,
  normaliseConsent,
} from '../config/cookies.js';

/**
 * Consent is carried three ways so that it survives every reasonable situation:
 *
 *  1. `vimuhet_consent` cookie — readable by the client, 180 days, so the API can
 *     enforce it on requests the browser makes directly (images, prefetch, etc).
 *  2. `x-consent` header — sent by the app on every XHR. Authoritative when present
 *     because it comes from the same store the UI renders.
 *  3. `ConsentRecord` in Mongo — the audit trail, and the fallback when neither of
 *     the above is available (e.g. a server-side event with no request context).
 *
 * Precedence: header → cookie → last stored record → deny all.
 * Deny-all is the safe default: nothing optional is ever tracked by accident.
 */

export const CONSENT_COOKIE = 'vimuhet_consent';

const parseJson = (value) => {
  if (!value) return null;
  try {
    return typeof value === 'object' ? value : JSON.parse(value);
  } catch {
    return null;
  }
};

const fromCookieHeader = (req) => {
  const raw = req?.headers?.cookie;
  if (!raw) return null;
  const match = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  try {
    return parseJson(decodeURIComponent(match.slice(CONSENT_COOKIE.length + 1)));
  } catch {
    return null;
  }
};

const fromHeader = (req) => {
  const raw = req?.headers?.['x-consent'];
  return raw ? parseJson(raw) : null;
};

/**
 * Resolve the effective consent for a request, synchronously and without I/O.
 * Returns a complete, normalised object so callers can test any category safely.
 */
export function consentFromRequest(req) {
  const fromReqHeader = fromHeader(req);
  if (fromReqHeader) return normaliseConsent(fromReqHeader);

  const fromReqCookie = req?.parsedConsent || fromCookieHeader(req);
  if (fromReqCookie) return normaliseConsent(fromReqCookie);

  return { ...DENY_ALL_CONSENT };
}

/** True when the visitor has allowed the given category. */
export const hasConsent = (req, category) => {
  if (category === 'essential') return true;
  return Boolean(consentFromRequest(req)[category]);
};

/** Any analytics-level consent (analytics or marketing) granted? */
export const hasAnalyticsConsent = (req) => hasConsent(req, 'analytics');

/** Express middleware: attaches the resolved consent to the request. */
export function attachConsent(req, _res, next) {
  req.consent = consentFromRequest(req);
  next();
  return undefined;
}

/** The full policy, in the shape the client renders. */
export function cookiePolicyPayload() {
  return {
    version: CONSENT_VERSION,
    categories: COOKIE_CATEGORIES,
    optionalCategories: OPTIONAL_CATEGORIES,
  };
}

/**
 * Persist a consent decision: the audit record, the session's consent snapshot,
 * and the cookie the browser will echo back. Returns the normalised consent.
 */
export async function saveConsent({ consent: raw, action, visitorId, guestId, sessionId, user, userAgentFamily, source = 'banner' }, res) {
  const consent = normaliseConsent(raw);
  const resolvedAction =
    action ||
    (OPTIONAL_CATEGORIES.every((k) => consent[k])
      ? 'ACCEPT_ALL'
      : OPTIONAL_CATEGORIES.every((k) => !consent[k])
        ? 'REJECT_OPTIONAL'
        : 'CUSTOM');

  const decidedAt = new Date();

  await ConsentRecord.create({
    visitorId: visitorId || sessionId || `anon-${decidedAt.getTime()}`,
    guestId,
    user,
    sessionId,
    categories: consent,
    action: resolvedAction,
    version: CONSENT_VERSION,
    source,
    userAgentFamily: userAgentFamily || '',
    decidedAt,
  });

  if (sessionId) {
    await VisitorSession.updateOne(
      { sessionId },
      {
        $set: {
          'consent.analytics': consent.analytics,
          'consent.marketing': consent.marketing,
          'consent.functional': consent.functional,
          'consent.version': CONSENT_VERSION,
          'consent.decidedAt': decidedAt,
        },
      }
    ).catch(() => {});
  }

  /* Mirror into a cookie so API enforcement works without the JS header.
     This cookie is itself essential — it stores the decision, nothing else. */
  if (res?.cookie) {
    res.cookie(CONSENT_COOKIE, JSON.stringify(consent), {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 180,
      path: '/',
    });
  }

  return { consent, action: resolvedAction, decidedAt, version: CONSENT_VERSION };
}

/** The visitor's most recent decision, for the "Cookie Settings" panel. */
export async function latestConsent({ visitorId, guestId }) {
  const query = visitorId ? { visitorId } : guestId ? { guestId } : null;
  if (!query) return null;
  const record = await ConsentRecord.findOne(query).sort({ decidedAt: -1 }).lean();
  if (!record) return null;
  return {
    consent: normaliseConsent(record.categories),
    action: record.action,
    decidedAt: record.decidedAt,
    version: record.version,
  };
}

/**
 * Withdraw optional consent. Records the withdrawal, then purges the optional
 * data that was collected under the old permission so the withdrawal is real
 * rather than cosmetic.
 */
export async function withdrawConsent({ visitorId, guestId, user }, res, scope = 'optional') {
  const consent = { ...DENY_ALL_CONSENT };
  const result = await saveConsent(
    { consent, action: 'WITHDRAWN', visitorId, guestId, user, source: 'settings' },
    res
  );

  const targets = [];
  if (guestId) targets.push({ guestId });
  if (user) targets.push({ user });
  if (visitorId) targets.push({ visitorId });

  if (scope === 'optional' && targets.length) {
    const sessionQuery = { $or: targets };
    const { analyticsEventPurge, recentViewPurge } = await import('./analytics.service.js').catch(() => ({}));
    if (typeof analyticsEventPurge === 'function') await analyticsEventPurge(sessionQuery).catch(() => 0);
    if (typeof recentViewPurge === 'function') await recentViewPurge({ guestId, user }).catch(() => 0);
  }

  return result;
}

export { ACCEPT_ALL_CONSENT, DENY_ALL_CONSENT, CONSENT_VERSION, normaliseConsent };
export default { consentFromRequest, hasConsent, saveConsent, latestConsent, withdrawConsent, cookiePolicyPayload };
