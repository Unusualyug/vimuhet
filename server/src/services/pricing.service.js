import Coupon from '../models/Coupon.js';
import Setting from '../models/Setting.js';
import ApiError from '../utils/ApiError.js';
import { round2 } from '../utils/http.js';

export async function getSettings() {
  let settings = await Setting.findOne({ key: 'store' });
  if (!settings) settings = await Setting.create({ key: 'store' });
  return settings;
}

/**
 * Server-authoritative cart/checkout pricing.
 * Never trust client-supplied totals.
 */
export async function calculateTotals({ items = [], coupon = null, settings, user = null, countCouponUsage = false }) {
  const store = settings || (await getSettings());

  const mrpTotal = round2(items.reduce((s, i) => s + (i.mrp || i.price) * i.quantity, 0));
  const subtotal = round2(items.reduce((s, i) => s + i.price * i.quantity, 0));
  const productDiscount = round2(mrpTotal - subtotal);

  let couponDiscount = 0;
  let freeShipping = false;
  let appliedCoupon = null;

  if (coupon) {
    const result = await validateCoupon({
      code: typeof coupon === 'string' ? coupon : coupon.code,
      items,
      subtotal,
      user,
      countUsage: countCouponUsage,
      settings: store,
    });
    couponDiscount = result.discount;
    freeShipping = result.freeShipping;
    appliedCoupon = result.coupon;
  }

  const taxable = Math.max(0, subtotal - couponDiscount);
  const shipping =
    freeShipping || taxable === 0 || taxable >= store.shipping.freeShippingThreshold
      ? 0
      : store.shipping.shippingCharge;

  // Prices are inclusive of GST in Indian retail; show the tax component for transparency.
  const taxRate = 0.05;
  const tax = round2(taxable - taxable / (1 + taxRate));
  const total = round2(taxable + shipping);

  return {
    mrpTotal,
    subtotal,
    productDiscount,
    couponCode: appliedCoupon?.code || '',
    couponId: appliedCoupon?._id,
    couponDiscount,
    freeShipping,
    shipping,
    tax,
    total,
    currency: 'INR',
    freeShippingThreshold: store.shipping.freeShippingThreshold,
    amountToFreeShipping: Math.max(0, round2(store.shipping.freeShippingThreshold - taxable)),
  };
}

export async function validateCoupon({ code, items, subtotal, user, countUsage = false, settings }) {
  if (!code) throw ApiError.badRequest('Please enter a coupon code');
  const coupon = await Coupon.findOne({ code: String(code).toUpperCase().trim() });
  if (!coupon) throw ApiError.badRequest('This coupon code is not valid');
  if (!coupon.isLive()) throw ApiError.badRequest('This coupon has expired or is no longer available');

  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
    throw ApiError.badRequest(`This coupon needs a minimum order of ₹${coupon.minOrderValue.toLocaleString('en-IN')}`);
  }

  const productIds = new Set(items.map((i) => String(i.product?._id || i.product)));
  if (coupon.products?.length) {
    const allowed = coupon.products.map(String);
    if (![...productIds].some((id) => allowed.includes(id))) {
      throw ApiError.badRequest('This coupon is not applicable to the items in your bag');
    }
  }

  if (user) {
    if (coupon.firstOrderOnly && user.stats?.orders > 0) {
      throw ApiError.badRequest('This coupon is valid on your first order only');
    }
    const usage = coupon.usedBy?.find((u) => String(u.user) === String(user._id));
    const perCustomer = coupon.usageLimitPerCustomer || 1;
    if (usage && usage.count >= perCustomer) {
      throw ApiError.badRequest('You have already used this coupon');
    }
  }

  // Eligible amount (restricted coupons apply only to matching products)
  let eligible = subtotal;
  if (coupon.products?.length) {
    const allowed = coupon.products.map(String);
    eligible = items
      .filter((i) => allowed.includes(String(i.product?._id || i.product)))
      .reduce((s, i) => s + i.price * i.quantity, 0);
  }

  let discount =
    coupon.type === 'PERCENTAGE' ? (eligible * coupon.value) / 100 : Math.min(coupon.value, eligible);
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = round2(Math.min(discount, subtotal));

  return {
    coupon,
    discount,
    freeShipping: Boolean(coupon.freeShipping),
    settings,
    countUsage,
  };
}

export async function consumeCoupon(couponId, userId) {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) return;
  coupon.usedCount += 1;
  if (userId) {
    const existing = coupon.usedBy.find((u) => String(u.user) === String(userId));
    if (existing) existing.count += 1;
    else coupon.usedBy.push({ user: userId, count: 1 });
  }
  await coupon.save();
}

export async function releaseCoupon(couponId, userId) {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) return;
  coupon.usedCount = Math.max(0, coupon.usedCount - 1);
  if (userId) {
    const existing = coupon.usedBy.find((u) => String(u.user) === String(userId));
    if (existing) existing.count = Math.max(0, existing.count - 1);
  }
  await coupon.save();
}
