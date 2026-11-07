import mongoose from 'mongoose';
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } from '../config/constants.js';

const { Schema } = mongoose;

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    slug: String,
    sku: String,
    image: String,
    size: String,
    color: String,
    price: { type: Number, required: true },
    mrp: { type: Number, default: 0 },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true },
    reviewed: { type: Boolean, default: false },
  },
  { _id: true }
);

const statusHistorySchema = new Schema(
  {
    status: { type: String, required: true },
    note: String,
    at: { type: Date, default: Date.now },
    by: { type: String, default: 'system' },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    guestEmail: { type: String, lowercase: true, trim: true },

    customer: {
      fullName: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      mobile: { type: String, required: true },
    },
    shippingAddress: {
      label: String,
      fullName: String,
      mobile: String,
      house: String,
      street: String,
      area: String,
      landmark: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
    },

    items: { type: [orderItemSchema], default: [] },

    pricing: {
      subtotal: { type: Number, required: true, default: 0 },
      mrpTotal: { type: Number, default: 0 },
      productDiscount: { type: Number, default: 0 },
      couponCode: { type: String, default: '' },
      couponDiscount: { type: Number, default: 0 },
      shipping: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      total: { type: Number, required: true, default: 0 },
      currency: { type: String, default: 'INR' },
    },

    payment: {
      method: { type: String, enum: PAYMENT_METHODS },
      status: { type: String, enum: PAYMENT_STATUS, default: 'CREATED', index: true },
      provider: { type: String, default: 'razorpay' },
      razorpayOrderId: { type: String, index: true },
      razorpayPaymentId: { type: String, index: true },
      razorpaySignature: String,
      paidAt: Date,
      verifiedAt: Date,
      failureReason: String,
      idempotencyKey: { type: String, unique: true, sparse: true },
    },

    status: { type: String, enum: ORDER_STATUS, default: 'PENDING', index: true },
    statusHistory: { type: [statusHistorySchema], default: [] },

    shipping: {
      courier: { type: String, default: '' },
      trackingNumber: { type: String, default: '' },
      trackingUrl: { type: String, default: '' },
      estimatedDelivery: Date,
      shippedAt: Date,
      deliveredAt: Date,
    },

    stockCommitted: { type: Boolean, default: false },
    invoiceNumber: { type: String, default: '' },
    cancelReason: { type: String, default: '' },
    returnReason: { type: String, default: '' },
    notes: { type: String, default: '' },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

orderSchema.index({ 'customer.email': 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Order', orderSchema);
