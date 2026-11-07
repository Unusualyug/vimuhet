import mongoose from 'mongoose';

const { Schema } = mongoose;

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    slug: String,
    sku: String,
    image: String,
    size: { type: String, required: true },
    color: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, default: 0 },
    quantity: { type: Number, required: true, min: 1, max: 10 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true, index: true },
    guestId: { type: String, unique: true, sparse: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    coupon: {
      code: String,
      couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
      discount: { type: Number, default: 0 },
      type: { type: String, enum: ['PERCENTAGE', 'FIXED'], default: 'PERCENTAGE' },
      freeShipping: { type: Boolean, default: false },
    },
    reminderEmailSentAt: Date,
  },
  { timestamps: true }
);

cartSchema.index({ updatedAt: -1 });

export default mongoose.model('Cart', cartSchema);
