import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import Coupon from '../models/Coupon.js';
import Cart from '../models/Cart.js';
import ContactMessage from '../models/ContactMessage.js';
import Subscriber from '../models/Subscriber.js';
import AuditLog from '../models/AuditLog.js';
import Admin from '../models/Admin.js';
import Notification from '../models/Notification.js';
import { asyncHandler, escapeRegex, ok, paginationMeta, parsePagination, round2, slugify } from '../utils/index.js';
import ApiError from '../utils/ApiError.js';
import { advanceOrderStatus, refundOrder } from '../services/order.service.js';
import { pctChange } from '../services/analytics.service.js';
import { recordAudit } from '../middleware/audit.js';
import { notifyCustomer } from '../services/notification.service.js';
import { releaseCoupon } from '../services/pricing.service.js';

const dayKey = (field = 'createdAt') => ({ $dateToString: { format: '%Y-%m-%d', date: `$${field}`, timezone: '+05:30' } });

/* -------------------------------- Dashboard -------------------------------- */

export const dashboard = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req.query);
  const prevSpan = to - from;
  const prevFrom = new Date(from - prevSpan);
  const range = { $gte: from, $lte: to };
  const prevRange = { $gte: prevFrom, $lte: from };

  const [current] = await Order.aggregate([
    { $match: { createdAt: range, 'payment.status': { $in: ['PAID', 'PARTIALLY_REFUNDED'] } } },
    { $group: { _id: null, revenue: { $sum: '$pricing.total' }, orders: { $sum: 1 }, units: { $sum: { $size: '$items' } } } },
  ]);
  const [previous] = await Order.aggregate([
    { $match: { createdAt: prevRange, 'payment.status': { $in: ['PAID', 'PARTIALLY_REFUNDED'] } } },
    { $group: { _id: null, revenue: { $sum: '$pricing.total' }, orders: { $sum: 1 } } },
  ]);

  const [customers, newCustomers, products, pendingOrders, stockStats, allOrders] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: range }),
    Product.countDocuments({ status: 'ACTIVE' }),
    Order.countDocuments({ status: { $in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED'] } }),
    Product.aggregate([
      {
        $group: {
          _id: null,
          lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] }, 1, 0] } },
          outOfStock: { $sum: { $cond: [{ $lte: ['$stock', 0] }, 1, 0] } },
        },
      },
    ]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const { analyticsOverview } = await import('../services/analytics.service.js');
  const traffic = await analyticsOverview({ from, to });

  const revenueSeries = await Order.aggregate([
    { $match: { createdAt: range, 'payment.status': { $in: ['PAID', 'PARTIALLY_REFUNDED'] } } },
    { $group: { _id: dayKey(), revenue: { $sum: '$pricing.total' }, orders: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, label: '$_id', revenue: 1, orders: 1 } },
  ]);

  const statusDist = allOrders.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {});

  const categorySales = await Order.aggregate([
    { $match: { createdAt: range, 'payment.status': { $in: ['PAID', 'PARTIALLY_REFUNDED'] } } },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    { $lookup: { from: 'categories', localField: 'product.category', foreignField: '_id', as: 'category' } },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ['$category.name', 'Other'] },
        revenue: { $sum: '$items.total' },
        units: { $sum: '$items.quantity' },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 6 },
    { $project: { _id: 0, category: '$_id', revenue: 1, units: 1 } },
  ]);

  const topProducts = await Order.aggregate([
    { $match: { createdAt: range, 'payment.status': { $in: ['PAID', 'PARTIALLY_REFUNDED'] } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        image: { $first: '$items.image' },
        slug: { $first: '$items.slug' },
        units: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.total' },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 5 },
  ]);

  const [recentOrders, recentCustomers, lowStockProducts, recentActivity, abandoned] = await Promise.all([
    Order.find().sort({ createdAt: -1 }).limit(6).select('orderNumber customer pricing status createdAt items').lean(),
    User.find().sort({ createdAt: -1 }).limit(5).select('fullName email createdAt stats').lean(),
    Product.find({ $expr: { $lte: ['$stock', '$lowStockThreshold'] } }).select('name sku stock images lowStockThreshold').limit(5).lean(),
    AuditLog.find().sort({ createdAt: -1 }).limit(6).lean(),
    Cart.aggregate([
      { $match: { 'items.0': { $exists: true }, updatedAt: { $gte: new Date(Date.now() - 7 * 86400000) } } },
      { $unwind: '$items' },
      { $group: { _id: '$_id', value: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }, user: { $first: '$user' }, updatedAt: { $first: '$updatedAt' } } },
      { $group: { _id: null, carts: { $sum: 1 }, value: { $sum: '$value' } } },
    ]),
  ]);

  const revenue = current?.revenue || 0;
  const orders = current?.orders || 0;

  return ok(res, {
    range: { from, to, label: req.query.range || '30d' },
    kpis: {
      revenue,
      revenueChange: pctChange(revenue, previous?.revenue || 0),
      orders,
      ordersChange: pctChange(orders, previous?.orders || 0),
      aov: orders ? round2(revenue / orders) : 0,
      products,
      customers,
      newCustomers,
      pendingOrders,
      lowStock: stockStats[0]?.lowStock || 0,
      outOfStock: stockStats[0]?.outOfStock || 0,
      visitors: traffic.totalVisitors,
      visitorsChange: traffic.comparison?.visitorsChangePercent || 0,
      conversionRate: traffic.conversionRate,
      conversionChange: pctChange(traffic.conversionRate, 0),
      abandonedCarts: abandoned[0]?.carts || 0,
      abandonedValue: round2(abandoned[0]?.value || 0),
    },
    revenueSeries,
    statusDistribution: Object.entries(statusDist).map(([status, count]) => ({ status, count })),
    categorySales,
    topProducts,
    recentOrders,
    recentCustomers,
    lowStockProducts,
    recentActivity,
    traffic,
  });
});

