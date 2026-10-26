import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  authorLabel: { type: String, required: true, trim: true, maxlength: 60 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
  body: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  verifiedPurchase: { type: Boolean, default: true, immutable: true },
  status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending', index: true },
  moderationNote: { type: String, trim: true, maxlength: 1000 },
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  moderatedAt: Date,
}, { timestamps: true });

reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });

export default mongoose.model('Review', reviewSchema);
