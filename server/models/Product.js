import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 180 },
  slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
  sku: { type: String, trim: true, uppercase: true, sparse: true, unique: true, maxlength: 80 },
  shortDescription: { type: String, trim: true, maxlength: 300 },
  description: { type: String, default: '', maxlength: 10000 },
  category: { type: String, required: true, index: true, maxlength: 100 },
  collectionName: { type: String, trim: true, maxlength: 100 },
  productType: { type: String, trim: true, maxlength: 100 },
  images: [{ url: { type: String, maxlength: 2048 }, publicId: { type: String, maxlength: 255 }, alt: { type: String, maxlength: 180 }, color: { type: String, maxlength: 80 } }],
  price: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, min: 0 },
  saleStartsAt: Date,
  saleEndsAt: Date,
  sizes: [{ type: String, trim: true, maxlength: 30 }],
  colors: [{ type: String, trim: true, maxlength: 60 }],
  stock: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 5, min: 0 },
  variants: [{ sku: { type: String, trim: true, uppercase: true }, size: String, color: String, stock: { type: Number, min: 0, default: 0 } }],
  material: String,
  fabric: String,
  fit: String,
  style: String,
  care: String,
  sizeGuide: { type: String, trim: true, maxlength: 3000 },
  shippingWeight: { type: Number, min: 0 },
  featured: { type: Boolean, default: false, index: true },
  published: { type: Boolean, default: false, index: true },
  status: { type: String, enum: ['draft', 'published', 'archived'], index: true },
  archivedAt: Date,
  seoTitle: { type: String, maxlength: 180 },
  seoDescription: { type: String, maxlength: 320 },
  popularity: { type: Number, default: 0 },
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text', category: 'text', sku: 'text' });
productSchema.index({ status: 1, category: 1, createdAt: -1 });
productSchema.pre('validate', function syncPublication(next) {
  if (this.status === 'published') this.published = true;
  if (this.status === 'draft' || this.status === 'archived') this.published = false;
  if (!this.status) this.status = this.published ? 'published' : 'draft';
  next();
});

export default mongoose.model('Product', productSchema);