export const revenueReport = asyncHandler(async (req, res) => {
  const { from, to, groupBy = 'day' } = req.query;
  const formats = { day: '%Y-%m-%d', week: '%G-W%V', month: '%Y-%m' };
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: new Date(from), $lte: new Date(to) }, 'payment.status': { $in: ['PAID', 'PARTIALLY_REFUNDED'] } } },
    {
      $group: {
        _id: { $dateToString: { format: formats[groupBy] || formats.day, date: '$createdAt', timezone: '+05:30' } },
        revenue: { $sum: '$pricing.total' },
        orders: { $sum: 1 },
        discount: { $sum: '$pricing.couponDiscount' },
        shipping: { $sum: '$pricing.shipping' },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, label: '$_id', revenue: 1, orders: 1, discount: 1, shipping: 1 } },
  ]);
  return ok(res, rows);
});

/* --------------------------------- Orders --------------------------------- */

export const adminListOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 15, maxLimit: 200 });
  const filter = {};
  if (req.query.status && req.query.status !== 'ALL') filter.status = { $in: String(req.query.status).split(',') };
  if (req.query.paymentStatus) filter['payment.status'] = req.query.paymentStatus;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ orderNumber: rx }, { 'customer.fullName': rx }, { 'customer.email': rx }, { 'customer.mobile': rx }];
  }
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }
  if (req.query.minAmount || req.query.maxAmount) {
    filter['pricing.total'] = {};
    if (req.query.minAmount) filter['pricing.total'].$gte = Number(req.query.minAmount);
    if (req.query.maxAmount) filter['pricing.total'].$lte = Number(req.query.maxAmount);
  }

  const [orders, total, statusCounts] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  return ok(res, orders, 'Orders fetched', {
    ...paginationMeta({ page, limit, total }),
    statusCounts: statusCounts.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
  });
});

export const adminGetOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'fullName email mobile createdAt stats').lean();
  if (!order) throw ApiError.notFound('Order not found');
  const payments = await Payment.find({ order: order._id }).sort({ createdAt: -1 }).lean();
  return ok(res, { order, payments });
});

export const adminUpdateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  const { status, note, courier, trackingNumber, trackingUrl } = req.body;
  await advanceOrderStatus({ order, status, note, by: req.admin.name, tracking: { courier, trackingNumber, trackingUrl } });
  await recordAudit(req, { action: 'ORDER_STATUS', entity: 'Order', entityId: order._id, description: `${order.orderNumber} -> ${status}` });
  return ok(res, order, 'Order status updated');
});

