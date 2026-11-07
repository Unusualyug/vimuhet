import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const addressSchema = new Schema(
  {
    label: { type: String, default: 'Home', enum: ['Home', 'Office', 'Other'] },
    fullName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    house: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    area: { type: String, trim: true, default: '' },
    landmark: { type: String, trim: true, default: '' },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, default: 'India', trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

const userSchema = new Schema(
  {
    fullName: { type: String, required: [true, 'Full name is required'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
    },
    mobile: { type: String, trim: true, default: '', index: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, default: 'customer', immutable: true },
    isEmailVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    avatar: { url: String, publicId: String },
    addresses: [addressSchema],
    wishlistMigratedAt: Date,
    lastLoginAt: Date,
    passwordChangedAt: Date,
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    emailVerifyToken: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },
    marketingOptIn: { type: Boolean, default: true },
    stats: {
      orders: { type: Number, default: 0 },
      spent: { type: Number, default: 0 },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.virtual('defaultAddress').get(function () {
  if (!this.addresses?.length) return null;
  return this.addresses.find((a) => a.isDefault) || this.addresses[0];
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isPasswordChangedAfter = function (jwtIssuedAt) {
  if (!this.passwordChangedAt) return false;
  return Math.floor(this.passwordChangedAt.getTime() / 1000) > jwtIssuedAt;
};

userSchema.index({ createdAt: -1 });
userSchema.index({ fullName: 'text', email: 'text', mobile: 'text' });

export default mongoose.model('User', userSchema);
