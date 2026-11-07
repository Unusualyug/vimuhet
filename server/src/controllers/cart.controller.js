import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Wishlist from '../models/Wishlist.js';
import Coupon from '../models/Coupon.js';
import { asyncHandler, ok, round2 } from '../utils/index.js';
import ApiError from '../utils/ApiError.js';
import { calculateTotals, getSettings } from '../services/pricing.service.js';
import { storage } from '../services/storage.service.js';
import { trackEvent } from '../services/analytics.service.js';

const MAX_QTY = 10;

async function getOrCreateCart(identity) {
  const query = identity.user ? { user: identity.user } : { guestId: identity.guestId };
  if (!identity.user && !identity.guestId) throw ApiError.badRequest('A cart identity is required');
  let cart = await Cart.findOne(query);
  if (!cart) cart = await Cart.create(query);
  return cart;
}

const identityOf = (req) => ({ user: req.user?._id, guestId: req.headers['x-guest-id'] || req.body?.guestId });

/**
 * Fire-and-forget analytics from a controller. The analytics service enforces
 * cookie consent, so an event from a visitor who rejected optional cookies is
 * silently dropped rather than stored.
 */
function track(req, payload) {
  trackEvent(
    {
      sessionId: req.headers['x-session-id'] || req.headers['x-visitor-id'] || `srv-${identityOf(req).user || identityOf(req).guestId || 'anon'}`,
      visitorId: req.headers['x-visitor-id'] || req.headers['x-session-id'] || 'anon',
      user: req.user?._id,
      guestId: identityOf(req).guestId,
      ...payload,
    },
    req
  ).catch(() => {});
}

function cleanImage(url) {
  if (!url) return '';
  // Keep the stored URL as-is; clients request sized variants via Cloudinary transforms.
  return url;
}

/** Builds the cart response with live prices, stock and server-authoritative totals. */
export async function cartResponse(cart, user) {
  const settings = await getSettings();
  const productIds = cart.items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items = [];
  const warnings = [];
  let changed = false;

  for (const item of cart.items) {
    const product = byId.get(String(item.product));
    if (!product || product.status === 'ARCHIVED') {
      cart.items.pull(item._id);
      changed = true;
      warnings.push(`"${item.name}" is no longer available and was removed.`);
      continue;
    }
    const variant = product.variants.id(item.variantId);
    if (!variant) {
      cart.items.pull(item._id);
      changed = true;
      warnings.push(`"${item.name}" (${item.size}) is no longer offered and was removed.`);
      continue;
    }
    const available = Math.max(0, variant.stock - variant.reserved);
    let quantity = item.quantity;
    if (available < 1) {
      warnings.push(`"${product.name}" (${variant.size}) is out of stock.`);
    } else if (available < quantity) {
      quantity = available;
      warnings.push(`Only ${available} left of "${product.name}" (${variant.size}) — quantity adjusted.`);
    }
    if (quantity !== item.quantity) {
      item.quantity = quantity;
      changed = true;
    }

    const price = variant.price || product.price;
    const mrp = variant.mrp || product.mrp;
    const image = product.images.find((i) => i.color && i.color === variant.color)?.url || product.images[0]?.url || '';

    items.push({
      _id: item._id,
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        image: cleanImage(image),
        rating: product.rating,
        stock: available,
        status: product.status,
      },
      variantId: variant._id,
      size: variant.size,
      color: variant.color,
      sku: variant.sku,
      price,
      mrp,
      quantity: item.quantity,
      lineTotal: round2(price * item.quantity),
      lineMrp: round2(mrp * item.quantity),
      available,
      maxQuantity: Math.min(MAX_QTY, available),
    });
  }

  if (changed) await cart.save();

  let couponCode = cart.coupon?.code || '';
  let totals;
  try {
    totals = await calculateTotals({
      items: items.map((i) => ({ ...i, product: i.product._id })),
      coupon: couponCode || null,
      settings,
      user,
    });
  } catch (err) {
    // Stored coupon no longer valid — drop it rather than fail the cart page.
    cart.coupon = undefined;
    await cart.save();
    couponCode = '';
    warnings.push(err.message);
    totals = await calculateTotals({
      items: items.map((i) => ({ ...i, product: i.product._id })),
      coupon: null,
      settings,
      user,
    });
  }

  const count = items.reduce((s, i) => s + i.quantity, 0);

  return {
    cart: {
      _id: cart._id,
      items,
      count,
      coupon: totals.couponCode ? { code: totals.couponCode, discount: totals.couponDiscount } : null,
      pricing: totals,
      updatedAt: cart.updatedAt,
    },
    warnings,
  };
}

