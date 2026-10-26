import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 2000 },
  image: { url: String, publicId: String },
  bannerImage: { url: String, publicId: String },
  seoTitle: { type: String, maxlength: 180 },
  seoDescription: { type: String, maxlength: 320 },
  displayOrder: { type: Number, default: 0, min: 0 },
  featuredProductIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

categorySchema.index({ active: 1, displayOrder: 1, name: 1 });
export default mongoose.model('Category', categorySchema);
