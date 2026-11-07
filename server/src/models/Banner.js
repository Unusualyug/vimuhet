import mongoose from 'mongoose';
import { BANNER_POSITIONS } from '../config/constants.js';

const { Schema } = mongoose;

const bannerSchema = new Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    image: { url: String, publicId: String },
    mobileImage: { url: String, publicId: String },
    ctaLabel: { type: String, default: '' },
    ctaLink: { type: String, default: '/' },
    position: { type: String, enum: BANNER_POSITIONS, default: 'HOME_MID', index: true },
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    theme: { type: String, default: 'burgundy' },
    clickCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

bannerSchema.methods.isLive = function (now = new Date()) {
  if (!this.isActive) return false;
  if (this.startDate && this.startDate > now) return false;
  if (this.endDate && this.endDate < now) return false;
  return true;
};

export default mongoose.model('Banner', bannerSchema);
