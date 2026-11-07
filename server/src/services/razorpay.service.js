import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';

/**
 * Razorpay integration.
 *
 * Real SDK is used whenever keys are configured. Checkout is *never* trusted
 * from the browser: every payment is confirmed by verifying the Razorpay
 * signature (HMAC SHA256 of `order_id|payment_id`) against the backend secret,
 * and failures are surfaced honestly.
 *
 * When RAZORPAY keys are absent, development can run in SANDBOX mode: the
 * server generates its own payment id + signature with the same HMAC algorithm,
 * so the verification code path is genuinely exercised. Sandbox is disabled in
 * production and always labelled in the UI/admin.
 */

let client = null;
const sandboxEnabled = () =>
  !env.isProd && String(process.env.PAYMENT_SANDBOX || 'true').toLowerCase() === 'true';

const sandboxSecret = process.env.PAYMENT_SANDBOX_SECRET || 'vimuhet_sandbox_secret';

function getClient() {
  if (!env.razorpay.enabled) return null;
  if (!client) {
    client = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
  }
  return client;
}

export const razorpay = {
  get mode() {
    if (env.razorpay.enabled) return 'live';
    return sandboxEnabled() ? 'sandbox' : 'disabled';
  },

  get keyId() {
    return env.razorpay.enabled ? env.razorpay.keyId : null;
  },

  async createOrder({ amountInPaise, receipt, notes = {} }) {
    const rz = getClient();
    if (rz) {
      const order = await rz.orders.create({ amount: amountInPaise, currency: 'INR', receipt, notes });
      return { id: order.id, amount: order.amount, currency: order.currency, mode: 'live' };
    }
    if (!sandboxEnabled()) {
      throw new ApiError(503, 'Online payments are not configured yet. Please contact support.');
    }
    const id = `order_sbx_${crypto.randomBytes(8).toString('hex')}`;
    logger.warn('Razorpay sandbox order created (no live keys configured):', id);
    return { id, amount: amountInPaise, currency: 'INR', mode: 'sandbox' };
  },

  /** Verification order: signature first, then idempotency checks in the caller. */
  verifySignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) {
      throw ApiError.badRequest('Incomplete payment verification payload');
    }
    const secret = env.razorpay.enabled ? env.razorpay.keySecret : sandboxSecret;
    const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(String(signature), 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw ApiError.badRequest('Payment signature verification failed');
    }
    return true;
  },

  /** Sandbox helper — produces the payment id + signature a real gateway would return. */
  sandboxPaymentPayload(orderId) {
    if (!sandboxEnabled()) throw new ApiError(503, 'Sandbox payments are disabled');
    const paymentId = `pay_sbx_${crypto.randomBytes(9).toString('hex')}`;
    const signature = crypto.createHmac('sha256', sandboxSecret).update(`${orderId}|${paymentId}`).digest('hex');
    return { razorpay_payment_id: paymentId, razorpay_signature: signature };
  },

  async fetchPayment(paymentId) {
    const rz = getClient();
    if (!rz) return null;
    try {
      return await rz.payments.fetch(paymentId);
    } catch (err) {
      logger.warn('Razorpay fetchPayment failed:', err.message);
      return null;
    }
  },

  async refundPayment(paymentId, amountInPaise, notes = {}) {
    const rz = getClient();
    if (!rz) {
      if (!sandboxEnabled()) throw new ApiError(503, 'Refunds require live Razorpay credentials');
      return { id: `rfnd_sbx_${crypto.randomBytes(6).toString('hex')}`, amount: amountInPaise, status: 'processed', sandbox: true };
    }
    return rz.payments.refund(paymentId, {
      amount: amountInPaise,
      speed: 'normal',
      notes,
    });
  },

  verifyWebhookSignature(rawBody, signature) {
    if (!env.razorpay.webhookSecret) return false;
    const expected = crypto
      .createHmac('sha256', env.razorpay.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return expected === signature;
  },
};

export default razorpay;
