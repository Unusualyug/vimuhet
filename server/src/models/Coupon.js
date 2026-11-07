import mongoose from 'mongoose';
import { COUPON_TYPES } from '../config/constants.js';

const { Schema } = mongoose;

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, default: '' },
    type: { type: String, enum: COUPON_TYPES, required: true },
    value: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, default: 0, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    usageLimit: { type: Number, default: 0 },
    usageLimitPerCustomer: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    usedBy: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, count: { type: Number, default: 1 } }],
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    freeShipping: { type: Boolean, default: false },
    firstOrderOnly: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

couponSchema.methods.isLive = function isLive(now = new Date()) {
  return this.isActive && this.startDate <= now && this.expiryDate >= now && (!this.usageLimit || this.usedCount < this.usageLimit);
};

export default mongoose.model('Coupon', couponSchema);
