import mongoose from 'mongoose';

const productQuestionSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  authorLabel: { type: String, required: true, trim: true, maxlength: 60 },
  question: { type: String, required: true, trim: true, minlength: 5, maxlength: 1000 },
  answer: { type: String, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending', index: true },
  moderationNote: { type: String, trim: true, maxlength: 1000 },
  answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  answeredAt: Date,
}, { timestamps: true });

productQuestionSchema.index({ product: 1, status: 1, createdAt: -1 });

export default mongoose.model('ProductQuestion', productQuestionSchema);