export const adminRefundOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  const result = await refundOrder({
    order,
    amount: req.body.amount,
    reason: req.body.reason || 'Admin refund',
    adminId: req.admin._id,
  });
  await recordAudit(req, {
    action: 'PAYMENT_REFUND',
    entity: 'Payment',
    entityId: result.payment._id,
    description: `Refund ₹${result.amount} for ${order.orderNumber}`,
  });
  return ok(res, { refund: result.refund, amount: result.amount, status: result.payment.status }, 'Refund processed');
});

export const adminCancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  await advanceOrderStatus({ order, status: 'CANCELLED', note: req.body.reason || 'Cancelled by admin', by: req.admin.name });
  if (order.pricing.couponCode) {
    const coupon = await Coupon.findOne({ code: order.pricing.couponCode });
    if (coupon) await releaseCoupon(coupon._id, order.user);
  }
  await recordAudit(req, { action: 'ORDER_CANCEL', entity: 'Order', entityId: order._id, description: `Cancelled ${order.orderNumber}` });
  return ok(res, order, 'Order cancelled');
});

export const adminInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).lean();
  if (!order) throw ApiError.notFound('Order not found');
  const { getSettings } = await import('../services/pricing.service.js');
  const settings = await getSettings();
  return ok(res, {
    invoiceNumber: order.invoiceNumber || `INV-${order.orderNumber}`,
    order,
    store: {
      name: settings.general.storeName,
      email: settings.general.email,
      phone: settings.general.phone,
      address: settings.general.address,
      currency: settings.general.currency,
    },
    generatedAt: new Date().toISOString(),
  });
});

/* -------------------------------- Payments -------------------------------- */

export const adminListPayments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 15, maxLimit: 200 });
  const filter = {};
  if (req.query.status && req.query.status !== 'ALL') filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ orderNumber: rx }, { razorpayOrderId: rx }, { razorpayPaymentId: rx }];
  }
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }
  const [payments, total, stats] = await Promise.all([
    Payment.find(filter).populate('user', 'fullName email').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Payment.countDocuments(filter),
    Payment.aggregate([
      {
        $group: {
          _id: null,
          collected: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, '$amount', 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, '$amount', 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
          refunded: { $sum: '$refundedAmount' },
        },
      },
    ]),
  ]);
  return ok(res, payments, 'Payments fetched', { ...paginationMeta({ page, limit, total }), stats: stats[0] || {} });
});

export const adminGetPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate('user', 'fullName email').populate('order', 'orderNumber status pricing items').lean();
  if (!payment) throw ApiError.notFound('Payment not found');
  return ok(res, payment);
});

export const adminRecheckPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw ApiError.notFound('Payment not found');
  const { razorpay } = await import('../services/razorpay.service.js');
  if (!payment.razorpayPaymentId) throw ApiError.badRequest('No Razorpay payment reference yet');
  const remote = await razorpay.fetchPayment(payment.razorpayPaymentId);
  if (!remote) throw ApiError.badRequest('Could not reach Razorpay (or live keys not configured)');
  payment.status = remote.status === 'captured' ? 'PAID' : remote.status === 'failed' ? 'FAILED' : payment.status;
  await payment.save();
  return ok(res, { local: payment, remote }, 'Payment status refreshed');
});

/* -------------------------------- Customers ------------------------------- */

export const adminListCustomers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 15, maxLimit: 200 });
  const filter = {};
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ fullName: rx }, { email: rx }, { mobile: rx }];
  }
  if (req.query.status === 'blocked') filter.isBlocked = true;
  if (req.query.status === 'active') filter.isBlocked = false;

  const sortMap = { newest: { createdAt: -1 }, 'spent-desc': { 'stats.spent': -1 }, 'orders-desc': { 'stats.orders': -1 }, 'name-asc': { fullName: 1 } };
  const [customers, total] = await Promise.all([
    User.find(filter).sort(sortMap[req.query.sort] || sortMap.newest).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  return ok(res, customers, 'Customers fetched', paginationMeta({ page, limit, total }));
});

export const adminGetCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findById(req.params.id).lean();
  if (!customer) throw ApiError.notFound('Customer not found');
  const orders = await Order.find({ user: customer._id }).sort({ createdAt: -1 }).limit(20).lean();
  const reviews = await Review.find({ user: customer._id }).populate('product', 'name').limit(10).lean();
  return ok(res, { customer, orders, reviews });
});

