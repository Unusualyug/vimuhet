import crypto from 'node:crypto';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import RefreshToken from '../models/RefreshToken.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler, created, ok, randomToken, round2 } from '../utils/index.js';
import {
  refreshCookieName,
  refreshCookieOptions,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';
import { mails } from '../services/mail.service.js';
import { notifyAdmin, notifyCustomer } from '../services/notification.service.js';
import logger from '../utils/logger.js';

const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

const customerPayload = (user) => ({
  sub: user._id,
  typ: 'customer',
  role: 'customer',
  email: user.email,
});

const adminPayload = (admin) => ({
  sub: admin._id,
  typ: 'admin',
  role: admin.role,
  email: admin.email,
});

async function issueTokens({ subject, subjectType, payload, req, res, remember = true }) {
  const accessToken = signAccessToken(payload);
  const family = randomToken();
  const refreshToken = signRefreshToken({ ...payload, fam: family, jti: randomToken() });

  await RefreshToken.create({
    tokenHash: hashToken(refreshToken),
    subject,
    subjectType,
    family,
    expiresAt: new Date(Date.now() + (remember ? 30 : 1) * 86400000),
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  res.cookie(refreshCookieName, refreshToken, refreshCookieOptions(remember));
  return { accessToken, refreshToken };
}

/**
 * The guest id arrives as the `x-guest-id` header on every API call (see
 * client/src/services/api.js). Auth calls additionally carry it in the body, so
 * accept either — missing the header here silently dropped the guest bag.
 */
const guestIdOf = (req) => req.body?.guestId || req.headers['x-guest-id'] || null;

/**
 * Rotate the guest session onto the authenticated account.
 *
 * The guest keeps their existing session handle (so nothing in the bag, wishlist
 * or recently-viewed list is lost), but the session row is re-pointed at the
 * user and a new sign-in session id is issued — this is what prevents session
 * fixation: the identifier the guest had before authenticating is not the
 * identifier their authenticated requests use.
 */
async function adoptGuestSession({ req, user, guestId }) {
  const sessionId = req.headers['x-session-id'] || req.body?.sessionId;
  const visitorId = req.headers['x-visitor-id'] || req.body?.visitorId;
  if (!sessionId && !guestId) return null;

  const rotatedSessionId = `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  try {
    const VisitorSession = (await import('../models/VisitorSession.js')).default;
    if (sessionId) {
      await VisitorSession.updateOne(
        { sessionId },
        { $set: { user: user._id, guestId, endedAt: new Date() } }
      );
    }
    /* Carry the visitor's consent across the rotation, otherwise the new
       authenticated session would look like it had never consented and would be
       under-counted in the admin consent stats. */
    const { consentFromRequest } = await import('../services/consent.service.js');
    const consent = consentFromRequest(req);
    await VisitorSession.create({
      sessionId: rotatedSessionId,
      visitorId: visitorId || sessionId || rotatedSessionId,
      guestId,
      user: user._id,
      currentPath: '/',
      startedAt: new Date(),
      lastSeenAt: new Date(),
      isReturning: true,
      consent: {
        analytics: Boolean(consent.analytics),
        marketing: Boolean(consent.marketing),
        functional: Boolean(consent.functional),
        version: consent.version || 1,
        decidedAt: new Date(),
      },
    });

    /* Recently viewed follows the visitor into the account (functional feature). */
    const { mergeRecentViews } = await import('../services/analytics.service.js');
    await mergeRecentViews({ fromGuestId: guestId, toUser: user._id });
  } catch {
    /* Session bookkeeping must never block a successful sign-in. */
  }
  return rotatedSessionId;
}

/** Merge guest cart/wishlist into the signed-in account. */
async function mergeGuestData(user, guestId) {
  if (!guestId) return;
  const guestCart = await Cart.findOne({ guestId });
  if (guestCart?.items?.length) {
    let cart = await Cart.findOne({ user: user._id });
    if (!cart) {
      guestCart.user = user._id;
      guestCart.guestId = undefined;
      await guestCart.save();
    } else {
      for (const item of guestCart.items) {
        const existing = cart.items.find(
          (i) => String(i.product) === String(item.product) && String(i.variantId) === String(item.variantId)
        );
        if (existing) existing.quantity = Math.min(10, existing.quantity + item.quantity);
        else cart.items.push(item);
      }
      cart.coupon = guestCart.coupon?.code ? guestCart.coupon : cart.coupon;
      await cart.save();
      await Cart.deleteOne({ _id: guestCart._id });
    }
  }

  const guestWishlist = await Wishlist.findOne({ guestId });
  if (guestWishlist?.products?.length) {
    let wishlist = await Wishlist.findOne({ user: user._id });
    if (!wishlist) {
      guestWishlist.user = user._id;
      guestWishlist.guestId = undefined;
      await wishlistSave(guestWishlist);
      wishlist = guestWishlist;
    } else {
      const ids = new Set(wishlist.products.map((p) => String(p.product)));
      guestWishlist.products.forEach((p) => {
        if (!ids.has(String(p.product))) wishlist.products.push(p);
      });
      await wishlist.save();
      await Wishlist.deleteOne({ _id: guestWishlist._id });
    }
    await User.updateOne({ _id: user._id }, { wishlistMigratedAt: new Date() });
  }
}

async function wishlistSave(doc) {
  try {
    await doc.save();
  } catch (err) {
    logger.warn('Wishlist merge failed:', err.message);
  }
}

export const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, mobile = '', marketingOptIn = true } = req.body;

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw ApiError.conflict('An account with this email already exists. Please sign in.');

  const user = await User.create({
    fullName,
    email: email.toLowerCase(),
    mobile,
    password,
    marketingOptIn,
    emailVerifyToken: randomToken(),
    emailVerifyExpires: Date.now() + 24 * 3600 * 1000,
  });

  await mails.welcome(user).catch(() => {});
  await notifyAdmin({
    type: 'NEW_CUSTOMER',
    title: 'New customer registered',
    message: `${user.fullName} (${user.email}) just created an account.`,
    link: `/admin/customers/${user._id}`,
  });

  await mergeGuestData(user, guestIdOf(req));
  await adoptGuestSession({ req, user, guestId: guestIdOf(req) });
  const tokens = await issueTokens({
    subject: user._id,
    subjectType: 'User',
    payload: customerPayload(user),
    req,
    res,
  });

  /* Registration event — gated by analytics consent inside the service. */
  const { trackEvent } = await import('../services/analytics.service.js');
  trackEvent(
    {
      type: 'register',
      sessionId: req.headers['x-session-id'] || `reg-${user._id}`,
      visitorId: req.headers['x-visitor-id'] || `reg-${user._id}`,
      user: user._id,
      guestId: guestIdOf(req),
      path: '/register',
    },
    req
  ).catch(() => {});

  const safe = await User.findById(user._id);
  return created(res, { user: safe, ...tokens }, 'Account created successfully');
});

export const login = asyncHandler(async (req, res) => {
  const { email, password, remember = true } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }
  if (user.isBlocked) throw ApiError.forbidden('Your account has been blocked. Please contact support.');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  await mergeGuestData(user, guestIdOf(req));
  await adoptGuestSession({ req, user, guestId: guestIdOf(req) });
  const tokens = await issueTokens({
    subject: user._id,
    subjectType: 'User',
    payload: customerPayload(user),
    req,
    res,
    remember,
  });

  const safe = await User.findById(user._id);
  return ok(res, { user: safe, ...tokens }, 'Welcome back');
});

export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password, remember = true } = req.body;
  const admin = await Admin.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!admin || !(await admin.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }
  if (!admin.isActive) throw ApiError.forbidden('This admin account is disabled');

  admin.lastLoginAt = new Date();
  admin.loginHistory.push({ ip: req.ip, userAgent: req.headers['user-agent'], success: true });
  admin.loginHistory = admin.loginHistory.slice(-20);
  await admin.save({ validateBeforeSave: false });

  const tokens = await issueTokens({
    subject: admin._id,
    subjectType: 'Admin',
    payload: adminPayload(admin),
    req,
    res,
    remember,
  });

  return ok(res, { admin: admin.toObject({ versionKey: false }), ...tokens }, 'Admin signed in');
});

/** Refresh token rotation with reuse detection. */
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[refreshCookieName] || req.body?.refreshToken;
  if (!token) throw ApiError.unauthorized('No refresh token provided');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    res.clearCookie(refreshCookieName, { path: '/api/auth' });
    throw ApiError.unauthorized('Session expired. Please sign in again.');
  }

  const stored = await RefreshToken.findOne({ tokenHash: hashToken(token) });
  if (!stored || stored.revokedAt) {
    // Possible token reuse — revoke the whole family.
    if (stored?.family) await RefreshToken.updateMany({ family: stored.family }, { revokedAt: new Date() });
    res.clearCookie(refreshCookieName, { path: '/api/auth' });
    throw ApiError.unauthorized('Session is no longer valid. Please sign in again.');
  }
  if (stored.expiresAt < new Date()) throw ApiError.unauthorized('Session expired. Please sign in again.');

  const Model = payload.typ === 'admin' ? Admin : User;
  const subject = await Model.findById(payload.sub);
  if (!subject) throw ApiError.unauthorized('Account no longer exists');
  if (payload.typ === 'admin' && !subject.isActive) throw ApiError.forbidden('This admin account is disabled');
  if (payload.typ === 'customer' && subject.isBlocked) throw ApiError.forbidden('Your account has been blocked');

  stored.revokedAt = new Date();
  await stored.save();

  const tokens = await issueTokens({
    subject: subject._id,
    subjectType: payload.typ === 'admin' ? 'Admin' : 'User',
    payload: payload.typ === 'admin' ? adminPayload(subject) : customerPayload(subject),
    req,
    res,
  });

  return ok(
    res,
    {
      ...tokens,
      ...(payload.typ === 'admin' ? { admin: subject } : { user: subject }),
    },
    'Session refreshed'
  );
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[refreshCookieName];
  if (token) {
    await RefreshToken.updateOne({ tokenHash: hashToken(token) }, { revokedAt: new Date() });
  }
  res.clearCookie(refreshCookieName, { path: '/api/auth' });
  return ok(res, null, 'Signed out');
});

export const me = asyncHandler(async (req, res) => ok(res, { user: req.user }));

export const adminMe = asyncHandler(async (req, res) =>
  ok(res, { admin: req.admin, permissions: req.admin.permissions })
);

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const raw = randomToken();
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (user) {
    user.resetPasswordToken = crypto.createHash('sha256').update(raw).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    await mails.resetPassword(user.email, raw).catch(() => {});
  }
  // Same response either way — do not leak account existence.
  return ok(res, null, 'If an account exists for this email, a reset link has been sent.');
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+password');

  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired');
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  await RefreshToken.updateMany({ subject: user._id }, { revokedAt: new Date() });

  return ok(res, null, 'Password updated. Please sign in with your new password.');
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) throw ApiError.badRequest('Your current password is incorrect');
  user.password = newPassword;
  await user.save();
  await RefreshToken.updateMany({ subject: user._id, revokedAt: null }, { revokedAt: new Date() });
  return ok(res, null, 'Password changed successfully');
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await User.findOne({
    emailVerifyToken: token,
    emailVerifyExpires: { $gt: new Date() },
  }).select('+emailVerifyToken +emailVerifyExpires');
  if (!user) throw ApiError.badRequest('This verification link is invalid or has expired');
  user.isEmailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpires = undefined;
  await user.save({ validateBeforeSave: false });
  return ok(res, null, 'Email verified successfully');
});

export const adminChangePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = await Admin.findById(req.admin._id).select('+password');
  if (!(await admin.comparePassword(currentPassword))) throw ApiError.badRequest('Current password is incorrect');
  admin.password = newPassword;
  await admin.save();
  await RefreshToken.updateMany({ subject: admin._id, revokedAt: null }, { revokedAt: new Date() });
  return ok(res, null, 'Password updated');
});

export const requestAccountDeletion = asyncHandler(async (req, res) => {
  await notifyAdmin({
    type: 'ACCOUNT_DELETION',
    title: 'Account deletion requested',
    message: `${req.user.fullName} (${req.user.email}) requested account deletion.`,
    link: `/admin/customers/${req.user._id}`,
  });
  await notifyCustomer(req.user._id, {
    type: 'ACCOUNT',
    title: 'Deletion request received',
    message: 'Our care team will contact you within 48 hours to confirm. Your account stays active until then.',
  });
  return ok(res, null, 'Your deletion request has been logged. Our team will contact you within 48 hours.');
});

export const sessions = asyncHandler(async (req, res) => {
  const rows = await RefreshToken.find({
    subject: req.user._id,
    subjectType: 'User',
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .select('userAgent ip createdAt expiresAt family')
    .sort({ createdAt: -1 })
    .lean();
  return ok(res, { sessions: rows });
});

export const revokeSessions = asyncHandler(async (req, res) => {
  await RefreshToken.updateMany({ subject: req.user._id, revokedAt: null }, { revokedAt: new Date() });
  res.clearCookie(refreshCookieName, { path: '/api/auth' });
  return ok(res, null, 'Signed out of all devices');
});

export const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['fullName', 'mobile', 'avatar', 'marketingOptIn'];
  const updates = {};
  allowed.forEach((k) => {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  });
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  return ok(res, { user }, 'Profile updated');
});
