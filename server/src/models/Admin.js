import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ADMIN_ROLES, ROLE_PERMISSIONS } from '../config/constants.js';

const { Schema } = mongoose;

const loginHistorySchema = new Schema(
  { at: { type: Date, default: Date.now }, ip: String, userAgent: String, success: Boolean },
  { _id: false }
);

const adminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: Object.values(ADMIN_ROLES), default: ADMIN_ROLES.ADMIN },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    avatar: { url: String, publicId: String },
    lastLoginAt: Date,
    loginHistory: { type: [loginHistorySchema], default: [] },
    passwordChangedAt: Date,
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

adminSchema.pre('save', function defaultPermissions() {
  // Permissions always follow the role; individual overrides can be layered on
  // top by an explicit assignment after this hook.
  if (this.isModified('role') || this.isNew || !this.permissions?.length) {
    this.permissions = ROLE_PERMISSIONS[this.role] || [];
  }
});

adminSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

adminSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

adminSchema.methods.hasPermission = function (perm) {
  return this.permissions.includes(perm) || this.role === ADMIN_ROLES.SUPER_ADMIN;
};

export default mongoose.model('Admin', adminSchema);
