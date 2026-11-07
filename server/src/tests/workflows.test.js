/**
 * End-to-end business workflow tests (node --test).
 * Runs against a live API instance + MongoDB (see README).
 *   API=http://127.0.0.1:5000/api node --test src/tests
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.API || 'http://127.0.0.1:5000/api';

const req = async (path, { method = 'GET', body, token, guestId, consent } = {}) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(guestId ? { 'x-guest-id': guestId } : {}),
      ...(consent ? { 'x-consent': consent } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
};

/**
 * Units a shopper can actually add right now. `stock` is gross: units held by
 * in-flight orders sit in `reserved`, so availability is the difference.
 */
const available = (variant) => Math.max(0, (variant.stock ?? 0) - (variant.reserved ?? 0));

test('health check', async () => {
  const { status, json } = await req('/health');
  assert.equal(status, 200);
  assert.equal(json.success, true);
});

test('catalogue: product list, filters, search, detail', async () => {
  const list = await req('/products?limit=5');
  assert.equal(list.status, 200);
  assert.ok(list.json.data.length > 0);
  assert.ok(list.json.meta.total >= 1);

  const filtered = await req('/products?size=M&color=Wine&minPrice=500');
  assert.equal(filtered.status, 200);

  const search = await req('/products/search?q=cotton');
  assert.equal(search.status, 200);
  assert.ok(Array.isArray(search.json.data.suggestions));

  const slug = list.json.data[0].slug;
  const detail = await req(`/products/${slug}`);
  assert.equal(detail.status, 200);
  assert.ok(detail.json.data.product.variants.length > 0);
});

test('auth: registration, duplicate rejection, login, protected route', async () => {
  const email = `test-${Date.now()}@example.com`;
  const reg = await req('/auth/register', {
    method: 'POST',
    body: { fullName: 'Test Shopper', email, password: 'Passw0rd123', mobile: '9876543210' },
  });
  assert.equal(reg.status, 201);
  assert.ok(reg.json.data.accessToken);

  const dup = await req('/auth/register', {
    method: 'POST',
    body: { fullName: 'Test Shopper', email, password: 'Passw0rd123' },
  });
  assert.equal(dup.status, 409);

  const weak = await req('/auth/register', {
    method: 'POST',
    body: { fullName: 'X', email: `w-${Date.now()}@example.com`, password: 'short' },
  });
  assert.equal(weak.status, 422);

  const login = await req('/auth/login', { method: 'POST', body: { email, password: 'Passw0rd123' } });
  assert.equal(login.status, 200);

  const badLogin = await req('/auth/login', { method: 'POST', body: { email, password: 'wrong' } });
  assert.equal(badLogin.status, 401);

  const me = await req('/auth/me', { token: login.json.data.accessToken });
  assert.equal(me.status, 200);

  const unauth = await req('/orders');
  assert.equal(unauth.status, 401);
});

test('cart: add, stock guard, coupon, wishlist', async () => {
  const guestId = `guest-${Date.now()}`;
  const list = await req('/products?limit=1');
  const product = list.json.data[0];
  const variant = product.variants.find((v) => available(v) >= 3);
  assert.ok(variant, 'expected a variant with free stock');

  const add = await req('/cart/items', {
    method: 'POST',
    guestId,
    body: { productId: product._id, variantId: variant._id, quantity: 2 },
  });
  assert.equal(add.status, 200);
  assert.equal(add.json.data.items.length, 1);

  const over = await req('/cart/items', {
    method: 'POST',
    guestId,
    body: { productId: product._id, variantId: variant._id, quantity: 10 },
  });
  assert.ok(over.status === 409 || over.status === 400, 'over-quantity must be rejected');

  const coupon = await req('/cart/coupon', { method: 'POST', guestId, body: { code: 'DOESNOTEXIST' } });
  assert.equal(coupon.status, 400);

  // A second line pushes the subtotal over the coupon's ₹1,999 minimum.
  const second = list.json.data[1] || product;
  const secondVariant = second.variants.find((v) => available(v) >= 1);
  if (second._id !== product._id) {
    await req('/cart/items', {
      method: 'POST',
      guestId,
      body: { productId: second._id, variantId: secondVariant._id, quantity: 1 },
    });
  }
  const validCoupon = await req('/cart/coupon', { method: 'POST', guestId, body: { code: 'VIMUHET300' } });
  assert.equal(validCoupon.status, 200);
  assert.ok(validCoupon.json.data.pricing.couponDiscount > 0);

  const wish = await req('/wishlist/toggle', { method: 'POST', guestId, body: { productId: product._id } });
  assert.equal(wish.status, 200);
  assert.equal(wish.json.data.action, 'added');

  const cart = await req('/cart', { guestId });
  assert.equal(cart.status, 200);
  assert.ok(cart.json.data.pricing.total > 0);
});

