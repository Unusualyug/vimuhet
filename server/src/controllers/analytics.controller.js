import { asyncHandler, ok } from '../utils/index.js';
import { liveVisitors, trackEvent, recordRecentView, listRecentViews } from '../services/analytics.service.js';
import { hasConsent } from '../services/consent.service.js';
import {
  analyticsOverview,
  conversionFunnel,
  deviceDistribution,
  geoBreakdown,
  topPages,
  trafficSources,
  visitorsTimeseries,
} from '../services/analytics.service.js';
import { resolveRange } from './admin.ops.controller.js';
import { visitorOverview } from '../services/visitorAnalytics.service.js';

/* --------------------------- Public (tracking) --------------------------- */

export const track = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (req.user) payload.user = req.user._id;
  /* The service enforces consent and returns why an event was dropped, so the
     client can stay honest about what is being measured. */
  const result = await trackEvent(payload, req);
  return ok(res, result);
});

/* ------------------------- Recently viewed (functional) ------------------- */

export const trackRecentView = asyncHandler(async (req, res) => {
  if (!hasConsent(req, 'functional')) {
    return ok(res, { tracked: false, reason: 'functional_consent_not_granted' });
  }
  const guestId = req.headers['x-guest-id'] || req.body?.guestId;
  await recordRecentView({ user: req.user?._id, guestId, productId: req.body?.productId });
  return ok(res, { tracked: true });
});

export const recentlyViewed = asyncHandler(async (req, res) => {
  if (!hasConsent(req, 'functional')) return ok(res, { items: [] });
  const guestId = req.headers['x-guest-id'] || req.query?.guestId;
  const data = await listRecentViews({
    user: req.user?._id,
    guestId,
    limit: Number(req.query?.limit) || 8,
  });
  return ok(res, data);
});

/* ---------------------------- Admin analytics ---------------------------- */

/* ------------------- Visitor overview (guests, consent) ------------------- */

export const visitors = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req.query);
  const data = await visitorOverview({ from, to });
  return ok(res, data);
});

/** Most-viewed / most-added / most-favourited, in one call. */
export const products = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req.query);
  const data = await visitorOverview({ from, to });
  return ok(res, {
    mostViewed: data.mostViewedProducts,
    mostAddedToCart: data.mostAddedToCart,
    mostFavorited: data.mostFavorited,
    range: data.range,
  });
});

/** Cookie consent statistics for the admin dashboard. */
export const consent = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req.query);
  const data = await visitorOverview({ from, to });
  return ok(res, { ...data.consent, range: data.range });
});

export const overview = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req.query);
  const [data, live] = await Promise.all([analyticsOverview({ from, to }), liveVisitors()]);
  return ok(res, { ...data, range: { from, to }, live });
});

export const timeseries = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req.query);
  const data = await visitorsTimeseries({ from, to, groupBy: req.query.groupBy || 'day' });
  return ok(res, { ...data, range: { from, to } });
});

export const sources = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req.query);
  const [traffic, devices] = await Promise.all([trafficSources({ from, to }), deviceDistribution({ from, to })]);
  return ok(res, { sources: traffic, devices });
});

export const pages = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req.query);
  const [pages, geo, funnel] = await Promise.all([
    topPages({ from, to }),
    geoBreakdown({ from, to }),
    conversionFunnel({ from, to }),
  ]);
  return ok(res, { pages, geo, funnel });
});

export const live = asyncHandler(async (_req, res) => {
  const data = await liveVisitors();
  return ok(res, data);
});

export default { track, overview, timeseries, sources, pages, live };
