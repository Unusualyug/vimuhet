import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * An immutable-ish record of what a visitor consented to, when, and from where.
 * Kept separately from the session so that withdrawing consent leaves an audit
 * trail rather than erasing history.
 */
const consentSchema = new Schema(
  {
    visitorId: { type: String, required: true, index: true },
    guestId: { type: String, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    sessionId: { type: String, index: true },

    /* The visitor's choices as stored. Essential is always true. */
    categories: {
      essential: { type: Boolean, default: true },
      functional: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false },
    },

    /* How the choice was made — useful for the admin consent breakdown. */
    action: {
      type: String,
      enum: ['ACCEPT_ALL', 'REJECT_OPTIONAL', 'CUSTOM', 'WITHDRAWN'],
      default: 'CUSTOM',
    },
    version: { type: Number, default: 1 },
    source: { type: String, default: 'banner' },

    /* Coarse context only; never an IP, never a device fingerprint. */
    userAgentFamily: { type: String, default: '' },

    decidedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

consentSchema.index({ decidedAt: -1 });

export default mongoose.model('ConsentRecord', consentSchema);
