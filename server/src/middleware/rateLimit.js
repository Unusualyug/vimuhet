import rateLimit from 'express-rate-limit';

const message = (msg) => ({ success: false, message: msg });

const isDev = process.env.NODE_ENV !== 'production';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Generous in development so local demos, screenshot runs and watch-mode HMR
  // do not exhaust the bucket; production keeps the strict ceiling.
  limit: isDev ? 30000 : 1200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many requests. Please slow down.'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 200 : 25, // relaxed locally so test runs and demos are not throttled
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many authentication attempts. Try again in a few minutes.'),
});

// Refresh is called whenever an access token expires, so it needs its own bucket —
// separate from the stricter sign-in limiter.
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 1000 : 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many session refreshes. Please try again shortly.'),
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 90,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Slow down a little — too many actions.'),
});

export const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many analytics events.'),
});
