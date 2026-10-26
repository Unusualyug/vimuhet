import mongoose from 'mongoose';

const adminAuditSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, trim: true, maxlength: 100, index: true },
  recordType: { type: String, required: true, trim: true, maxlength: 80 },
  recordId: { type: String, trim: true, maxlength: 120 },
  summary: { type: String, required: true, trim: true, maxlength: 500 },
  // Do not put credentials, payment secrets, or customer tokens in this field.
}, { timestamps: true });
adminAuditSchema.index({ createdAt: -1 });

export default mongoose.model('AdminAudit', adminAuditSchema);
