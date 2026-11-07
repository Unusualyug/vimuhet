import mongoose from 'mongoose';

const { Schema } = mongoose;

const collectionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    image: { url: String, publicId: String },
    banner: { url: String, publicId: String },
    icon: { type: String, default: 'Sparkles' },
    theme: { type: String, default: 'burgundy' },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date,
    meta: { title: String, description: String },
  },
  { timestamps: true }
);

export default mongoose.model('Collection', collectionSchema);