test('checkout: order creation, tampered signature rejected, valid signature confirms, stock committed once', async () => {
  const email = `checkout-${Date.now()}@example.com`;
  const reg = await req('/auth/register', {
    method: 'POST',
    body: { fullName: 'Checkout Shopper', email, password: 'Passw0rd123', mobile: '9876500000' },
  });
  const token = reg.json.data.accessToken;

  const list = await req('/products?limit=3');
  const product = list.json.data[0];
  const variant = product.variants.find((v) => v.stock > 3);
  const before = await req(`/products/${product.slug}`);
  const stockBefore = before.json.data.product.variants.find((v) => String(v._id) === String(variant._id)).stock;

  const checkout = await req('/checkout/create', {
    method: 'POST',
    token,
    body: {
      items: [{ product: product._id, variantId: variant._id, quantity: 1 }],
      shippingAddress: {
        fullName: 'Checkout Shopper',
        mobile: '9876500000',
        house: '12A',
        street: 'Palm Grove',
        area: 'Satellite',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380015',
      },
    },
  });
  assert.equal(checkout.status, 200, JSON.stringify(checkout.json));
  const { orderId, gateway } = checkout.json.data;

  const sandbox = await req('/checkout/sandbox-payment', {
    method: 'POST',
    token,
    body: { razorpayOrderId: gateway.razorpayOrderId, orderId },
  });
  assert.equal(sandbox.status, 200, JSON.stringify(sandbox.json));

  // 1. Tampered signature must be rejected — no fake success.
  const tampered = await req('/checkout/verify', {
    method: 'POST',
    token,
    body: {
      orderId,
      razorpay_order_id: gateway.razorpayOrderId,
      razorpay_payment_id: sandbox.json.data.razorpay_payment_id,
      razorpay_signature: 'deadbeefdeadbeef',
    },
  });
  assert.equal(tampered.status, 400);

  // 2. Server-generated sandbox signature (same HMAC path as live) must confirm.
  const verified = await req('/checkout/verify', {
    method: 'POST',
    token,
    body: {
      orderId,
      razorpay_order_id: gateway.razorpayOrderId,
      razorpay_payment_id: sandbox.json.data.razorpay_payment_id,
      razorpay_signature: sandbox.json.data.razorpay_signature,
      method: 'UPI',
    },
  });
  assert.equal(verified.status, 200, JSON.stringify(verified.json));
  assert.equal(verified.json.data.order.payment.status, 'PAID');
  assert.equal(verified.json.data.order.status, 'CONFIRMED');

  // 3. Replaying the same verification must be idempotent.
  const replay = await req('/checkout/verify', {
    method: 'POST',
    token,
    body: {
      orderId,
      razorpay_order_id: gateway.razorpayOrderId,
      razorpay_payment_id: sandbox.json.data.razorpay_payment_id,
      razorpay_signature: sandbox.json.data.razorpay_signature,
    },
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.json.data.alreadyProcessed, true);

  // 4. Stock must drop exactly once.
  const after = await req(`/products/${product.slug}`);
  const stockAfter = after.json.data.product.variants.find((v) => String(v._id) === String(variant._id)).stock;
  assert.equal(stockAfter, stockBefore - 1, 'stock committed exactly once');

  // 5. Cart cleared, order visible in account.
  const orders = await req('/orders', { token });
  assert.equal(orders.status, 200);
  assert.ok(orders.json.data.some((o) => String(o._id) === String(orderId)));

  const cart = await req('/cart', { token });
  assert.equal(cart.json.data.items.length, 0);
});

test('admin: protected routes, permission checks, dashboard data', async () => {
  const login = await req('/auth/admin/login', {
    method: 'POST',
    body: { email: process.env.ADMIN_EMAIL || 'admin@vimuhet.com', password: process.env.ADMIN_PASSWORD || 'Admin@12345' },
  });
  assert.equal(login.status, 200);
  const token = login.json.data.accessToken;

  const good = await req('/admin/dashboard', { token });
  assert.equal(good.status, 200);
  assert.ok(good.json.data.kpis);

  const noToken = await req('/admin/dashboard');
  assert.equal(noToken.status, 401);

  // A customer token must never reach admin routes.
  const customer = await req('/auth/login', { method: 'POST', body: { email: 'riya@example.com', password: 'Customer@123' } });
  const forbidden = await req('/admin/orders', { token: customer.json.data.accessToken });
  assert.equal(forbidden.status, 403);

  const analytics = await req('/admin/analytics/overview?range=30d', { token });
  assert.equal(analytics.status, 200);
});

test('reviews: only verified buyers can review', async () => {
  const email = `reviewer-${Date.now()}@example.com`;
  const reg = await req('/auth/register', {
    method: 'POST',
    body: { fullName: 'Review Tester', email, password: 'Passw0rd123' },
  });
  const token = reg.json.data.accessToken;
  const list = await req('/products?limit=1');
  const product = list.json.data[0];

  const res = await req('/my/reviews', {
    method: 'POST',
    token,
    body: { productId: product._id, orderId: '6aed94c28ace5c5ee434c620', rating: 5, comment: 'Trying to review without buying' },
  });
  assert.ok([403, 404, 400].includes(res.status), `expected rejection, got ${res.status}`);
});

test('security: rate limiting headers and validation errors', async () => {
  const bad = await req('/cart/coupon', { method: 'POST', guestId: `g-${Date.now()}`, body: {} });
  assert.equal(bad.status, 400);

  const badPincode = await req('/checkout/pincode/abc');
  assert.equal(badPincode.status, 400);

  const notFound = await req('/does-not-exist');
  assert.equal(notFound.status, 404);
});

test('guest access: browsing, bag and wishlist are public; ordering requires login', async () => {
  const guestId = `guest-${Date.now()}`;

  // 1. A guest can browse the catalogue without any credential.
  const list = await req('/products?limit=3', { guestId });
  assert.equal(list.status, 200);
  assert.ok(list.json.data.length > 0);

  const detail = await req(`/products/${list.json.data[0].slug}`, { guestId });
  assert.equal(detail.status, 200);

  // 2. A guest can build and read a bag, and it persists across requests.
  //    Pick a product with enough stock to carry a quantity of 2.
  const product = list.json.data.find((p) => p.variants.some((v) => available(v) >= 2)) || list.json.data[0];
  const variant = product.variants.find((v) => available(v) >= 2) || product.variants.find((v) => available(v) >= 1);
  const added = await req('/cart/items', {
    method: 'POST',
    guestId,
    body: { productId: product._id, variantId: variant._id, quantity: 2 },
  });
  assert.equal(added.status, 200, JSON.stringify(added.json));

  const bag = await req('/cart', { guestId });
  assert.equal(bag.status, 200);
  assert.equal(bag.json.data.items.length, 1);
  assert.equal(bag.json.data.items[0].quantity, 2);

  // 3. A guest can use the wishlist.
  const wish = await req('/wishlist/toggle', { method: 'POST', guestId, body: { productId: product._id } });
  assert.equal(wish.status, 200, JSON.stringify(wish.json));
  const wishlist = await req('/wishlist', { guestId });
  assert.equal(wishlist.status, 200);
  assert.equal(wishlist.json.data.count, 1);

  // 4. Order placement and every payment action require authentication — even
  //    when the guest supplies a valid payload, an order id and their own bag.
  const address = {
    fullName: 'Guest Shopper',
    mobile: '9876500001',
    house: '9B',
    street: 'Palm Grove',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380015',
  };
  const create = await req('/checkout/create', {
    method: 'POST',
    guestId,
    body: { items: [{ product: product._id, variantId: variant._id, quantity: 1 }], shippingAddress: address },
  });
  assert.equal(create.status, 401, JSON.stringify(create.json));
  assert.match(create.json.message, /log in|sign in/i);

  for (const endpoint of ['/checkout/verify', '/checkout/failed', '/checkout/retry']) {
    const res = await req(endpoint, {
      method: 'POST',
      guestId,
      body: { orderId: '6aede6afc3ff26643254110c', razorpayOrderId: 'order_sbx_x' },
    });
    assert.equal(res.status, 401, `${endpoint} must reject guests`);
  }
  const sandbox = await req('/checkout/sandbox-payment', {
    method: 'POST',
    guestId,
    body: { razorpayOrderId: 'order_sbx_x', orderId: '6aede6afc3ff26643254110c' },
  });
  assert.equal(sandbox.status, 401);

  // 5. Registering merges the guest bag and wishlist into the new account.
  const email = `guest-merge-${Date.now()}@example.com`;
  const reg = await req('/auth/register', {
    method: 'POST',
    guestId,
    body: { fullName: 'Guest Shopper', email, password: 'Passw0rd123', mobile: '9876500001' },
  });
  assert.equal(reg.status, 201, JSON.stringify(reg.json));
  const token = reg.json.data.accessToken;

  const mergedBag = await req('/cart', { token, guestId });
  assert.equal(mergedBag.status, 200);
  assert.equal(mergedBag.json.data.items.length, 1, 'guest bag carried into the account');
  assert.equal(mergedBag.json.data.items[0].quantity, 2, 'quantities preserved');

  const mergedWishlist = await req('/wishlist', { token });
  assert.equal(mergedWishlist.status, 200);
  assert.equal(mergedWishlist.json.data.count, 1, 'guest wishlist carried into the account');

  // 6. The merged list must hold no duplicates: adding a different product grows
  //    the list by exactly one, and the merged product still appears once.
  const other = list.json.data[1];
  await req('/wishlist/toggle', { method: 'POST', token, body: { productId: other._id } });
  const afterSecond = await req('/wishlist', { token });
  assert.equal(afterSecond.json.data.count, 2, 'wishlist grows by one, no duplicates');
  const ids = afterSecond.json.data.items.map((i) => String(i._id));
  assert.equal(new Set(ids).size, ids.length, 'every wishlist entry is unique');
  assert.ok(ids.includes(String(product._id)), 'merged product is still present');

  // 7. The guest cart document is gone after the merge, so it cannot resurrect.
  const guestBagAfter = await req('/cart', { guestId });
  assert.equal(guestBagAfter.json.data.items.length, 0, 'guest bag was consumed by the merge');
});

test('cookies: consent gates analytics, and withdrawal purges optional data', async () => {
  const guestId = `consent-guest-${Date.now()}`;
  const visitorId = `v_consent${Date.now()}`;
  const sessionId = `s_consent${Date.now()}`;

  // 1. Policy is published.
  const policy = await req('/cookies/policy');
  assert.equal(policy.status, 200);
  const keys = policy.json.data.categories.map((c) => c.key);
  assert.deepEqual(keys, ['essential', 'functional', 'analytics', 'marketing']);
  const essential = policy.json.data.categories.find((c) => c.key === 'essential');
  assert.equal(essential.locked, true, 'essential cookies cannot be disabled');

  // 2. No consent → no tracking at all.
  const refused = await req('/analytics/track', {
    method: 'POST',
    guestId,
    body: { type: 'page_view', sessionId, visitorId, path: '/shop' },
  });
  assert.equal(refused.status, 200);
  assert.equal(refused.json.data.tracked, false);
  assert.equal(refused.json.data.reason, 'consent_not_granted');

  // 3. Analytics consent granted → event recorded.
  const consentHeader = JSON.stringify({ functional: true, analytics: true, marketing: false });
  const accepted = await req('/analytics/track', {
    method: 'POST',
    guestId,
    body: { type: 'page_view', sessionId, visitorId, path: '/shop' },
    consent: consentHeader,
  });
  assert.equal(accepted.json.data.tracked, true);

  // 4. A marketing event still needs marketing consent specifically.
  const marketingRefused = await req('/analytics/track', {
    method: 'POST',
    guestId,
    body: { type: 'campaign_click', sessionId, visitorId, path: '/shop' },
    consent: consentHeader,
  });
  assert.equal(marketingRefused.json.data.tracked, false);
  assert.equal(marketingRefused.json.data.category, 'marketing');

  // 5. The decision itself is recorded and readable back.
  const saved = await req('/cookies/consent', {
    method: 'POST',
    guestId,
    body: { consent: { functional: true, analytics: true, marketing: false }, action: 'CUSTOM', visitorId, guestId, sessionId },
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.json.data.consent.analytics, true);
  assert.equal(saved.json.data.consent.marketing, false);
  assert.equal(saved.json.data.consent.essential, true, 'essential is always on');

  const current = await req(`/cookies/consent?visitorId=${visitorId}&guestId=${guestId}`);
  assert.equal(current.status, 200);
  assert.equal(current.json.data.decided, true);

  // 6. Withdrawal clears optional tracking data.
  const withdrawn = await req('/cookies/withdraw', {
    method: 'POST',
    guestId,
    body: { visitorId, guestId },
  });
  assert.equal(withdrawn.status, 200);
  assert.equal(withdrawn.json.data.consent.analytics, false);
  assert.equal(withdrawn.json.data.action, 'WITHDRAWN');

  // 7. Recently-viewed is a functional feature and requires functional consent.
  const list = await req('/products?limit=1');
  const productId = list.json.data[0]._id;
  const recentRefused = await req('/recently-viewed', {
    method: 'POST',
    guestId,
    body: { productId },
  });
  assert.equal(recentRefused.json.data.tracked, false, 'no functional consent, no recently-viewed');

  const recentAllowed = await req('/recently-viewed', {
    method: 'POST',
    guestId,
    consent: JSON.stringify({ functional: true }),
    body: { productId },
  });
  assert.equal(recentAllowed.json.data.tracked, true);
});

test('whatsapp: public contact number and settings are consistent', async () => {
  // The storefront builds its wa.me link from a client constant, so this guards
  // the server-side half: the published setting must match the real number.
  const settings = await req('/settings/public');
  assert.equal(settings.status, 200);
  assert.equal(settings.json.data.general.whatsapp, '918140214051');
  assert.equal(settings.json.data.contact?.whatsapp, '918140214051');

  // Contact details are public — reaching the business never requires a login.
  assert.ok(settings.json.data.general.email);
  assert.ok(settings.json.data.general.phone);
});
