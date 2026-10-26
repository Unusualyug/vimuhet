import mongoose from "mongoose";

const analyticsEventSchema = new mongoose.Schema(
  {
    visitorHash: { type: String, required: true, index: true, maxlength: 64 },
    sessionHash: { type: String, required: true, index: true, maxlength: 64 },
    eventType: {
      type: String,
      enum: ["page_view", "product_view", "add_to_bag", "checkout_started"],
      required: true,
      index: true,
    },
    path: { type: String, required: true, maxlength: 180 },
    productSlug: { type: String, maxlength: 180, default: null },
    occurredAt: { type: Date, default: Date.now, required: true, index: true },
    // Optional technical retention control. When set, MongoDB removes the event at this time.
    expiresAt: { type: Date, default: null, index: { expireAfterSeconds: 0 } },
  },
  { versionKey: false },
);

analyticsEventSchema.index({ occurredAt: -1, eventType: 1 });
analyticsEventSchema.index({ occurredAt: -1, visitorHash: 1 });
analyticsEventSchema.index({ occurredAt: -1, sessionHash: 1 });

export default mongoose.model("AnalyticsEvent", analyticsEventSchema);
