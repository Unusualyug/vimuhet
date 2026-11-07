import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * A visitor's request to access or delete their personal data.
 * Records the request and its handling; no data is returned inline.
 */
const dataRequestSchema = new Schema(
  {
    type: { type: String, enum: ['ACCESS', 'DELETION'], required: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    note: { type: String, default: '', maxlength: 500 },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['RECEIVED', 'VERIFYING', 'COMPLETED', 'REJECTED'],
      default: 'RECEIVED',
    },
    handledAt: Date,
    handledBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    resolutionNote: { type: String, default: '' },
  },
  { timestamps: true }
);

dataRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('DataRequest', dataRequestSchema);
