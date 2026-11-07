import mongoose from 'mongoose';

const { Schema } = mongoose;

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true },
    description: { type: String, default: '', maxlength: 1200 },
    shortDescription: { type: String, default: '', maxlength: 240 },
    image: { url: String, publicId: String },
    banner: { url: String, publicId: String },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    showInMenu: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    icon: { type: String, default: 'Sparkles' },
    meta: { title: String, description: String },
    productCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.index({ sortOrder: 1, name: 1 });

export default mongoose.model('Category', categorySchema);
