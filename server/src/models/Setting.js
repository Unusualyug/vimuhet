import mongoose from 'mongoose';

const { Schema } = mongoose;

const settingSchema = new Schema(
  {
    key: { type: String, default: 'store', unique: true },
    general: {
      storeName: { type: String, default: 'Vimuhet' },
      tagline: { type: String, default: 'Premium Ethnic Wear' },
      logo: { url: String, publicId: String },
      email: { type: String, default: 'care@vimuhet.com' },
      phone: { type: String, default: '+91 90000 00000' },
      whatsapp: { type: String, default: '' },
      address: { type: String, default: '' },
      currency: { type: String, default: 'INR' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      social: {
        instagram: { type: String, default: '' },
        facebook: { type: String, default: '' },
        pinterest: { type: String, default: '' },
        youtube: { type: String, default: '' },
      },
    },
    shipping: {
      shippingCharge: { type: Number, default: 99 },
      freeShippingThreshold: { type: Number, default: 1999 },
      codEnabled: { type: Boolean, default: false },
      deliveryRegions: { type: [String], default: ['India'] },
      returnWindowDays: { type: Number, default: 7 },
      estimatedDeliveryDays: { type: Number, default: 5 },
    },
    payment: {
      provider: { type: String, default: 'razorpay' },
      upiEnabled: { type: Boolean, default: true },
      cardsEnabled: { type: Boolean, default: true },
      netbankingEnabled: { type: Boolean, default: true },
      walletsEnabled: { type: Boolean, default: true },
      codEnabled: { type: Boolean, default: false },
    },
    notifications: {
      orderEmail: { type: Boolean, default: true },
      paymentEmail: { type: Boolean, default: true },
      lowStockAlert: { type: Boolean, default: true },
      registrationEmail: { type: Boolean, default: true },
      reviewAlert: { type: Boolean, default: true },
      lowStockThreshold: { type: Number, default: 5 },
    },
    seo: {
      metaTitle: { type: String, default: 'Vimuhet — Premium Ethnic Wear for Women' },
      metaDescription: { type: String, default: 'Kurtis, kurti sets and designer ethnic wear crafted for every beautiful moment.' },
      keywords: { type: [String], default: ['kurti', 'ethnic wear', 'kurti set', 'designer kurti'] },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

export default mongoose.model('Setting', settingSchema);
