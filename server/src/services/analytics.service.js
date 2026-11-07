import AnalyticsEvent from '../models/AnalyticsEvent.js';
import VisitorSession from '../models/VisitorSession.js';
import RecentView from '../models/RecentView.js';
import ApiError from '../utils/ApiError.js';
import { consentFromRequest } from './consent.service.js';

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export function detectDevice(ua = '') {
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'Tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

export function detectBrowser(ua = '') {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/Chrome\//i.test(ua)) return 'Chrome';
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  return 'Other';
}

export function detectOS(ua = '') {
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iOS/i.test(ua)) return 'iOS';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Other';
}

export function classifySource(referrer = '', utm = '') {
  if (utm) return 'Campaign';
  if (!referrer) return 'Direct';
  const r = referrer.toLowerCase();
  if (/google|bing|yahoo|duckduckgo/.test(r)) return 'Google Search';
  if (/instagram|facebook|fb\.|twitter|x\.com|pinterest|linkedin|whatsapp|t\.me|youtube/.test(r)) return 'Social Media';
  return 'Referral';
}

/** Records an analytics event (privacy-conscious: no IP stored, geo is coarse). */
/**
 * Event types and the consent category each one belongs to.
 * An event is only written when the visitor has granted its category. This is
 * enforced here, at the only write path, so no controller can bypass it.
 */
export const EVENT_CONSENT_CATEGORY = {
  page_view: 'analytics',
  product_view: 'analytics',
  add_to_cart: 'analytics',
  remove_from_cart: 'analytics',
  wishlist_add: 'analytics',
  wishlist_remove: 'analytics',
  search: 'analytics',
  checkout_start: 'analytics',
  register: 'analytics',
  purchase: 'analytics',
  campaign_click: 'marketing',
};

export async function trackEvent(payload, req) {
  const ua = req?.headers?.['user-agent'] || '';
  const sessionId = payload.sessionId;
  if (!sessionId) throw ApiError.badRequest('sessionId is required');

  /* Consent gate. Without an explicit grant for the event's category we write
     nothing at all — no row, no counters, no session. Essential-only visitors
     are never measured. */
  const consent = req ? consentFromRequest(req) : { analytics: false, marketing: false };
  const category = EVENT_CONSENT_CATEGORY[payload.type] || 'analytics';
  if (!consent[category]) {
    return { tracked: false, reason: 'consent_not_granted', category };
  }

  const existing = await VisitorSession.findOne({ sessionId });
  const isReturning = payload.isReturning ?? Boolean(existing?.isReturning);
  const source = payload.source || classifySource(payload.referrer, payload.utm);

  const bump = {
    page_view: 'pageViews',
    product_view: 'productViews',
    add_to_cart: 'cartAdditions',
    wishlist_add: 'wishlistAdditions',
  };

  if (existing) {
    const field = bump[payload.type];
    if (field) existing[field] = (existing[field] || 0) + 1;
    existing.currentPath = payload.path || existing.currentPath;
    existing.lastSeenAt = new Date();
    if (payload.user) existing.user = payload.user;
    if (payload.guestId) existing.guestId = payload.guestId;
    if (payload.type === 'checkout_start') existing.checkoutStarted = true;
    if (payload.type === 'purchase') existing.orderCompleted = true;
    existing.consent = {
      analytics: Boolean(consent.analytics),
      marketing: Boolean(consent.marketing),
      functional: Boolean(consent.functional),
      version: consent.version || 0,
      decidedAt: new Date(),
    };
    await existing.save();
  } else {
    await VisitorSession.create({
      sessionId,
      visitorId: payload.visitorId || sessionId,
      user: payload.user,
      currentPath: payload.path || '/',
      guestId: payload.guestId,
      pageViews: payload.type === 'page_view' ? 1 : 0,
      productViews: payload.type === 'product_view' ? 1 : 0,
      cartAdditions: payload.type === 'add_to_cart' ? 1 : 0,
      wishlistAdditions: payload.type === 'wishlist_add' ? 1 : 0,
      checkoutStarted: payload.type === 'checkout_start',
      orderCompleted: payload.type === 'purchase',
      consent: {
        analytics: Boolean(consent.analytics),
        marketing: Boolean(consent.marketing),
        functional: Boolean(consent.functional),
        version: consent.version || 0,
        decidedAt: new Date(),
      },
      isReturning: Boolean(payload.isReturning),
      device: payload.device || detectDevice(ua),
      source,
      browser: detectBrowser(ua),
      os: detectOS(ua),
      city: payload.city || 'Unknown',
      state: payload.state || 'Unknown',
      country: payload.country || 'India',
    });
  }

  await AnalyticsEvent.create({
    type: payload.type,
    sessionId,
    visitorId: payload.visitorId || sessionId,
    user: payload.user,
    path: payload.path || '/',
    referrer: payload.referrer || '',
    source,
    device: payload.device || detectDevice(ua),
    browser: detectBrowser(ua),
    os: detectOS(ua),
    isReturning: Boolean(payload.isReturning),
    country: payload.country || 'India',
    state: payload.state,
    city: payload.city,
    product: payload.product,
    value: payload.value || 0,
    meta: payload.meta || {},
    durationMs: payload.durationMs || 0,
  });

  return { tracked: true };
}

