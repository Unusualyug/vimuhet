import ApiError from '../utils/ApiError.js';

/**
 * Defence-in-depth CSRF protection for the one origin-bearing credential we use:
 * the HttpOnly refresh cookie (`vimuhet_rt`).
 *
 * The primary defences are already in place:
 *   - `sameSite: 'lax'` in development and `'none'` + `secure` in production,
 *     which requires HTTPS;
 *   - a strict CORS allowlist with `credentials: true`, so a cross-site page
 *     cannot read or send credentialed requests.
 *
 * This middleware closes the remaining hole: a top-level cross-site POST to
 * /auth/refresh would still carry the cookie under `sameSite: 'none'`. We require
 * the browser-declared Origin to be one we recognise whenever a refresh cookie is
 * present. Requests with no Origin (curl, server-to-server, the app's own
 * same-origin fetch) are unaffected.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfGuard(allowedOrigins = []) {
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    /* Only cookie-authenticated requests are at risk from CSRF. Bearer-token
       requests cannot be forged cross-site because the attacker has no token. */
    const hasRefreshCookie = Boolean(req.cookies?.vimuhet_rt);
    if (!hasRefreshCookie) return next();

    const origin = req.headers.origin || req.headers.referer;
    if (!origin) return next();

    const allowed = allowedOrigins.some((o) => o && origin.startsWith(o));
    if (!allowed) {
      return next(ApiError.forbidden('Request blocked: untrusted origin'));
    }
    return next();
  };
}

export default csrfGuard;
