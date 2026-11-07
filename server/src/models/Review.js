import mongoose from 'mongoose';
import { REVIEW_STATUS } from '../config/constants.js';

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    customerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: '', maxlength: 120 },
    comment: { type: String, required: true, maxlength: 2000 },
    images: [{ url: String, publicId: String }],
    verifiedPurchase: { type: Boolean, default: false },
    status: { type: String, enum: REVIEW_STATUS, default: 'PENDING', index: true },
    adminResponse: { type: String, default: '' },
    helpfulCount: { type: Number, default: 0 },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, user: 1, order: 1 }, { unique: true });

reviewSchema.statics.recalcProductRating = async function (productId) {
  const Product = mongoose.model('Product');
  const rows = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), status: 'APPROVED' } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]);
  const breakdown = [0, 0, 0, 0, 0];
  let total = 0;
  let count = 0;
  rows.forEach((r) => {
    breakdown[5 - r._id] = r.count;
    total += r._id * r.count;
    count += r.count;
  });
  const rating = count ? Math.round((total / count) * 10) / 10 : 0;
  await Product.findByIdAndUpdate(productId, { rating, reviewCount: count, ratingBreakdown: breakdown });
  return { rating, count, breakdown };
};

export default mongoose.model('Review', reviewSchema);