export const adminToggleCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');
  customer.isBlocked = !customer.isBlocked;
  await customer.save({ validateBeforeSave: false });
  await recordAudit(req, {
    action: 'CUSTOMER_STATUS',
    entity: 'User',
    entityId: customer._id,
    description: `${customer.isBlocked ? 'Blocked' : 'Unblocked'} ${customer.email}`,
  });
  return ok(res, { isBlocked: customer.isBlocked }, customer.isBlocked ? 'Customer blocked' : 'Customer unblocked');
});

/* -------------------------------- Coupons --------------------------------- */

export const adminListCoupons = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 15 });
  const filter = {};
  if (req.query.q) filter.code = new RegExp(escapeRegex(req.query.q), 'i');
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;
  const [coupons, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Coupon.countDocuments(filter),
  ]);
  return ok(res, coupons, 'Coupons fetched', paginationMeta({ page, limit, total }));
});

export const adminSaveCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = { ...req.body, code: String(req.body.code || '').toUpperCase().trim() };
  if (!body.code) throw ApiError.badRequest('Coupon code is required');
  if (id) {
    const coupon = await Coupon.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!coupon) throw ApiError.notFound('Coupon not found');
    await recordAudit(req, { action: 'COUPON_UPDATE', entity: 'Coupon', entityId: coupon._id, description: `Updated ${coupon.code}` });
    return ok(res, coupon, 'Coupon updated');
  }
  const exists = await Coupon.findOne({ code: body.code });
  if (exists) throw ApiError.conflict('This coupon code already exists');
  const coupon = await Coupon.create({ ...body, createdBy: req.admin._id });
  await recordAudit(req, { action: 'COUPON_CREATE', entity: 'Coupon', entityId: coupon._id, description: `Created ${coupon.code}` });
  return ok(res, coupon, 'Coupon created');
});

export const adminDeleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  await recordAudit(req, { action: 'COUPON_DELETE', entity: 'Coupon', entityId: req.params.id, description: `Deleted ${coupon.code}` });
  return ok(res, null, 'Coupon deleted');
});

/* -------------------------------- Reviews --------------------------------- */

export const adminListReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 15 });
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.rating) filter.rating = Number(req.query.rating);
  if (req.query.q) filter.comment = new RegExp(escapeRegex(req.query.q), 'i');
  const [reviews, total, counts] = await Promise.all([
    Review.find(filter).populate('product', 'name slug images').populate('user', 'fullName email').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Review.countDocuments(filter),
    Review.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  return ok(res, reviews, 'Reviews fetched', {
    ...paginationMeta({ page, limit, total }),
    counts: counts.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
  });
});

export const adminModerateReview = asyncHandler(async (req, res) => {
  const { status, adminResponse } = req.body;
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');
  if (status) review.status = status;
  if (adminResponse !== undefined) review.adminResponse = adminResponse;
  await review.save();
  await Review.recalcProductRating(review.product);
  await recordAudit(req, { action: 'REVIEW_MODERATE', entity: 'Review', entityId: review._id, description: `Review set to ${review.status}` });
  return ok(res, review, 'Review updated');
});

export const adminDeleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');
  await Review.recalcProductRating(review.product);
  await recordAudit(req, { action: 'REVIEW_DELETE', entity: 'Review', entityId: req.params.id, description: 'Review deleted' });
  return ok(res, null, 'Review deleted');
});

/* ------------------------------- Operations ------------------------------- */

export const adminListContacts = asyncHandler(async (req, res) => {
  const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(100).lean();
  return ok(res, messages);
});

export const adminUpdateContact = asyncHandler(async (req, res) => {
  const msg = await ContactMessage.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!msg) throw ApiError.notFound('Message not found');
  return ok(res, msg, 'Message updated');
});

export const adminListSubscribers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
  const [rows, total] = await Promise.all([
    Subscriber.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Subscriber.countDocuments(),
  ]);
  return ok(res, rows, 'Subscribers fetched', paginationMeta({ page, limit, total }));
});

