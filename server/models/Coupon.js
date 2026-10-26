import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true, match: /^[A-Z0-9_-]{3,32}$/ },
  description: { type: String, trim: true, maxlength: 240 },
  active: { type: Boolean, default: true, index: true },
  discountType: { type: String, required: true, enum: ['percentage', 'fixed'] },
  discountValue: { type: Number, required: true, min: 0.01 },
  minSubtotal: { type: Number, default: 0, min: 0 },
  startsAt: Date,
  endsAt: Date,
  maxRedemptions: { type: Number, default: 0, min: 0 }, // Zero means no overall limit.
  maxUsesPerCustomer: { type: Number, default: 0, min: 0 }, // Zero means no per-customer limit.
  firstOrderOnly: { type: Boolean, default: false },
  redemptionCount: { type: Number, default: 0, min: 0 },
  reservedCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

couponSchema.index({ active: 1, startsAt: 1, endsAt: 1 });
couponSchema.pre('validate', function normalizeCoupon(next) {
  if (this.code) this.code = this.code.trim().toUpperCase();
  if (this.discountType === 'percentage' && this.discountValue > 100) this.invalidate('discountValue', 'Percentage discount cannot exceed 100');
  if (this.startsAt && this.endsAt && this.endsAt <= this.startsAt) this.invalidate('endsAt', 'End must follow start');
  next();
});

export default mongoose.model('Coupon', couponSchema);
