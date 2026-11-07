import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import Coupon from '../models/Coupon.js';
import User from '../models/User.js';
import StockAlert from '../models/InventoryAlert.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { orderNumber, round2 } from '../utils/index.js';
import { calculateTotals, consumeCoupon, getSettings, releaseCoupon } from './pricing.service.js';
import { commitStock, releaseStock, reserveStock } from './inventory.service.js';
import { razorpay } from './razorpay.service.js';
import { mails } from './mail.service.js';
import { notifyAdmin, notifyCustomer } from './notification.service.js';
import { trackEvent } from './analytics.service.js';

const MAX_QTY = 10;

/** Validates cart lines against live product data — never trusts stored prices alone. */
export async function buildOrderItems(rawItems) {
  if (!rawItems?.length) throw ApiError.badRequest('Your bag is empty');

  const items = [];
  for (const raw of rawItems) {
    const product = await Product.findOne({ _id: raw.product, status: { $in: ['ACTIVE', 'OUT_OF_STOCK'] } });
    if (!product) throw ApiError.badRequest('One of the products in your bag is no longer available');

    const variant = product.variants.id(raw.variantId);
    if (!variant || !variant.isActive) throw ApiError.conflict(`Selected size/colour for "${product.name}" is unavailable`);

    const qty = Math.min(MAX_QTY, Math.max(1, Number(raw.quantity) || 1));
    const available = Math.max(0, variant.stock - variant.reserved);
    if (available < qty) {
      throw ApiError.conflict(`Only ${available} left of "${product.name}" (${variant.size}/${variant.color})`);
    }

    const price = variant.price || product.price;
    const mrp = variant.mrp || product.mrp;
    const image = product.images.find((i) => i.color === variant.color)?.url || product.images[0]?.url || '';

    items.push({
      product: product._id,
      variantId: variant._id,
      name: product.name,
      slug: product.slug,
      sku: variant.sku,
      image,
      size: variant.size,
      color: variant.color,
      price,
      mrp,
      quantity: qty,
      total: round2(price * qty),
    });
  }
  return items;
}

export async function createOrderFromCart({ user, guestId, items: rawItems, shippingAddress, customer, couponCode }) {
  const items = await buildOrderItems(rawItems);

  if (!shippingAddress?.pincode || !shippingAddress?.fullName) {
    throw ApiError.badRequest('A complete delivery address is required');
  }

  const settings = await getSettings();
  const totals = await calculateTotals({ items, coupon: couponCode || null, settings, user });

  const order = await Order.create({
    orderNumber: orderNumber(),
    user: user?._id,
    guestEmail: user ? undefined : customer?.email,
    customer: {
      fullName: customer?.fullName || shippingAddress.fullName || user?.fullName,
      email: (customer?.email || user?.email || '').toLowerCase(),
      mobile: customer?.mobile || shippingAddress.mobile || user?.mobile,
    },
    shippingAddress,
    items,
    pricing: {
      subtotal: totals.subtotal,
      mrpTotal: totals.mrpTotal,
      productDiscount: totals.productDiscount,
      couponCode: totals.couponCode,
      couponDiscount: totals.couponDiscount,
      shipping: totals.shipping,
      tax: totals.tax,
      total: totals.total,
      currency: 'INR',
    },
    payment: { status: 'CREATED', provider: 'razorpay' },
    status: 'PENDING',
    statusHistory: [{ status: 'PENDING', note: 'Order created, awaiting payment', by: 'customer' }],
    shipping: { estimatedDelivery: new Date(Date.now() + settings.shipping.estimatedDeliveryDays * 86400000) },
  });

  // Reserve inventory so concurrent shoppers cannot oversell.
  await reserveStock(items, order._id);

  // Create the gateway order.
  let rzOrder;
  try {
    rzOrder = await razorpay.createOrder({
      amountInPaise: Math.round(totals.total * 100),
      receipt: order.orderNumber,
      notes: { orderNumber: order.orderNumber, orderId: String(order._id) },
    });
  } catch (err) {
    await releaseStock(items, order._id, 'Payment gateway initialization failed');
    order.status = 'CANCELLED';
    order.payment.status = 'FAILED';
    order.payment.failureReason = err.message;
    await order.save();
    throw err;
  }

  order.payment.razorpayOrderId = rzOrder.id;
  order.payment.status = 'PENDING';
  order.payment.method = undefined;
  order.payment.idempotencyKey = `${order._id}:${rzOrder.id}`;
  await order.save();

  await Payment.create({
    user: user?._id,
    order: order._id,
    orderNumber: order.orderNumber,
    razorpayOrderId: rzOrder.id,
    amount: totals.total,
    status: 'PENDING',
    source: 'checkout',
    notes: { mode: rzOrder.mode, couponCode: totals.couponCode },
  });

  if (user) await Cart.updateOne({ user: user._id }, { $set: { 'coupon.discount': 0 } });

  return {
    order,
    gateway: {
      mode: rzOrder.mode,
      keyId: rzOrder.mode === 'live' ? razorpay.keyId : null,
      razorpayOrderId: rzOrder.id,
      amount: rzOrder.amount,
      currency: rzOrder.currency,
      prefill: {
        name: order.customer.fullName,
        email: order.customer.email,
        contact: order.customer.mobile,
      },
    },
  };
}

