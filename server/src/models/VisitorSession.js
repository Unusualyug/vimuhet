import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * One row per visitor per session. `sessionId` is the client-held guest session
 * handle (localStorage, an essential cookie-backed identifier). `visitorId` is
 * the longer-lived device identifier, so repeat visits can be recognised.
 *
 * Privacy: no IP address, no precise location, no fingerprint fields. Geography
 * is coarse (city/state) and only written when analytics consent is present.
 */
const visitorSessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    visitorId: { type: String, required: true, index: true },
    guestId: { type: String, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    currentPath: { type: String, default: '/' },
    pageViews: { type: Number, default: 0 },
    productViews: { type: Number, default: 0 },
    cartAdditions: { type: Number, default: 0 },
    wishlistAdditions: { type: Number, default: 0 },
    checkoutStarted: { type: Boolean, default: false },
    orderCompleted: { type: Boolean, default: false },
    isReturning: { type: Boolean, default: false },
    device: String,
    source: String,
    browser: String,
    os: String,
    city: String,
    state: String,
    country: String,

    /* Consent state captured at the moment the session was created or updated.
       Stored per session so a later withdrawal can be reconciled honestly. */
    consent: {
      analytics: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false },
      functional: { type: Boolean, default: false },
      version: { type: Number, default: 0 },
      decidedAt: Date,
    },

    startedAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    endedAt: Date,
  },
  { timestamps: false }
);

visitorSessionSchema.index({ lastSeenAt: -1 });
visitorSessionSchema.index({ visitorId: 1, startedAt: -1 });
/* Retention is enforced by the scheduled cleanup script rather than a TTL index:
   a TTL index would need to be on a single date field, and these sessions are
   still pruned on `startedAt` there. Keeping the index explicit documents it. */
visitorSessionSchema.index({ startedAt: 1 });

export default mongoose.model('VisitorSession', visitorSessionSchema);
