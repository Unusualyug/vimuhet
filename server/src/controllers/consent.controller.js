import { asyncHandler, ok } from '../utils/index.js';
import ApiError from '../utils/ApiError.js';
import {
  cookiePolicyPayload,
  latestConsent,
  saveConsent,
  withdrawConsent,
  consentFromRequest,
} from '../services/consent.service.js';
import { CONSENT_VERSION } from '../config/cookies.js';
import { detectBrowser } from '../services/analytics.service.js';

/* ------------------------------- Public ---------------------------------- */

/** GET /cookies/policy — categories, purposes, retention. Rendered by the UI. */
export const policy = asyncHandler(async (_req, res) => ok(res, cookiePolicyPayload()));

/** GET /cookies/consent — the visitor's current decision, if any. */
export const current = asyncHandler(async (req, res) => {
  const { visitorId, guestId } = req.query;
  const effective = consentFromRequest(req);
  const stored = await latestConsent({ visitorId, guestId });
  return ok(res, {
    /* `effective` is what the API will actually honour right now. */
    consent: effective,
    decided: Boolean(stored),
    stored,
    version: CONSENT_VERSION,
  });
});

/** POST /cookies/consent — record a decision (accept all / reject / custom). */
export const save = asyncHandler(async (req, res) => {
  const { consent, action, visitorId, guestId, sessionId, source } = req.body;
  if (!consent || typeof consent !== 'object') throw ApiError.badRequest('Consent choices are required');

  const result = await saveConsent(
    {
      consent,
      action,
      visitorId,
      guestId,
      sessionId,
      user: req.user?._id,
      userAgentFamily: detectBrowser(req.headers['user-agent'] || ''),
      source: source || 'banner',
    },
    res
  );

  return ok(
    res,
    { consent: result.consent, action: result.action, version: result.version, decidedAt: result.decidedAt },
    result.action === 'WITHDRAWN' ? 'Optional cookies turned off' : 'Cookie preferences saved'
  );
});

/** POST /cookies/withdraw — withdraw every optional category and purge the data. */
export const withdraw = asyncHandler(async (req, res) => {
  const { visitorId, guestId } = req.body || {};
  const result = await withdrawConsent(
    { visitorId, guestId, user: req.user?._id },
    res,
    req.body?.scope || 'optional'
  );
  return ok(
    res,
    { consent: result.consent, action: result.action, version: result.version },
    'Optional cookies turned off and optional tracking data removed'
  );
});

/* ------------------------------ Data rights ------------------------------- */

/**
 * POST /privacy/data-request — access or deletion request.
 * Deliberately does not disclose data inline: we verify the requester first and
 * record the request for the team to action. Returns only an acknowledgement.
 */
export const dataRequest = asyncHandler(async (req, res) => {
  const { type, email, note } = req.body || {};
  if (!['ACCESS', 'DELETION'].includes(type)) {
    throw ApiError.badRequest('Request type must be ACCESS or DELETION');
  }
  if (!email || !String(email).includes('@')) throw ApiError.badRequest('A valid email address is required');

  const DataRequest = (await import('../models/DataRequest.js')).default;
  await DataRequest.create({
    type,
    email: String(email).toLowerCase().trim(),
    note: String(note || '').slice(0, 500),
    user: req.user?._id,
    status: 'RECEIVED',
  });

  return ok(
    res,
    { received: true, type },
    'Request received. We will confirm from care@vimuhet.com within 30 days.'
  );
});
