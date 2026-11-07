import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Recently viewed products, keyed by the guest session (or the signed-in user).
 * This is a functional feature — it only works when functional consent is given,
 * and is merged into the account on login.
 */
const recentViewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    guestId: { type: String },
    products: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

/* A visitor has exactly one recent-views document per identity. */
recentViewSchema.index({ user: 1 }, { unique: true, sparse: true });
recentViewSchema.index({ guestId: 1 }, { unique: true, sparse: true });
recentViewSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export default mongoose.model('RecentView', recentViewSchema);