/**
 * Recently viewed products — a functional feature, so it requires functional
 * consent. Keeps at most 20 entries, newest first, deduplicated by product.
 */
export async function recordRecentView({ user, guestId, productId }) {
  if (!productId) return { tracked: false };
  const query = user ? { user } : guestId ? { guestId } : null;
  if (!query) return { tracked: false };

  let doc = await RecentView.findOne(query);
  if (!doc) doc = new RecentView(query);

  doc.products = doc.products.filter((p) => String(p.product) !== String(productId));
  doc.products.unshift({ product: productId, viewedAt: new Date() });
  doc.products = doc.products.slice(0, 20);
  await doc.save();
  return { tracked: true };
}

/** Recently viewed products for a visitor, newest first. */
export async function listRecentViews({ user, guestId, limit = 8 }) {
  const query = user ? { user } : guestId ? { guestId } : null;
  if (!query) return { items: [] };
  const doc = await RecentView.findOne(query).lean();
  if (!doc) return { items: [] };
  const ids = doc.products.slice(0, limit).map((p) => p.product);
  const Product = (await import('../models/Product.js')).default;
  const products = await Product.find({ _id: { $in: ids }, status: 'ACTIVE' })
    .select('name slug price mrp images rating reviewCount stock colors variants')
    .lean();
  const order = new Map(ids.map((id, i) => [String(id), i]));
  const items = products
    .map((p) => ({ ...p, inStock: p.stock > 0 }))
    .sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)));
  return { items };
}

/**
 * Merge one recent-views document into another (guest → account on login).
 * De-duplicates by product, keeps the newest timestamp, caps at 20.
 */
export async function mergeRecentViews({ fromGuestId, toUser }) {
  if (!fromGuestId || !toUser) return;
  const guestDoc = await RecentView.findOne({ guestId: fromGuestId });
  if (!guestDoc?.products?.length) return;

  let target = await RecentView.findOne({ user: toUser });
  if (!target) {
    guestDoc.user = toUser;
    guestDoc.guestId = undefined;
    await guestDoc.save();
    return;
  }

  const seen = new Set(target.products.map((p) => String(p.product)));
  const merged = [...target.products];
  for (const p of guestDoc.products) {
    if (!seen.has(String(p.product))) {
      merged.push(p);
      seen.add(String(p.product));
    }
  }
  merged.sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt));
  target.products = merged.slice(0, 20);
  await target.save();
  await RecentView.deleteOne({ _id: guestDoc._id });
}

/** Purge analytics events for a visitor (used when consent is withdrawn). */
export async function analyticsEventPurge(sessionQuery) {
  const sessions = await VisitorSession.find(sessionQuery).select('sessionId').lean();
  const ids = sessions.map((s) => s.sessionId);
  if (!ids.length) return 0;
  const res = await AnalyticsEvent.deleteMany({ sessionId: { $in: ids } });
  return res.deletedCount || 0;
}

export async function recentViewPurge({ guestId, user }) {
  if (!guestId && !user) return 0;
  const res = await RecentView.deleteMany({ $or: [{ guestId }, { user }] });
  return res.deletedCount || 0;
}