/** Signature-verified confirmation. Idempotent: repeat calls are safe. */
export async function verifyAndConfirmPayment({ orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, method = 'UPI', req }) {
  razorpay.verifySignature({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature: razorpaySignature });

  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.payment.razorpayOrderId !== razorpayOrderId) {
    throw ApiError.badRequest('Payment does not belong to this order');
  }

  // Duplicate-payment prevention
  if (order.payment.status === 'PAID' && order.payment.razorpayPaymentId === razorpayPaymentId) {
    return { order, alreadyProcessed: true };
  }
  if (order.payment.status === 'PAID' && order.payment.razorpayPaymentId !== razorpayPaymentId) {
    throw ApiError.conflict('This order has already been paid. Duplicate payment flagged for review.');
  }
  if (['CANCELLED', 'REFUNDED'].includes(order.status)) {
    throw ApiError.conflict('This order can no longer accept payments');
  }

  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId, status: { $ne: 'PAID' } },
    {
      $set: {
        razorpayPaymentId,
        razorpaySignature,
        status: 'PAID',
        method,
        signatureVerified: true,
        paidAt: new Date(),
      },
    },
    { new: true }
  );

  if (!payment) {
    const existing = await Payment.findOne({ razorpayOrderId });
    if (existing?.status === 'PAID') return { order, alreadyProcessed: true };
    throw ApiError.conflict('Payment could not be recorded. Please contact support.');
  }

  order.payment.status = 'PAID';
  order.payment.razorpayPaymentId = razorpayPaymentId;
  order.payment.razorpaySignature = razorpaySignature;
  order.payment.method = method;
  order.payment.paidAt = new Date();
  order.payment.verifiedAt = new Date();
  order.status = 'CONFIRMED';
  order.statusHistory.push({ status: 'CONFIRMED', note: 'Payment verified', by: 'system' });
  order.stockCommitted = true;
  await order.save();

  // Permanent stock deduction (reservation consumed exactly once).
  await commitStock(order.items, order._id);

  // Coupon usage + cart cleanup + customer stats
  if (order.pricing.couponCode) {
    const coupon = await Coupon.findOne({ code: order.pricing.couponCode });
    if (coupon) await consumeCoupon(coupon._id, order.user);
  }
  if (order.user) {
    await Cart.deleteOne({ user: order.user });
    await User.updateOne(
      { _id: order.user },
      { $inc: { 'stats.orders': 1, 'stats.spent': order.pricing.total } }
    );
  }

  // Fire-and-forget side effects
  mails.orderPlaced(order).catch(() => {});
  notifyAdmin({
    type: 'ORDER_PAID',
    title: `New order ${order.orderNumber}`,
    message: `₹${order.pricing.total.toLocaleString('en-IN')} paid by ${order.customer.fullName}`,
    link: `/admin/orders/${order._id}`,
    meta: { orderId: order._id },
  });
  notifyCustomer(order.user, {
    type: 'ORDER_CONFIRMED',
    title: `Order ${order.orderNumber} confirmed`,
    message: 'We are preparing your order with care.',
    link: `/account/orders/${order._id}`,
  });
  trackEvent(
    {
      type: 'purchase',
      /* Attribute to the visitor's real session when we have one; the payment id
         is only a fallback so a purchase is never lost. Using the payment id
         unconditionally fragmented the funnel into a separate phantom session. */
      sessionId: req?.headers?.['x-session-id'] || razorpayPaymentId,
      visitorId: req?.headers?.['x-visitor-id'] || razorpayPaymentId,
      user: order.user,
      path: '/checkout/success',
      value: order.pricing.total,
      guestId: req?.headers?.['x-guest-id'],
      meta: { orderNumber: order.orderNumber },
    },
    /* Pass the real request so the consent gate can evaluate it. Without it no
       consent is present and the purchase event is (correctly) not recorded. */
    req || { headers: {} }
  ).catch(() => {});

  return { order, payment, alreadyProcessed: false };
}

