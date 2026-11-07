import mongoose from 'mongoose';

const { Schema } = mongoose;

const linkSchema = new Schema(
  { label: String, to: String },
  { _id: false }
);

const heroSlideSchema = new Schema(
  {
    eyebrow: { type: String, default: 'PREMIUM ETHNIC WEAR' },
    title: { type: String, required: true },
    titleAccent: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    image: { url: String, publicId: String },
    mobileImage: { url: String, publicId: String },
    primaryCta: linkSchema,
    secondaryCta: linkSchema,
    align: { type: String, enum: ['left', 'right'], default: 'left' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true }
);

const homepageSchema = new Schema(
  {
    key: { type: String, default: 'main', unique: true },
    announcement: {
      enabled: { type: Boolean, default: true },
      messages: { type: [String], default: [] },
      couponCode: { type: String, default: '' },
      offerText: { type: String, default: '' },
      freeShippingText: { type: String, default: '' },
    },
    hero: { type: [heroSlideSchema], default: [] },
    sections: {
      featuredCollections: { enabled: Boolean, title: String, subtitle: String, collectionIds: [{ type: Schema.Types.ObjectId, ref: 'Collection' }] },
      newArrivals: { enabled: Boolean, title: String, subtitle: String, limit: { type: Number, default: 8 } },
      bestSellers: { enabled: Boolean, title: String, subtitle: String, limit: { type: Number, default: 8 } },
      trending: { enabled: Boolean, title: String, subtitle: String, limit: { type: Number, default: 4 } },
      promoBanner: { enabled: Boolean, title: String, subtitle: String, image: { url: String, publicId: String }, cta: linkSchema },
      brandStory: { enabled: Boolean, title: String, body: String, image: { url: String, publicId: String }, cta: linkSchema },
      testimonials: { enabled: Boolean, title: String, subtitle: String },
      newsletter: { enabled: Boolean, title: String, subtitle: String, placeholder: String },
      trustStrip: { enabled: Boolean, items: [{ title: String, subtitle: String, icon: String }] },
    },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED'], default: 'PUBLISHED' },
    version: { type: Number, default: 1 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

export default mongoose.model('Homepage', homepageSchema);
