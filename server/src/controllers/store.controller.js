import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { asyncHandler, ok, paginationMeta, parsePagination } from '../utils/index.js';
import ApiError from '../utils/ApiError.js';
import {
  createOrderFromCart,
  markPaymentFailed,
  retryPayment,
  verifyAndConfirmPayment,
} from '../services/order.service.js';
import { razorpay } from '../services/razorpay.service.js';
import { trackEvent } from '../services/analytics.service.js';

/**
 * Ownership guard for every order-mutating checkout action.
 * Orders always carry `user` now that checkout requires login; `customer.email`
 * is never used to infer ownership.
 */
async function assertOrderOwnership(orderId, user) {
  if (!user?._id) {
    throw ApiError.unauthorized('Please log in or create an account to continue with your order.');
  }
  if (!mongoose.isValidObjectId(orderId)) throw ApiError.badRequest('A valid order id is required');
  const order = await Order.findById(orderId).select('user customer payment status');
  if (!order) throw ApiError.notFound('Order not found');
  if (!order.user || String(order.user) !== String(user._id)) {
    throw ApiError.forbidden('This order belongs to another account');
  }
  return order;
}

/** POST /checkout — creates an order + gateway order, reserving stock. */
export const createCheckout = asyncHandler(async (req, res) => {
  /* Login is mandatory before an order can exist. The route enforces this too;
     this guard keeps the controller honest if it is ever mounted elsewhere. */
  if (!req.user?._id) {
    throw ApiError.unauthorized('Please log in or create an account to continue with your order.');
  }
  const { items, shippingAddress, customer, couponCode } = req.body;

  let cartItems = items;
  if (!cartItems?.length) {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart?.items?.length) throw ApiError.badRequest('Your bag is empty');
    cartItems = cart.items.map((i) => ({ product: i.product, variantId: i.variantId, quantity: i.quantity }));
  }

  const result = await createOrderFromCart({
    user: req.user,
    items: cartItems,
    shippingAddress,
    customer: customer || {
      fullName: req.user?.fullName,
      email: req.user?.email,
      mobile: req.user?.mobile,
    },
    couponCode,
  });

  trackEvent(
    {
      type: 'checkout_start',
      sessionId: req.headers['x-session-id'] || `order-${result.order._id}`,
      visitorId: req.headers['x-visitor-id'] || `order-${result.order._id}`,
      user: req.user?._id,
      path: '/checkout',
      value: result.order.pricing.total,
    },
    req
  ).catch(() => {});

  return ok(
    res,
    {
      orderId: result.order._id,
      orderNumber: result.order.orderNumber,
      pricing: result.order.pricing,
      gateway: result.gateway,
    },
    'Order created — complete the payment to confirm'
  );
});

/** POST /checkout/verify — verified signature is mandatory before success. */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature, method } = req.body;
  await assertOrderOwnership(orderId, req.user);
  const { order, alreadyProcessed } = await verifyAndConfirmPayment({
    orderId,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
    method,
    req,
  });
  return ok(
    res,
    {
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        pricing: order.pricing,
        items: order.items,
        shippingAddress: order.shippingAddress,
        customer: order.customer,
        shipping: order.shipping,
        payment: order.payment,
      },
      alreadyProcessed,
    },
    alreadyProcessed ? 'Payment already confirmed' : 'Payment confirmed'
  );
});

/** POST /checkout/failed — honest failure handling, cart preserved. */
export const reportFailed = asyncHandler(async (req, res) => {
  const { orderId, reason } = req.body;
  await assertOrderOwnership(orderId, req.user);
  await markPaymentFailed({ orderId, reason: reason || 'Payment was cancelled or failed' });
  return ok(res, { orderId, status: 'FAILED' }, 'We could not confirm this payment. Your bag has been saved.');
});

export const retry = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const result = await retryPayment(orderId, req.user?._id);
  return ok(res, { orderId: result.order._id, orderNumber: result.order.orderNumber, gateway: result.gateway }, 'Retry payment ready');
});

/** Sandbox-only helper: simulates the gateway payload the browser would receive. */
export const sandboxPayment = asyncHandler(async (req, res) => {
  if (razorpay.mode !== 'sandbox') throw ApiError.forbidden('Sandbox payments are not available');
  const { orderId, razorpayOrderId } = req.body;
  const order = await assertOrderOwnership(orderId, req.user);
  if (String(order.payment?.razorpayOrderId) !== String(razorpayOrderId)) {
    throw ApiError.forbidden('Payment does not belong to this order');
  }
  const payload = razorpay.sandboxPaymentPayload(razorpayOrderId);
  return ok(res, { ...payload, mode: 'sandbox' });
});

/* ------------------------------ Customer orders ------------------------------ */

