import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  variantId: mongoose.Schema.Types.ObjectId,
  size: { type: String, maxlength: 30 },
  color: { type: String, maxlength: 60 },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  status: { type: String, enum: ['active', 'sent', 'unsubscribed'], default: 'active', index: true },
  consentedAt: { type: Date, required: true },
  unsubscribeTokenHash: String,
  sentAt: Date,
}, { timestamps: true });

schema.index({ product: 1, variantId: 1, email: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
schema.index({ status: 1, product: 1, createdAt: 1 });

export default mongoose.model('StockAlertSubscription', schema);
