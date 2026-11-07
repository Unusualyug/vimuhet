import mongoose from 'mongoose';

const { Schema } = mongoose;

const stockMovementSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variantId: Schema.Types.ObjectId,
    size: String,
    color: String,
    sku: String,
    type: { type: String, enum: ['IN', 'OUT', 'ADJUST', 'RESERVE', 'RELEASE'], required: true },
    quantity: { type: Number, required: true },
    balanceAfter: { type: Number, default: 0 },
    reason: { type: String, default: '' },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    by: String,
  },
  { timestamps: true }
);

stockMovementSchema.index({ createdAt: -1 });

export default mongoose.model('StockMovement', stockMovementSchema);