export const myOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10 });
  const filter = { user: req.user._id };
  if (req.query.status && req.query.status !== 'ALL') {
    const statuses = String(req.query.status).split(',');
    filter.status = { $in: statuses };
  }
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  const statusCounts = await Order.aggregate([
    { $match: { user: req.user._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  return ok(res, orders, 'Orders fetched', {
    ...paginationMeta({ page, limit, total }),
    statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
  });
});

export const myOrderDetail = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!order) throw ApiError.notFound('Order not found');
  return ok(res, order);
});

export const trackOrder = asyncHandler(async (req, res) => {
  const { orderNumber, email } = req.query;
  if (!orderNumber) throw ApiError.badRequest('Order number is required');
  const query = { orderNumber: String(orderNumber).toUpperCase() };
  if (!req.user) query['customer.email'] = String(email || '').toLowerCase();
  else query.$or = [{ user: req.user._id }, { 'customer.email': String(email || '').toLowerCase() }];

  const order = await Order.findOne(query).select('orderNumber status statusHistory items shipping customer createdAt pricing');
  if (!order) throw ApiError.notFound('No order found for these details');
  return ok(res, order);
});

export const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found');
  if (!['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status)) {
    throw ApiError.badRequest('This order can no longer be cancelled. Please request a return instead.');
  }
  const { advanceOrderStatus } = await import('../services/order.service.js');
  await advanceOrderStatus({ order, status: 'CANCELLED', note: req.body.reason || 'Cancelled by customer', by: 'customer' });
  return ok(res, { status: order.status }, 'Order cancelled');
});

export const requestReturn = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status !== 'DELIVERED') throw ApiError.badRequest('Returns can be requested after delivery');
  const deliveredAt = order.shipping.deliveredAt || order.updatedAt;
  const days = Math.floor((Date.now() - new Date(deliveredAt)) / 86400000);
  if (days > 7) throw ApiError.badRequest('The 7-day return window has closed for this order');
  const { advanceOrderStatus } = await import('../services/order.service.js');
  await advanceOrderStatus({
    order,
    status: 'RETURN_REQUESTED',
    note: req.body.reason || 'Return requested by customer',
    by: 'customer',
  });
  return ok(res, { status: order.status }, 'Return request submitted');
});

/** Validates a PIN code against supported delivery regions (no external courier API configured). */
export const checkPincode = asyncHandler(async (req, res) => {
  const { pincode } = req.params;
  if (!/^\d{6}$/.test(pincode)) throw ApiError.badRequest('Enter a valid 6-digit PIN code');
  const { getSettings } = await import('../services/pricing.service.js');
  const settings = await getSettings();
  const first = Number(pincode[0]);
  const metroPins = ['11', '40', '56', '60', '70', '38', '20', '50', '30', '44'];
  const isMetro = metroPins.includes(pincode.slice(0, 2));
  const isServiceable = first >= 1 && first <= 8;
  const days = isMetro ? 3 : settings.shipping.estimatedDeliveryDays;
  const eta = new Date(Date.now() + days * 86400000);
  return ok(res, {
    pincode,
    serviceable: isServiceable,
    codAvailable: settings.shipping.codEnabled && isServiceable,
    estimatedDays: days,
    estimatedDelivery: eta.toISOString(),
    freeShippingThreshold: settings.shipping.freeShippingThreshold,
    shippingCharge: settings.shipping.shippingCharge,
  });
});

/* ------------------------------- Addresses ------------------------------- */

export const listAddresses = asyncHandler(async (req, res) => ok(res, { addresses: req.user.addresses }));

export const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = req.body;
  if (address.isDefault || user.addresses.length === 0) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
    address.isDefault = true;
  }
  user.addresses.push(address);
  await user.save();
  return ok(res, { addresses: user.addresses }, 'Address saved');
});

export const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found');
  Object.assign(address, req.body);
  if (req.body.isDefault) user.addresses.forEach((a) => (a.isDefault = String(a._id) === String(address._id)));
  await user.save();
  return ok(res, { addresses: user.addresses }, 'Address updated');
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found');
  const wasDefault = address.isDefault;
  address.deleteOne();
  if (wasDefault && user.addresses.length) user.addresses[0].isDefault = true;
  await user.save();
  return ok(res, { addresses: user.addresses }, 'Address removed');
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.addresses.forEach((a) => (a.isDefault = String(a._id) === String(req.params.addressId)));
  await user.save();
  return ok(res, { addresses: user.addresses }, 'Default address updated');
});

/* ------------------------------- Reviews ------------------------------- */

export const reviewableItems = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id, status: 'DELIVERED' }).select('items orderNumber createdAt').lean();
  const Review = mongoose.model('Review');
  const existing = await Review.find({ user: req.user._id }).select('product order').lean();
  const key = (p, o) => `${p}:${o}`;
  const done = new Set(existing.map((r) => key(String(r.product), String(r.order))));
  const items = [];
  for (const order of orders) {
    for (const item of order.items) {
      if (!done.has(key(String(item.product), String(order._id)))) {
        items.push({
          product: { _id: item.product, name: item.name, image: item.image, slug: item.slug },
          orderId: order._id,
          orderNumber: order.orderNumber,
          deliveredAt: order.createdAt,
        });
      }
    }
  }
  return ok(res, items);
});

