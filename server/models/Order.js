import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  number: { type: String, unique: true, index: true },
  idempotencyKey: { type: String, unique: true, sparse: true, index: true },
  guestCodeHash: String,
  reservationExpiresAt: Date,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  items: [{ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, variantId: mongoose.Schema.Types.ObjectId, sku: String, name: String, quantity: Number, unitPrice: Number, size: String, color: String, image: String }],
  shipping: { name: String, phone: String, line1: String, line2: String, city: String, state: String, pincode: String },
  gift: { wrapped: { type: Boolean, default: false }, note: { type: String, maxlength: 500 }, fee: { type: Number, default: 0, min: 0 } },
  subtotal: { type: Number, required: true },
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  couponCode: { type: String, trim: true, uppercase: true, maxlength: 32 },
  couponReservationHeld: { type: Boolean, default: false, index: true },
  discountTotal: { type: Number, default: 0, min: 0 },
  shippingFee: { type: Number, default: 0, min: 0 },
  taxTotal: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true },
  currency: { type: String, enum: ['INR'], default: 'INR' },
  paymentMethod: { type: String, default: 'razorpay' },
  status: { type: String, enum: ['pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], default: 'pending_payment', index: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending', index: true },
  refundStatus: { type: String, enum: ['none', 'pending', 'processed', 'failed'], default: 'none' },
  refundId: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  paidAt: Date,
  carrier: String,
  trackingNumber: String,
  trackingUrl: String,
  shippedAt: Date,
  deliveredAt: Date,
  notes: [String],
  adminNotes: [{ actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, note: { type: String, maxlength: 1000 }, createdAt: { type: Date, default: Date.now } }],
  statusHistory: [{ from: String, to: String, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, note: String, at: { type: Date, default: Date.now } }],
  customerRequests: [{ type: { type: String, enum: ['cancellation', 'return'], required: true }, status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, reason: { type: String, maxlength: 1000 }, requestedAt: { type: Date, default: Date.now }, reviewedAt: Date, reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, reviewNote: { type: String, maxlength: 1000 } }],
}, { timestamps: true });

orderSchema.index({ createdAt: -1, status: 1 });
orderSchema.index({ paymentStatus: 1, refundStatus: 1, createdAt: -1 });
export default mongoose.model('Order', orderSchema);
