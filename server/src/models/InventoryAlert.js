import mongoose from 'mongoose';

const { Schema } = mongoose;

const stockAlertSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    size: String,
    color: String,
    email: { type: String, required: true, lowercase: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    notified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

stockAlertSchema.index({ product: 1, variantId: 1, email: 1 }, { unique: true });

export default mongoose.model('StockAlert', stockAlertSchema);