export async function liveVisitors() {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const sessions = await VisitorSession.find({ lastSeenAt: { $gte: since } })
    .select('sessionId currentPath pageViews isReturning device source city lastSeenAt startedAt')
    .sort({ lastSeenAt: -1 })
    .limit(100)
    .lean();

  return {
    active: sessions.length,
    sessions: sessions.map((s) => ({
      ...s,
      secondsAgo: Math.max(0, Math.round((Date.now() - new Date(s.lastSeenAt).getTime()) / 1000)),
      durationSec: Math.max(0, Math.round((new Date(s.lastSeenAt) - new Date(s.startedAt)) / 1000)),
    })),
  };
}

const dayKey = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:30' } };

export async function analyticsOverview({ from, to, previous = true }) {
  const range = { $gte: from, $lte: to };
  const spanMs = to - from;
  const prevRange = { $gte: new Date(from - spanMs), $lte: new Date(from) };

  const [current] = await AnalyticsEvent.aggregate([
    { $match: { createdAt: range } },
    {
      $group: {
        _id: null,
        pageViews: { $sum: { $cond: [{ $eq: ['$type', 'page_view'] }, 1, 0] } },
        productViews: { $sum: { $cond: [{ $eq: ['$type', 'product_view'] }, 1, 0] } },
        addToCart: { $sum: { $cond: [{ $eq: ['$type', 'add_to_cart'] }, 1, 0] } },
        checkoutStart: { $sum: { $cond: [{ $eq: ['$type', 'checkout_start'] }, 1, 0] } },
        purchases: { $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, 1, 0] } },
        revenue: { $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, '$value', 0] } },
      },
    },
  ]);

  const sessions = await VisitorSession.aggregate([
    { $match: { startedAt: range } },
    {
      $group: {
        _id: null,
        visitors: { $sum: 1 },
        uniqueVisitors: { $addToSet: '$visitorId' },
        returning: { $sum: { $cond: ['$isReturning', 1, 0] } },
        bounced: { $sum: { $cond: [{ $lte: ['$pageViews', 1] }, 1, 0] } },
        duration: { $avg: { $subtract: ['$lastSeenAt', '$startedAt'] } },
      },
    },
  ]);

  const [prev] = previous
    ? await AnalyticsEvent.aggregate([
        { $match: { createdAt: prevRange } },
        {
          $group: {
            _id: null,
            pageViews: { $sum: { $cond: [{ $eq: ['$type', 'page_view'] }, 1, 0] } },
            purchases: { $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, 1, 0] } },
            revenue: { $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, '$value', 0] } },
          },
        },
      ])
    : [null];

  const prevSessions = previous
    ? await VisitorSession.countDocuments({ startedAt: prevRange })
    : 0;

  const s = sessions[0] || {};
  const c = current || {};
  const visitors = s.visitors || 0;

  return {
    totalVisitors: visitors,
    uniqueVisitors: (s.uniqueVisitors || []).length,
    returningVisitors: s.returning || 0,
    pageViews: c.pageViews || 0,
    productViews: c.productViews || 0,
    cartAdditions: c.addToCart || 0,
    checkoutInitiations: c.checkoutStart || 0,
    completedPurchases: c.purchases || 0,
    revenue: c.revenue || 0,
    avgSessionDurationSec: s.duration ? Math.round(s.duration / 1000) : 0,
    bounceRate: visitors ? Math.round(((s.bounced || 0) / visitors) * 1000) / 10 : 0,
    conversionRate: visitors ? Math.round(((c.purchases || 0) / visitors) * 1000) / 10 : 0,
    comparison: {
      visitors: prevSessions,
      pageViews: prev?.pageViews || 0,
      purchases: prev?.purchases || 0,
      revenue: prev?.revenue || 0,
      visitorsChangePercent: pctChange(visitors, prevSessions),
      pageViewsChangePercent: pctChange(c.pageViews || 0, prev?.pageViews || 0),
      revenueChangePercent: pctChange(c.revenue || 0, prev?.revenue || 0),
    },
  };
}