export const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(identityOf(req));
  const { cart: payload, warnings } = await cartResponse(cart, req.user);
  return ok(res, { ...payload, warnings });
});

export const addItem = asyncHandler(async (req, res) => {
  const { productId, variantId, quantity = 1 } = req.body;
  const identity = identityOf(req);
  if (!identity.user && !identity.guestId) throw ApiError.badRequest('A cart identity is required');

  const product = await Product.findOne({ _id: productId, status: { $in: ['ACTIVE', 'OUT_OF_STOCK'] } });
  if (!product) throw ApiError.notFound('Product unavailable');
  const variant = product.variants.id(variantId);
  if (!variant || !variant.isActive) throw ApiError.badRequest('Please select an available size and colour');

  const cart = await getOrCreateCart(identity);
  const existing = cart.items.find(
    (i) => String(i.product) === String(productId) && String(i.variantId) === String(variantId)
  );
  const desired = (existing?.quantity || 0) + Math.max(1, Number(quantity));
  const available = Math.max(0, variant.stock - variant.reserved);

  if (available < 1) throw ApiError.conflict('This size and colour is out of stock');
  if (desired > available) throw ApiError.conflict(`Only ${available} left in this size and colour`);
  if (desired > MAX_QTY) throw ApiError.badRequest(`You can add up to ${MAX_QTY} units per item`);

  const price = variant.price || product.price;
  const mrp = variant.mrp || product.mrp;
  const image = product.images.find((i) => i.color && i.color === variant.color)?.url || product.images[0]?.url || '';

  if (existing) {
    existing.quantity = desired;
    existing.price = price;
    existing.mrp = mrp;
  } else {
    cart.items.push({
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
      quantity: desired,
    });
  }
  await cart.save();

  trackEvent(
    {
      type: 'add_to_cart',
      sessionId: req.headers['x-session-id'] || `srv-${cart._id}`,
      visitorId: req.headers['x-visitor-id'] || `srv-${cart._id}`,
      user: req.user?._id,
      guestId: req.headers['x-guest-id'],
      path: `/product/${product.slug}`,
      product: product._id,
      value: price * desired,
    },
    req
  ).catch(() => {});

  const { cart: payload, warnings } = await cartResponse(cart, req.user);
  return ok(res, { ...payload, warnings }, `${product.name} added to your bag`);
});

export const updateItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const qty = Number(quantity);
  const cart = await getOrCreateCart(identityOf(req));
  const item = cart.items.id(req.params.itemId);
  if (!item) throw ApiError.notFound('Item not in bag');

  if (qty < 1) {
    cart.items.pull(item._id);
    await cart.save();
    const { cart: payload } = await cartResponse(cart, req.user);
    return ok(res, payload, 'Item removed from bag');
  }
  if (qty > MAX_QTY) throw ApiError.badRequest(`Maximum ${MAX_QTY} units per item`);

  const product = await Product.findById(item.product);
  const variant = product?.variants.id(item.variantId);
  const available = variant ? Math.max(0, variant.stock - variant.reserved) : 0;
  if (qty > available) throw ApiError.conflict(`Only ${available} left in this size and colour`);

  item.quantity = qty;
  await cart.save();
  const { cart: payload, warnings } = await cartResponse(cart, req.user);
  return ok(res, { ...payload, warnings }, 'Bag updated');
});

export const removeItem = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(identityOf(req));
  const removed = cart.items.id(req.params.itemId);
  cart.items.pull(req.params.itemId);
  await cart.save();
  if (removed) {
    track(req, {
      type: 'remove_from_cart',
      path: '/cart',
      product: removed.product,
      value: removed.price * removed.quantity,
    });
  }
  const { cart: payload } = await cartResponse(cart, req.user);
  return ok(res, payload, 'Item removed from bag');
});

export const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(identityOf(req));
  cart.items = [];
  cart.coupon = undefined;
  await cart.save();
  const { cart: payload } = await cartResponse(cart, req.user);
  return ok(res, payload, 'Bag cleared');
});

