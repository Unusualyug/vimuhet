import { Router, raw } from 'express';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import { razorpay } from '../services/razorpay.service.js';
import { verifyAndConfirmPayment, markPaymentFailed } from '../services/order.service.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';

const router = Router();

/**
 * Razorpay webhook receiver.
 * Raw body is required for HMAC verification, so the raw parser is scoped to
 * this route only (the app-level JSON parser skips /api/webhooks).
 */
router.post('/razorpay', raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

  if (!env.razorpay.webhookSecret) {
    logger.warn('Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not configured');
    return res.status(503).json({ success: false, message: 'Webhook secret not configured' });
  }
  if (!signature || !razorpay.verifyWebhookSignature(rawBody, signature)) {
    logger.warn('Razorpay webhook signature mismatch — rejecting');
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }

  const entity = event?.payload?.payment?.entity;
  const razorpayOrderId = entity?.order_id;

  try {
    switch (event.event) {
      case 'payment.captured':
      case 'order.paid': {
        if (!razorpayOrderId) break;
        const payment = await Payment.findOne({ razorpayOrderId });
        if (!payment) {
          logger.warn(`Webhook: no local payment for ${razorpayOrderId}`);
          break;
        }
        if (payment.status === 'PAID') {
          logger.info(`Webhook: payment ${razorpayOrderId} already processed (idempotent skip)`);
          break;
        }
        // Webhook proves the gateway captured the payment; signature already
        // verified above, so we can confirm without the checkout signature.
        const order = await Order.findById(payment.order);
        if (!order) break;
        if (order.payment.status === 'PAID') break;

        order.payment.status = 'PAID';
        order.payment.razorpayPaymentId = entity.id;
        order.payment.method = entity.method?.toUpperCase().includes('CARD')
          ? 'CARD'
          : entity.method?.toUpperCase().includes('UPI')
          ? 'UPI'
          : entity.method?.toUpperCase().includes('NETBANKING')
          ? 'NETBANKING'
          : entity.method?.toUpperCase().includes('WALLET')
          ? 'WALLET'
          : undefined;
        order.payment.paidAt = new Date(entity.created_at ? entity.created_at * 1000 : Date.now());
        order.payment.verifiedAt = new Date();
        order.status = 'CONFIRMED';
        order.statusHistory.push({ status: 'CONFIRMED', note: 'Payment captured (webhook verified)', by: 'webhook' });
        order.stockCommitted = true;
        await order.save();

        payment.status = 'PAID';
        payment.razorpayPaymentId = entity.id;
        payment.webhookVerified = true;
        payment.paidAt = order.payment.paidAt;
        await payment.save();

        const { commitStock } = await import('../services/inventory.service.js');
        await commitStock(order.items, order._id);
        logger.info(`Webhook confirmed payment for order ${order.orderNumber}`);
        break;
      }

      case 'payment.failed': {
        if (!razorpayOrderId) break;
        const payment = await Payment.findOne({ razorpayOrderId });
        if (!payment || payment.status === 'PAID') break;
        await markPaymentFailed({ orderId: payment.order, reason: entity?.error_description || 'Payment failed (webhook)' });
        logger.info(`Webhook marked payment failed for ${razorpayOrderId}`);
        break;
      }

      case 'refund.processed':
      case 'refund.created': {
        const refundEntity = event?.payload?.refund?.entity;
        const payment = await Payment.findOne({ razorpayPaymentId: refundEntity?.payment_id });
        if (payment) {
          const existing = payment.refunds.find((r) => r.refundId === refundEntity.id);
          if (!existing) {
            payment.refunds.push({
              amount: refundEntity.amount / 100,
              refundId: refundEntity.id,
              reason: refundEntity.notes?.reason || 'Gateway refund',
              status: 'PROCESSED',
            });
            payment.refundedAmount = (payment.refundedAmount || 0) + refundEntity.amount / 100;
            payment.status = payment.refundedAmount >= payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
            await payment.save();
          }
        }
        break;
      }

      default:
        logger.debug(`Unhandled Razorpay event: ${event.event}`);
    }

    return res.json({ success: true, received: true });
  } catch (err) {
    logger.error('Razorpay webhook processing error:', err.message);
    // 500 makes Razorpay retry — safe because every handler is idempotent.
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

export default router;
