import mongoose from 'mongoose';
import { SIZES, PRODUCT_STATUS } from '../config/constants.js';

const { Schema } = mongoose;

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    alt: { type: String, default: '' },
    type: { type: String, enum: ['front', 'back', 'side', 'fabric', 'model', 'gallery'], default: 'gallery' },
    color: { type: String, default: '' }, // colour name this image belongs to
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true }
);

const colorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    hex: { type: String, required: true, default: '#78152F' },
    slug: { type: String, default: '' },
  },
  { _id: false }
);

const variantSchema = new Schema(
  {
    sku: { type: String, required: true, trim: true },
    size: { type: String, enum: SIZES, required: true },
    color: { type: String, required: true },
    price: { type: Number, min: 0 },
    mrp: { type: Number, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

variantSchema.virtual('available').get(function () {
  return Math.max(0, this.stock - this.reserved);
});

const productSchema = new Schema(
  {
    name: { type: String, required: [true, 'Product name is required'], trim: true, maxlength: 160, index: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true },
    sku: { type: String, required: true, unique: true, trim: true, index: true, uppercase: true },
    shortDescription: { type: String, default: '', maxlength: 300 },
    description: { type: String, default: '', maxlength: 5000 },
    brand: { type: String, default: 'Vimuhet' },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    subCategory: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    collections: [{ type: Schema.Types.ObjectId, ref: 'Collection', index: true }],

    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0, select: false },
    taxPercent: { type: Number, default: 5, min: 0, max: 28 },

    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    variants: { type: [variantSchema], default: [] },
    colors: { type: [colorSchema], default: [] },
    sizes: { type: [{ type: String, enum: SIZES }], default: [] },

    images: { type: [imageSchema], default: [] },

    attributes: {
      fabric: { type: String, default: '' },
      pattern: { type: String, default: '' },
      sleeve: { type: String, default: '' },
      neckline: { type: String, default: '' },
      length: { type: String, default: '' },
      fit: { type: String, default: '' },
      occasion: { type: String, default: '' },
      washCare: { type: String, default: '' },
      work: { type: String, default: '' },
      packageContains: { type: String, default: '' },
    },

    status: { type: String, enum: PRODUCT_STATUS, default: 'DRAFT', index: true },
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    tags: { type: [String], default: [], index: true },

    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    ratingBreakdown: { type: [Number], default: [0, 0, 0, 0, 0] },

    soldCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },

    isDemo: { type: Boolean, default: false },
    meta: { title: String, description: String },
    publishedAt: Date,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

productSchema.virtual('discountPercent').get(function () {
  if (!this.mrp || this.mrp <= this.price) return 0;
  return Math.round(((this.mrp - this.price) / this.mrp) * 100);
});

productSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

productSchema.index({ name: 'text', shortDescription: 'text', description: 'text', tags: 'text', sku: 'text' });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ status: 1, soldCount: -1 });
productSchema.index({ status: 1, rating: -1 });
productSchema.index({ price: 1 });
productSchema.index({ 'colors.name': 1 });
productSchema.index({ 'attributes.fabric': 1 });

productSchema.statics.recalcStock = function (product) {
  if (!product?.variants?.length) return product?.stock ?? 0;
  return product.variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
};

export default mongoose.model('Product', productSchema);
