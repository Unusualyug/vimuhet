import mongoose from 'mongoose';

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    audience: { type: String, enum: ['ADMIN', 'CUSTOMER'], default: 'ADMIN' },
    admin: { type: Schema.Types.ObjectId, ref: 'Admin', index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    link: { type: String, default: '' },
    isRead: { type: Boolean, default: false, index: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ audience: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