export const adminAbandonedCarts = asyncHandler(async (_req, res) => {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const carts = await Cart.find({ 'items.0': { $exists: true }, updatedAt: { $lte: cutoff } })
    .populate('user', 'fullName email')
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();
  const ownerIds = carts.filter((c) => c.user).map((c) => c.user._id);
  const orders = await Order.find({ user: { $in: ownerIds }, createdAt: { $gte: cutoff } }).select('user').lean();
  const converted = new Set(orders.map((o) => String(o.user)));
  const enriched = carts.map((c) => ({
    ...c,
    value: round2(c.items.reduce((s, i) => s + i.price * i.quantity, 0)),
    recovered: c.user ? converted.has(String(c.user._id)) : false,
  }));
  return ok(
    res,
    enriched,
    'Abandoned carts',
    {
      total: enriched.length,
      value: round2(enriched.reduce((s, c) => s + c.value, 0)),
      recovered: enriched.filter((c) => c.recovered).length,
    }
  );
});

export const adminNotifications = asyncHandler(async (req, res) => {
  const filter = { audience: 'ADMIN' };
  if (req.query.unread === 'true') filter.isRead = false;
  const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  const unread = await Notification.countDocuments({ audience: 'ADMIN', isRead: false });
  const audit = req.query.audit === 'true' ? await AuditLog.find().sort({ createdAt: -1 }).limit(50).lean() : [];
  return ok(res, { items, unread, audit });
});

export const adminMarkNotificationRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ _id: { $in: req.body.ids || [] } }, { isRead: true });
  return ok(res, null, 'Marked as read');
});

/* --------------------------------- Admins --------------------------------- */

export const adminListAdmins = asyncHandler(async (_req, res) => {
  const admins = await Admin.find().select('-password').sort({ createdAt: -1 }).lean();
  return ok(res, admins);
});

export const adminSaveAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, isActive = true } = req.body;
  if (id) {
    const admin = await Admin.findById(id).select('+password');
    if (!admin) throw ApiError.notFound('Admin not found');
    if (name) admin.name = name;
    if (role) admin.role = role;
    if (typeof isActive === 'boolean') admin.isActive = isActive;
    if (password) admin.password = password;
    await admin.save();
    await recordAudit(req, { action: 'ADMIN_UPDATE', entity: 'Admin', entityId: admin._id, description: `Updated ${admin.email}` });
    return ok(res, { ...admin.toObject(), password: undefined }, 'Admin updated');
  }
  if (!name || !email || !password) throw ApiError.badRequest('Name, email and password are required');
  const exists = await Admin.findOne({ email: email.toLowerCase() });
  if (exists) throw ApiError.conflict('An admin with this email already exists');
  const admin = await Admin.create({ name, email, password, role: role || 'ADMIN', createdBy: req.admin._id });
  await recordAudit(req, { action: 'ADMIN_CREATE', entity: 'Admin', entityId: admin._id, description: `Created admin ${admin.email}` });
  return ok(res, { ...admin.toObject(), password: undefined }, 'Admin created');
});

export const adminDeleteAdmin = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.admin._id)) throw ApiError.badRequest('You cannot delete your own account');
  const admin = await Admin.findByIdAndDelete(req.params.id);
  if (!admin) throw ApiError.notFound('Admin not found');
  await recordAudit(req, { action: 'ADMIN_DELETE', entity: 'Admin', entityId: req.params.id, description: `Deleted admin ${admin.email}` });
  return ok(res, null, 'Admin removed');
});

export const adminAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25 });
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.entity) filter.entity = req.query.entity;
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  return ok(res, logs, 'Audit logs', paginationMeta({ page, limit, total }));
});

/* -------------------------------- Reports -------------------------------- */

export const customerReport = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req.query);
  const range = { $gte: from, $lte: to };
  const rows = await User.aggregate([
    { $match: { createdAt: range } },
    { $group: { _id: dayKey(), signups: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, label: '$_id', signups: 1 } },
  ]);
  const topCustomers = await User.find().sort({ 'stats.spent': -1 }).limit(10).select('fullName email stats createdAt').lean();
  const totals = await User.aggregate([
    { $group: { _id: null, total: { $sum: 1 }, buyers: { $sum: { $cond: [{ $gt: ['$stats.orders', 0] }, 1, 0] } }, revenue: { $sum: '$stats.spent' } } },
  ]);
  return ok(res, { rows, topCustomers, totals: totals[0] || {} });
});

export const productReport = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req.query);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to }, 'payment.status': { $in: ['PAID', 'PARTIALLY_REFUNDED'] } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', name: { $first: '$items.name' }, units: { $sum: '$items.quantity' }, revenue: { $sum: '$items.total' } } },
    { $sort: { revenue: -1 } },
    { $limit: 25 },
  ]);
  const inventory = await Product.find().select('name sku stock price status images').sort({ stock: 1 }).limit(25).lean();
  return ok(res, { rows, inventory });
});

