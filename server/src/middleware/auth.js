import { verifyAccessToken } from '../utils/tokens.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/http.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';

const getToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies?.vimuhet_at) return req.cookies.vimuhet_at;
  return null;
};

/** Attaches req.user for customer access tokens. */
export const protectUser = asyncHandler(async (req, _res, next) => {
  const token = getToken(req);
  if (!token) throw ApiError.unauthorized('Please sign in to continue');
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Session expired. Please sign in again.');
  }
  if (payload.typ !== 'customer') throw ApiError.forbidden('Invalid token audience');
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (user.isBlocked) throw ApiError.forbidden('Your account has been blocked. Contact support.');
  // A password change revokes refresh tokens, which forces a fresh sign-in. The
  // access token itself stays valid for its short remaining life so unrelated
  // writes do not bounce the session (which caused refresh storms).
  void user.isPasswordChangedAfter?.(payload.iat);
  req.user = user;
  next();
});

/** Optional customer auth: attaches user if a valid token is present. */
export const optionalUser = asyncHandler(async (req, _res, next) => {
  const token = getToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    if (payload.typ === 'customer') {
      const user = await User.findById(payload.sub);
      if (user && !user.isBlocked) req.user = user;
    }
  } catch {
    /* ignore invalid token for optional routes */
  }
  next();
});

export const protectAdmin = asyncHandler(async (req, _res, next) => {
  const token = getToken(req);
  if (!token) throw ApiError.unauthorized('Admin authentication required');
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Admin session expired. Please sign in again.');
  }
  if (payload.typ !== 'admin') throw ApiError.forbidden('Invalid token audience');
  const admin = await Admin.findById(payload.sub);
  if (!admin) throw ApiError.unauthorized('Admin account not found');
  if (!admin.isActive) throw ApiError.forbidden('This admin account is disabled');
  req.admin = admin;
  next();
});

export const requirePermission = (permission) => (req, _res, next) => {
  if (!req.admin) return next(ApiError.unauthorized('Admin authentication required'));
  if (!req.admin.hasPermission(permission)) {
    return next(ApiError.forbidden(`Missing permission: ${permission}`));
  }
  next();
};

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.admin || !roles.includes(req.admin.role)) {
    return next(ApiError.forbidden('Your role cannot perform this action'));
  }
  next();
};