export const createReview = asyncHandler(async (req, res) => {
  const Review = mongoose.model('Review');
  const { productId, orderId, rating, title, comment, images = [] } = req.body;

  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) throw ApiError.forbidden('You can only review products from your own orders');
  if (order.status !== 'DELIVERED') throw ApiError.badRequest('You can review this product after delivery');
  const line = order.items.find((i) => String(i.product) === String(productId));
  if (!line) throw ApiError.badRequest('This product is not part of the selected order');

  const exists = await Review.findOne({ product: productId, user: req.user._id, order: orderId });
  if (exists) throw ApiError.conflict('You have already reviewed this product for this order');

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    order: orderId,
    customerName: req.user.fullName,
    rating: Number(rating),
    title: title || '',
    comment,
    images,
    verifiedPurchase: order.payment.status === 'PAID',
    status: 'PENDING',
  });

  const ProductModel = Product;
  await ProductModel.updateOne({ _id: productId }, { $set: { 'items.0.reviewed': true } });
  return ok(res, review, 'Thanks! Your review will appear after moderation.');
});

export const myReviews = asyncHandler(async (req, res) => {
  const Review = mongoose.model('Review');
  const reviews = await Review.find({ user: req.user._id })
    .populate('product', 'name slug images')
    .sort({ createdAt: -1 })
    .lean();
  return ok(res, reviews);
});

export const deleteMyReview = asyncHandler(async (req, res) => {
  const Review = mongoose.model('Review');
  const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!review) throw ApiError.notFound('Review not found');
  await Review.recalcProductRating(review.product);
  return ok(res, null, 'Review deleted');
});

export const productReviews = asyncHandler(async (req, res) => {
  const Review = mongoose.model('Review');
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 6 });
  const filter = { product: req.params.productId, status: 'APPROVED' };
  if (req.query.rating) filter.rating = Number(req.query.rating);
  const [reviews, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Review.countDocuments(filter),
  ]);
  return ok(res, reviews, 'Reviews fetched', paginationMeta({ page, limit, total }));
});

/* ------------------------------ Size guidance ------------------------------ */

/**
 * GET /products/:productId/size-stats
 *
 * Real "what other shoppers chose" data for one product, aggregated from order
 * history. Deliberately reported *separately* from the size recommendation: the
 * recommendation comes from the customer's own measurements, this only adds
 * social context. Cancelled / refunded orders are excluded so the sample is a
 * genuine purchase signal.
 */
export const productSizeStats = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) throw ApiError.badRequest('Invalid product');

  const rows = await Order.aggregate([
    {
      $match: {
        status: { $nin: ['CANCELLED', 'RETURNED', 'REFUNDED'] },
        'items.product': new mongoose.Types.ObjectId(productId),
      },
    },
    { $unwind: '$items' },
    { $match: { 'items.product': new mongoose.Types.ObjectId(productId) } },
    { $match: { 'items.size': { $nin: [null, ''] } } },
    // One vote per order line, weighted by the quantity actually bought.
    { $group: { _id: '$items.size', count: { $sum: '$items.quantity' } } },
    { $sort: { count: -1 } },
  ]);

  const sizeCounts = {};
  let total = 0;
  for (const row of rows) {
    sizeCounts[row._id] = row.count;
    total += row.count;
  }

  const mostOrdered = rows[0]?._id || null;
  return ok(res, {
    sizeCounts,
    total,
    mostOrdered,
    share: mostOrdered && total ? Math.round((rows[0].count / total) * 100) : 0,
  });
});

/* ------------------------- Newsletter / stock alerts ------------------------- */

export const subscribe = asyncHandler(async (req, res) => {
  const Subscriber = mongoose.model('Subscriber');
  const { email, source = 'footer' } = req.body;
  await Subscriber.findOneAndUpdate(
    { email: String(email).toLowerCase() },
    { $set: { isActive: true, source } },
    { upsert: true, new: true }
  );
  return ok(res, null, 'You are on the list. Welcome to Vimuhet.');
});

export const backInStockAlert = asyncHandler(async (req, res) => {
  const StockAlert = mongoose.model('InventoryAlert');
  const { productId, variantId, email } = req.body;
  await StockAlert.findOneAndUpdate(
    { product: productId, variantId, email: String(email || req.user?.email).toLowerCase() },
    { $set: { notified: false }, $setOnInsert: { user: req.user?._id } },
    { upsert: true, new: true }
  );
  return ok(res, null, 'We will email you the moment it is back in stock.');
});

/* ------------------------------- Contact ------------------------------- */

export const contact = asyncHandler(async (req, res) => {
  const ContactMessage = mongoose.model('ContactMessage');
  const message = await ContactMessage.create(req.body);
  const { mails } = await import('../services/mail.service.js');
  mails.contactAck(message).catch(() => {});
  return ok(res, { id: message._id }, 'Message received. Our care team will reply within 24 hours.');
});
