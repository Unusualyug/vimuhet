import mongoose from 'mongoose';

const { Schema } = mongoose;

const analyticsEventSchema = new Schema(
  {
    type: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    visitorId: { type: String, required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    path: { type: String, default: '/' },
    referrer: { type: String, default: '' },
    source: { type: String, enum: ['Direct', 'Google Search', 'Social Media', 'Referral', 'Campaign'], default: 'Direct' },
    device: { type: String, enum: ['Desktop', 'Mobile', 'Tablet'], default: 'Desktop' },
    browser: String,
    os: String,
    isReturning: { type: Boolean, default: false },
    country: String,
    state: String,
    city: String,
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    value: { type: Number, default: 0 },
    meta: { type: Schema.Types.Mixed, default: {} },
    durationMs: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

analyticsEventSchema.index({ createdAt: -1, type: 1 });
analyticsEventSchema.index({ sessionId: 1, createdAt: -1 });

export default mongoose.model('AnalyticsEvent', analyticsEventSchema);