export const applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const cart = await getOrCreateCart(identityOf(req));
  if (!cart.items.length) throw ApiError.badRequest('Your bag is empty');

  const { cart: payload } = await cartResponse(cart, req.user);
  const eligibleItems = payload.items.map((i) => ({
    product: i.product._id,
    price: i.price,
    quantity: i.quantity,
  }));

  const totals = await calculateTotals({ items: eligibleItems, coupon: code, user: req.user });

  cart.coupon = {
    code: totals.couponCode,
    couponId: totals.couponId,
    discount: totals.couponDiscount,
    type: (await Coupon.findOne({ code: totals.couponCode }))?.type || 'PERCENTAGE',
    freeShipping: totals.freeShipping,
  };
  await cart.save();

  const { cart: updated } = await cartResponse(cart, req.user);
  return ok(res, updated, `Coupon ${totals.couponCode} applied`);
});

export const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(identityOf(req));
  cart.coupon = undefined;
  await cart.save();
  const { cart: payload } = await cartResponse(cart, req.user);
  return ok(res, payload, 'Coupon removed');
});

/** Move a cart line into the wishlist. */
export const moveToWishlist = asyncHandler(async (req, res) => {
  const identity = identityOf(req);
  const cart = await getOrCreateCart(identity);
  const item = cart.items.id(req.params.itemId);
  if (!item) throw ApiError.notFound('Item not in bag');

  let wishlist = await Wishlist.findOne(identity.user ? { user: identity.user } : { guestId: identity.guestId });
  if (!wishlist) wishlist = await Wishlist.create(identity.user ? { user: identity.user } : { guestId: identity.guestId });
  if (!wishlist.products.some((p) => String(p.product) === String(item.product))) {
    wishlist.products.push({ product: item.product });
    await wishlist.save();
  }
  cart.items.pull(item._id);
  await cart.save();

  const { cart: payload } = await cartResponse(cart, req.user);
  return ok(res, payload, 'Moved to wishlist');
});

/* ------------------------------- Wishlist ------------------------------- */

async function wishlistFor(req, create = false) {
  const identity = identityOf(req);
  if (!identity.user && !identity.guestId) {
    if (create) throw ApiError.badRequest('A wishlist identity is required');
    return null;
  }
  const query = identity.user ? { user: identity.user } : { guestId: identity.guestId };
  let list = await Wishlist.findOne(query);
  if (!list && create) list = await Wishlist.create(query);
  return list;
}

export const getWishlist = asyncHandler(async (req, res) => {
  const list = await wishlistFor(req);
  if (!list) return ok(res, { items: [], count: 0 });
  const products = await Product.find({ _id: { $in: list.products.map((p) => p.product) } })
    .select('name slug price mrp images rating reviewCount stock variants colors status')
    .lean();
  const items = products.map((p) => ({
    ...p,
    inStock: p.stock > 0,
    addedAt: list.products.find((x) => String(x.product) === String(p._id))?.addedAt,
  }));
  return ok(res, { items, count: items.length });
});

export const toggleWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const product = await Product.findById(productId).select('name');
  if (!product) throw ApiError.notFound('Product not found');

  const list = await wishlistFor(req, true);
  const idx = list.products.findIndex((p) => String(p.product) === String(productId));
  let action;
  if (idx >= 0) {
    list.products.splice(idx, 1);
    action = 'removed';
  } else {
    list.products.push({ product: productId });
    action = 'added';
  }
  await list.save();
  track(req, {
    type: action === 'added' ? 'wishlist_add' : 'wishlist_remove',
    path: '/wishlist',
    product: productId,
  });
  return ok(res, { action, count: list.products.length, productId }, action === 'added' ? 'Saved to wishlist' : 'Removed from wishlist');
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  const list = await wishlistFor(req);
  if (list) {
    list.products = list.products.filter((p) => String(p.product) !== String(req.params.productId));
    await list.save();
  }
  return ok(res, { count: list?.products.length || 0 }, 'Removed from wishlist');
});

export const wishlistToCart = asyncHandler(async (req, res) => {
  const { productId, variantId, quantity = 1 } = req.body;
  req.body = { productId, variantId, quantity };
  return addItem(req, res);
});

export const publicCoupons = asyncHandler(async (_req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({ isActive: true, startDate: { $lte: now }, expiryDate: { $gte: now } })
    .select('code description type value minOrderValue maxDiscount expiryDate freeShipping')
    .limit(6)
    .lean();
  return ok(res, coupons);
});

export const cartService = { cartResponse };
export default { getCart, addItem, updateItem, removeItem, clearCart, applyCoupon, removeCoupon, moveToWishlist };