export const pctChange = (curr, prev) => {
  if (!prev) return curr ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
};

export async function visitorsTimeseries({ from, to, groupBy = 'day' }) {
  const formats = { day: '%Y-%m-%d', week: '%G-W%V', month: '%Y-%m' };
  const format = formats[groupBy] || formats.day;

  const sessions = await VisitorSession.aggregate([
    { $match: { startedAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: { $dateToString: { format, date: '$startedAt', timezone: '+05:30' } },
        visitors: { $sum: 1 },
        unique: { $addToSet: '$visitorId' },
        returning: { $sum: { $cond: ['$isReturning', 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        label: '$_id',
        visitors: 1,
        unique: { $size: '$unique' },
        returning: 1,
      },
    },
  ]);

  const pageViews = await AnalyticsEvent.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to }, type: 'page_view' } },
    {
      $group: {
        _id: { $dateToString: { format, date: '$createdAt', timezone: '+05:30' } },
        views: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, label: '$_id', views: 1 } },
  ]);

  return { visitors: sessions, pageViews };
}

export async function trafficSources({ from, to }) {
  const rows = await VisitorSession.aggregate([
    { $match: { startedAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  return rows.map((r) => ({ source: r._id || 'Direct', count: r.count, percent: Math.round((r.count / total) * 1000) / 10 }));
}

export async function deviceDistribution({ from, to }) {
  const rows = await VisitorSession.aggregate([
    { $match: { startedAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$device', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  return rows.map((r) => ({ device: r._id || 'Desktop', count: r.count, percent: Math.round((r.count / total) * 1000) / 10 }));
}

export async function topPages({ from, to, limit = 10 }) {
  return AnalyticsEvent.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to }, type: 'page_view' } },
    { $group: { _id: '$path', views: { $sum: 1 } } },
    { $sort: { views: -1 } },
    { $limit: limit },
    { $project: { _id: 0, path: '$_id', views: 1 } },
  ]);
}

export async function geoBreakdown({ from, to }) {
  const rows = await VisitorSession.aggregate([
    { $match: { startedAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: { state: '$state', city: '$city', country: '$country' },
        visitors: { $sum: 1 },
      },
    },
    { $sort: { visitors: -1 } },
    { $limit: 20 },
    {
      $project: {
        _id: 0,
        state: { $ifNull: ['$_id.state', 'Unknown'] },
        city: { $ifNull: ['$_id.city', 'Unknown'] },
        country: { $ifNull: ['$_id.country', 'India'] },
        visitors: 1,
      },
    },
  ]);
  return rows;
}

export async function conversionFunnel({ from, to }) {
  const counts = await AnalyticsEvent.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$type', count: { $sum: 1 }, sessions: { $addToSet: '$sessionId' } } },
  ]);

  const map = counts.reduce((acc, c) => {
    acc[c._id] = { count: c.count, sessions: c.sessions.length };
    return acc;
  }, {});

  const steps = [
    { key: 'page_view', label: 'Website Visits' },
    { key: 'product_view', label: 'Product Views' },
    { key: 'add_to_cart', label: 'Add to Cart' },
    { key: 'checkout_start', label: 'Checkout' },
    { key: 'purchase', label: 'Purchase' },
  ];

  const first = map.page_view?.sessions || 0;
  return steps.map((step, i) => {
    const value = map[step.key]?.sessions || 0;
    const prev = i === 0 ? value : map[steps[i - 1].key]?.sessions || 0;
    return {
      ...step,
      count: map[step.key]?.count || 0,
      sessions: value,
      fromStartPercent: first ? Math.round((value / first) * 1000) / 10 : 0,
      fromPreviousPercent: prev ? Math.round((value / prev) * 1000) / 10 : 0,
    };
  });
}

export const analyticsService = {
  trackEvent,
  recordRecentView,
  listRecentViews,
  mergeRecentViews,
  analyticsEventPurge,
  recentViewPurge,
  liveVisitors,
  analyticsOverview,
  visitorsTimeseries,
  trafficSources,
  deviceDistribution,
  topPages,
  geoBreakdown,
  conversionFunnel,
  detectDevice,
  EVENT_CONSENT_CATEGORY,
};
export default analyticsService;