/* ------------------------------- Store settings ------------------------------- */

export const getAdminSettings = asyncHandler(async (_req, res) => {
  const { getSettings } = await import('../services/pricing.service.js');
  const settings = await getSettings();
  const { razorpay } = await import('../services/razorpay.service.js');
  const env = (await import('../config/env.js')).default;
  return ok(res, {
    settings,
    integrations: {
      razorpay: {
        configured: env.razorpay.enabled,
        mode: razorpay.mode,
        webhookConfigured: Boolean(env.razorpay.webhookSecret),
        keyIdMasked: env.razorpay.keyId ? `${env.razorpay.keyId.slice(0, 8)}••••` : '',
      },
      cloudinary: { configured: env.cloudinary.enabled, provider: env.cloudinary.enabled ? 'cloudinary' : 'local' },
      mail: { configured: env.mail.enabled },
    },
  });
});

export const saveAdminSettings = asyncHandler(async (req, res) => {
  const { getSettings } = await import('../services/pricing.service.js');
  const settings = await getSettings();
  const { general, shipping, payment, notifications, seo } = req.body;
  if (general) Object.assign(settings.general, general);
  if (shipping) Object.assign(settings.shipping, shipping);
  if (payment) Object.assign(settings.payment, payment);
  if (notifications) Object.assign(settings.notifications, notifications);
  if (seo) Object.assign(settings.seo, seo);
  settings.updatedBy = req.admin._id;
  await settings.save();
  await recordAudit(req, { action: 'SETTINGS_UPDATE', entity: 'Setting', entityId: settings._id, description: 'Store settings updated' });
  return ok(res, settings, 'Settings saved');
});

/* --------------------------------- helpers -------------------------------- */

export function resolveRange(query = {}) {
  const preset = query.range || '30d';
  const now = new Date();
  const to = query.to ? new Date(query.to) : now;
  if (query.from) return { from: new Date(query.from), to };
  const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[preset] ?? 30;
  return { from: new Date(to.getTime() - days * 86400000), to };
}

export const reportCenter = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req.query);
  const [sales, customers, products, inventory] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          paidOrders: { $sum: { $cond: [{ $eq: ['$payment.status', 'PAID'] }, 1, 0] } },
          revenue: { $sum: { $cond: [{ $eq: ['$payment.status', 'PAID'] }, '$pricing.total', 0] } },
          discounts: { $sum: '$pricing.couponDiscount' },
          shipping: { $sum: '$pricing.shipping' },
          tax: { $sum: '$pricing.tax' },
        },
      },
    ]),
    User.countDocuments({ createdAt: { $gte: from, $lte: to } }),
    Product.countDocuments({ status: 'ACTIVE' }),
    Product.aggregate([{ $group: { _id: null, stock: { $sum: '$stock' }, value: { $sum: { $multiply: ['$stock', '$price'] } } } }]),
  ]);
  return ok(res, {
    range: { from, to },
    sales: sales[0] || { orders: 0, paidOrders: 0, revenue: 0, discounts: 0, shipping: 0, tax: 0 },
    newCustomers: customers,
    activeProducts: products,
    inventory: inventory[0] || { stock: 0, value: 0 },
  });
});

export default {
  dashboard,
  revenueReport,
  adminListOrders,
  adminGetOrder,
  adminUpdateOrderStatus,
  adminRefundOrder,
  adminCancelOrder,
  adminInvoice,
  adminListPayments,
  adminGetPayment,
  adminRecheckPayment,
  adminListCustomers,
  adminGetCustomer,
  adminToggleCustomer,
  adminListCoupons,
  adminSaveCoupon,
  adminDeleteCoupon,
  adminListReviews,
  adminModerateReview,
  adminDeleteReview,
  adminListContacts,
  adminUpdateContact,
  adminListSubscribers,
  adminAbandonedCarts,
  adminNotifications,
  adminMarkNotificationRead,
  adminListAdmins,
  adminSaveAdmin,
  adminDeleteAdmin,
  adminAuditLogs,
  customerReport,
  productReport,
  getAdminSettings,
  saveAdminSettings,
  reportCenter,
  resolveRange,
};
