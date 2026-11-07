import mongoose from 'mongoose';
import { PAYMENT_STATUS, PAYMENT_METHODS } from '../config/constants.js';

const { Schema } = mongoose;

const refundSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 1 },
    refundId: String,
    reason: String,
    status: { type: String, enum: ['INITIATED', 'PROCESSED', 'FAILED'], default: 'INITIATED' },
    by: { type: Schema.Types.ObjectId, ref: 'Admin' },
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const paymentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
    orderNumber: String,
    provider: { type: String, default: 'razorpay' },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true, index: true },
    razorpaySignature: String,
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    method: { type: String, enum: PAYMENT_METHODS },
    status: { type: String, enum: PAYMENT_STATUS, default: 'CREATED', index: true },
    signatureVerified: { type: Boolean, default: false },
    webhookVerified: { type: Boolean, default: false },
    source: { type: String, enum: ['checkout', 'webhook', 'admin'], default: 'checkout' },
    failureReason: String,
    notes: { type: Schema.Types.Mixed, default: {} },
    refunds: { type: [refundSchema], default: [] },
    refundedAmount: { type: Number, default: 0 },
    isDemo: { type: Boolean, default: false },
    paidAt: Date,
  },
  { timestamps: true }
);

paymentSchema.index({ createdAt: -1 });

export default mongoose.model('Payment', paymentSchema);
