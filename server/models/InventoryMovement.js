import mongoose from 'mongoose';

const inventoryMovementSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  variantId: mongoose.Schema.Types.ObjectId,
  sku: String,
  size: String,
  color: String,
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  previousStock: { type: Number, required: true, min: 0 },
  newStock: { type: Number, required: true, min: 0 },
  delta: { type: Number, required: true },
  reason: { type: String, required: true, trim: true, maxlength: 300 },
}, { timestamps: true });

export default mongoose.model('InventoryMovement', inventoryMovementSchema);