export async function markPaymentFailed({ orderId, reason = 'Payment failed or cancelled' }) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.payment.status === 'PAID') return order; // never downgrade a paid order

  order.payment.status = 'FAILED';
  order.payment.failureReason = reason;
  await order.save();

  await Payment.updateMany(
    { razorpayOrderId: order.payment.razorpayOrderId, status: { $ne: 'PAID' } },
    { $set: { status: 'FAILED', failureReason: reason } }
  );

  await releaseStock(order.items, order._id, 'Payment failed — reservation released');
  if (order.pricing.couponCode) {
    const coupon = await Coupon.findOne({ code: order.pricing.couponCode });
    if (coupon) await releaseCoupon(coupon._id, order.user);
  }
  logger.info(`Payment failed for ${order.orderNumber}: ${reason}`);
  return order;
}

/** Re-attempt payment for an existing unpaid order (stock re-reserved). */
export async function retryPayment(orderId, userId) {
  if (!userId) throw ApiError.unauthorized('Please log in or create an account to continue with your order.');
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (String(order.user) !== String(userId)) throw ApiError.forbidden('This order belongs to another account');
  if (order.payment.status === 'PAID') throw ApiError.conflict('This order is already paid');

  const items = await buildOrderItems(
    order.items.map((i) => ({ product: i.product, variantId: i.variantId, quantity: i.quantity }))
  );
  await reserveStock(items, order._id);

  const rzOrder = await razorpay.createOrder({
    amountInPaise: Math.round(order.pricing.total * 100),
    receipt: `${order.orderNumber}-R${Date.now().toString().slice(-4)}`,
    notes: { orderNumber: order.orderNumber, retry: 'true' },
  });

  order.payment.razorpayOrderId = rzOrder.id;
  order.payment.status = 'PENDING';
  order.payment.failureReason = undefined;
  order.status = 'PENDING';
  await order.save();

  await Payment.create({
    user: order.user,
    order: order._id,
    orderNumber: order.orderNumber,
    razorpayOrderId: rzOrder.id,
    amount: order.pricing.total,
    status: 'PENDING',
    source: 'checkout',
    notes: { mode: rzOrder.mode, retry: true },
  });

  return {
    order,
    gateway: {
      mode: rzOrder.mode,
      keyId: rzOrder.mode === 'live' ? razorpay.keyId : null,
      razorpayOrderId: rzOrder.id,
      amount: rzOrder.amount,
      currency: rzOrder.currency,
      prefill: { name: order.customer.fullName, email: order.customer.email, contact: order.customer.mobile },
    },
  };
}

