import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const signAccessToken = (payload) =>
  jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessTtl });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshTtl });

export const verifyAccessToken = (token) => jwt.verify(token, env.jwt.accessSecret);
export const verifyRefreshToken = (token) => jwt.verify(token, env.jwt.refreshSecret);

export const refreshCookieName = 'vimuhet_rt';

export const refreshCookieOptions = (remember = true) => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax',
  path: '/api/auth',
  maxAge: (remember ? 30 : 1) * 24 * 60 * 60 * 1000,
});

export const parseTtlMs = (ttl) => {
  const m = /^(\d+)([smhd])$/.exec(String(ttl));
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  return { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]] * n;
};
