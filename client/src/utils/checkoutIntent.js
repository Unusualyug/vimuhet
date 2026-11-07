/**
 * Checkout intent helpers.
 *
 * Login is only mandatory at the point an order is actually placed. Everything
 * before that — browsing, the bag, the wishlist — stays fully anonymous. These
 * helpers keep the "you must sign in" message identical everywhere and make the
 * post-login return trip land on the exact step the guest left off at.
 */

export const CHECKOUT_LOGIN_MESSAGE =
  'Please log in or create an account to continue with your order.';

/** Routes that represent a checkout intent, used to pick the right message. */
export const isCheckoutPath = (redirect) => Boolean(redirect && redirect.startsWith('/checkout'));

/**
 * Build the login URL for a checkout intent, carrying the destination so the
 * auth page can (a) show the checkout message and (b) send the user back.
 */
export function loginUrlFor(redirect = '/checkout', extra = {}) {
  const params = new URLSearchParams({ redirect });
  if (extra.intent) params.set('intent', extra.intent);
  return `/login?${params.toString()}`;
}

/**
 * Decide where a guard should send a guest. Only used at checkout boundaries —
 * never during browsing, so no popups interrupt the shopping flow.
 *
 * @param {boolean} authenticated
 * @param {string} redirect   Where to return after auth (path + search).
 * @returns {{ allowed: boolean, to?: string, message?: string }}
 */
export function guardCheckout(authenticated, redirect = '/checkout') {
  if (authenticated) return { allowed: true };
  return {
    allowed: false,
    to: loginUrlFor(redirect, { intent: 'checkout' }),
    message: CHECKOUT_LOGIN_MESSAGE,
  };
}

/** Registration URL that preserves a checkout intent (and its destination). */
export function registerUrlFor(redirect = '/checkout', { checkoutIntent = false } = {}) {
  const params = new URLSearchParams();
  if (redirect && redirect !== '/account') params.set('redirect', redirect);
  if (checkoutIntent) params.set('intent', 'checkout');
  const qs = params.toString();
  return `/register${qs ? `?${qs}` : ''}`;
}
