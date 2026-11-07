import mongoose from 'mongoose';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import VisitorSession from '../models/VisitorSession.js';
import ConsentRecord from '../models/ConsentRecord.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

/**
 * Aggregated visitor analytics for the admin dashboard.
 *
 * Everything here is a rollup. No individual visitor's history is exposed —
 * product and cart tables carry counts only, not session ids or user ids.
 */

const round1 = (n) => Math.round((n || 0) * 10) / 10;

/** Product ranking from analytics events, enriched with product details. */
async function rankProducts(from, to, types, limit) {
  const rows = await AnalyticsEvent.aggregate([
    {
      $match: {
        createdAt: { $gte: from, $lte: to },
        type: { $in: types },
        product: { $ne: null },
      },
    },
    { $group: { _id: '$product', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  const ids = rows.map((r) => r._id).filter(Boolean);
  const products = await Product.find({ _id: { $in: ids } })
    .select('name slug images price')
    .lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  return rows
    .map((r) => {
      const p = byId.get(String(r._id));
      if (!p) return null;
      return {
        productId: p._id,
        name: p.name,
        slug: p.slug,
        image: p.images?.[0]?.url || p.images?.[0] || '',
        price: p.price,
        count: r.count,
      };
    })
    .filter(Boolean);
}

/**
 * The full visitor-overview payload used by the admin "Visitors" panel.
 */
export async function visitorOverview({ from, to }) {
  const range = { $gte: from, $lte: to };
  const activeSince = new Date(Date.now() - 5 * 60 * 1000);

  const [
    sessionStats,
    activeSessions,
    registeredInRange,
    totalRegistered,
    consentRows,
    productViewLeaders,
    cartLeaders,
    wishlistLeaders,
    cartAbandon,
    funnelSessions,
  ] = await Promise.all([
    VisitorSession.aggregate([
      { $match: { startedAt: range } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$visitorId' },
          guestSessions: { $sum: { $cond: [{ $eq: [{ $ifNull: ['$user', null] }, null] }, 1, 0] } },
          userSessions: { $sum: { $cond: [{ $ne: [{ $ifNull: ['$user', null] }, null] }, 1, 0] } },
          returning: { $sum: { $cond: ['$isReturning', 1, 0] } },
          bounced: { $sum: { $cond: [{ $lte: ['$pageViews', 1] }, 1, 0] } },
          duration: { $avg: { $subtract: ['$lastSeenAt', '$startedAt'] } },
          withAnalyticsConsent: {
            $sum: { $cond: [{ $eq: ['$consent.analytics', true] }, 1, 0] },
          },
        },
      },
    ]),
    VisitorSession.countDocuments({ lastSeenAt: { $gte: activeSince } }),
    User.countDocuments({ createdAt: range, role: { $ne: 'ADMIN' } }),
    User.countDocuments({ role: { $ne: 'ADMIN' } }),
    ConsentRecord.aggregate([
      { $match: { decidedAt: range } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          acceptAll: { $sum: { $cond: [{ $eq: ['$action', 'ACCEPT_ALL'] }, 1, 0] } },
          rejectOptional: { $sum: { $cond: [{ $eq: ['$action', 'REJECT_OPTIONAL'] }, 1, 0] } },
          custom: { $sum: { $cond: [{ $eq: ['$action', 'CUSTOM'] }, 1, 0] } },
          withdrawn: { $sum: { $cond: [{ $eq: ['$action', 'WITHDRAWN'] }, 1, 0] } },
          analyticsOn: { $sum: { $cond: ['$categories.analytics', 1, 0] } },
          functionalOn: { $sum: { $cond: ['$categories.functional', 1, 0] } },
          marketingOn: { $sum: { $cond: ['$categories.marketing', 1, 0] } },
        },
      },
    ]),
    rankProducts(from, to, ['product_view'], 8),
    rankProducts(from, to, ['add_to_cart'], 8),
    rankProducts(from, to, ['wishlist_add'], 8),
    abandonedCarts(from, to),
    AnalyticsEvent.aggregate([
      { $match: { createdAt: range } },
      {
        $group: {
          _id: '$type',
          sessions: { $addToSet: '$sessionId' },
        },
      },
    ]),
  ]);

  const s = sessionStats[0] || {};
  const consentAgg = consentRows[0] || {};

  const sessionsByEvent = funnelSessions.reduce((acc, r) => {
    acc[r._id] = r.sessions.length;
    return acc;
  }, {});

  const cartSessions = sessionsByEvent.add_to_cart || 0;
  const checkoutSessions = sessionsByEvent.checkout_start || 0;
  const purchaseSessions = sessionsByEvent.purchase || 0;

  const consentTotal = consentAgg.total || 0;
  const share = (n) => (consentTotal ? round1((n / consentTotal) * 100) : 0);

  return {
    /* ---- Headline counters ---- */
    totalVisitors: s.uniqueVisitors?.length || 0,
    totalSessions: s.total || 0,
    guestVisitors: s.guestSessions || 0,
    registeredUserSessions: s.userSessions || 0,
    registeredUsers: totalRegistered || 0,
    newRegistrations: registeredInRange || 0,
    activeSessions,
    returningVisitors: s.returning || 0,
    bounceRate: s.total ? round1((s.bounced / s.total) * 100) : 0,
    avgSessionDurationSec: s.duration ? Math.round(s.duration / 1000) : 0,

    /* ---- Product rankings ---- */
    mostViewedProducts: productViewLeaders,
    mostAddedToCart: cartLeaders,
    mostFavorited: wishlistLeaders,

    /* ---- Conversion ---- */
    cartAbandonment: cartAbandon,
    conversion: {
      cartSessions,
      checkoutSessions,
      purchaseSessions,
      /* Of the visitors who reached checkout, how many completed a purchase. */
      checkoutConversionRate: checkoutSessions ? round1((purchaseSessions / checkoutSessions) * 100) : 0,
      /* Of the visitors who added to cart, how many completed a purchase. */
      cartToPurchaseRate: cartSessions ? round1((purchaseSessions / cartSessions) * 100) : 0,
      cartToCheckoutRate: cartSessions ? round1((checkoutSessions / cartSessions) * 100) : 0,
    },

    /* ---- Consent ---- */
    consent: {
      totalDecisions: consentTotal,
      acceptAll: consentAgg.acceptAll || 0,
      rejectOptional: consentAgg.rejectOptional || 0,
      custom: consentAgg.custom || 0,
      withdrawn: consentAgg.withdrawn || 0,
      acceptAllPercent: share(consentAgg.acceptAll || 0),
      rejectOptionalPercent: share(consentAgg.rejectOptional || 0),
      customPercent: share(consentAgg.custom || 0),
      analyticsGrantedPercent: share(consentAgg.analyticsOn || 0),
      functionalGrantedPercent: share(consentAgg.functionalOn || 0),
      marketingGrantedPercent: share(consentAgg.marketingOn || 0),
      sessionsWithAnalyticsConsent: s.withAnalyticsConsent || 0,
    },

    range: { from, to },
  };
}

/**
 * Cart abandonment: carts that still hold items and never converted to an order.
 * Measured over carts last touched in the range.
 */
export async function abandonedCarts(from, to) {
  const carts = await Cart.aggregate([
    { $match: { 'items.0': { $exists: true }, updatedAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        guest: { $sum: { $cond: [{ $eq: [{ $ifNull: ['$user', null] }, null] }, 1, 0] } },
        registered: { $sum: { $cond: [{ $ne: [{ $ifNull: ['$user', null] }, null] }, 1, 0] } },
      },
    },
  ]);

  const c = carts[0] || { total: 0, guest: 0, registered: 0 };

  /* How many carts in the same window turned into an order? */
  const orders = await Order.countDocuments({ createdAt: { $gte: from, $lte: to } });
  const considered = c.total + orders;
  const rate = considered ? round1((c.total / considered) * 100) : 0;

  /* Value at risk: sum of the line items still sitting in those carts. */
  const value = await Cart.aggregate([
    { $match: { 'items.0': { $exists: true }, updatedAt: { $gte: from, $lte: to } } },
    { $unwind: '$items' },
    { $group: { _id: null, subtotal: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
  ]);

  return {
    cartsWithItems: c.total,
    guestCarts: c.guest,
    registeredCarts: c.registered,
    ordersInRange: orders,
    abandonmentRate: rate,
    valueAtRisk: Math.round(value[0]?.subtotal || 0),
  };
}

/** Smallest possible shape for a "most viewed" widget elsewhere in the admin. */
export async function topViewedProducts({ from, to, limit = 5 }) {
  return rankProducts(from, to, ['product_view'], limit);
}

export default { visitorOverview, abandonedCarts, topViewedProducts };
export const __testing = { rankProducts, round1, mongoose };