/** Admin refund with gateway call + audit trail. Prevents duplicate refunds. */
export async function refundOrder({ order, amount, reason, adminId }) {
  if (order.payment.status !== 'PAID' && order.payment.status !== 'PARTIALLY_REFUNDED') {
    throw ApiError.badRequest('Only paid orders can be refunded');
  }
  const payment = await Payment.findOne({ razorpayOrderId: order.payment.razorpayOrderId });
  if (!payment) throw ApiError.notFound('Payment record not found');
  if (!payment.razorpayPaymentId) throw ApiError.badRequest('No gateway payment reference available');

  const refundable = round2(payment.amount - (payment.refundedAmount || 0));
  const value = round2(Number(amount) || refundable);
  if (value <= 0 || value > refundable) throw ApiError.badRequest(`Refund must be between ₹1 and ₹${refundable}`);

  const result = await razorpay.refundPayment(payment.razorpayPaymentId, Math.round(value * 100), { reason });

  payment.refunds.push({ amount: value, refundId: result.id, reason, status: 'PROCESSED', by: adminId });
  payment.refundedAmount = round2((payment.refundedAmount || 0) + value);
  payment.status = payment.refundedAmount >= payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
  await payment.save();

  order.payment.status = payment.status;
  order.status = payment.status === 'REFUNDED' ? 'REFUNDED' : order.status;
  order.statusHistory.push({ status: order.status, note: `Refund of ₹${value} processed`, by: 'admin' });
  await order.save();

  notifyCustomer(order.user, {
    type: 'REFUND',
    title: `Refund processed for ${order.orderNumber}`,
    message: `₹${value.toLocaleString('en-IN')} will reflect in your account within 5-7 business days.`,
    link: `/account/orders/${order._id}`,
  });

  return { payment, order, refund: result, amount: value };
}

export async function advanceOrderStatus({ order, status, note = '', by = 'admin', tracking = {} }) {
  const { ORDER_TRANSITIONS } = await import('../config/constants.js');
  const allowed = ORDER_TRANSITIONS[order.status] || [];
  if (status !== order.status && !allowed.includes(status)) {
    throw ApiError.badRequest(`Cannot move order from ${order.status} to ${status}`);
  }
  order.status = status;
  order.statusHistory.push({ status, note, by, at: new Date() });
  if (tracking.courier) order.shipping.courier = tracking.courier;
  if (tracking.trackingNumber) order.shipping.trackingNumber = tracking.trackingNumber;
  if (tracking.trackingUrl) order.shipping.trackingUrl = tracking.trackingUrl;
  if (status === 'SHIPPED') order.shipping.shippedAt = new Date();
  if (status === 'DELIVERED') order.shipping.deliveredAt = new Date();
  await order.save();

  if (status === 'CANCELLED' && order.stockCommitted) {
    // Return stock to inventory for cancelled paid orders
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product, 'variants._id': item.variantId },
        { $inc: { stock: item.quantity, soldCount: -item.quantity, 'variants.$[v].stock': item.quantity } },
        { arrayFilters: [{ 'v._id': item.variantId }] }
      );
    }
    order.stockCommitted = false;
    await order.save();
  } else if (status === 'CANCELLED') {
    /* Unpaid order — the units were only RESERVED at checkout, never committed.
       Cancelling has to hand that reservation back, otherwise those units stay
       invisible to customers forever: variant.stock never moves, but
       available = stock - reserved keeps shrinking. releaseStock subtracts
       idempotently and clamps at zero, so a repeated cancel is harmless. */
    await releaseStock(order.items, order._id, 'Order cancelled — reservation released');
  }

  if (['SHIPPED', 'DELIVERED', 'CANCELLED', 'OUT_FOR_DELIVERY'].includes(status)) {
    mails.orderStatus(order, status).catch(() => {});
    notifyCustomer(order.user, {
      type: 'ORDER_STATUS',
      title: `Order ${order.orderNumber} — ${status.replaceAll('_', ' ').toLowerCase()}`,
      message: note || 'Your order status has been updated.',
      link: `/account/orders/${order._id}`,
    });
  }

  if (status === 'DELIVERED') {
    await Product.updateMany(
      { _id: { $in: order.items.map((i) => i.product) } },
      { $inc: { soldCount: 0 } }
    );
    // Notify back-in-stock subscribers
    const alerts = await StockAlert.find({ variantId: { $in: order.items.map((i) => i.variantId) }, notified: false });
    for (const alert of alerts) {
      const product = await Product.findById(alert.product);
      if (product) await mails.backInStock(alert.email, product).catch(() => {});
      alert.notified = true;
      await alert.save();
    }
  }

  return order;
}

export const orderService = {
  createOrderFromCart,
  verifyAndConfirmPayment,
  markPaymentFailed,
  retryPayment,
  refundOrder,
  advanceOrderStatus,
  buildOrderItems,
};

export default orderService;
