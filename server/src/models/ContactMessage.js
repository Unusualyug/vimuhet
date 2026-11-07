import mongoose from 'mongoose';

const { Schema } = mongoose;

const contactSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    mobile: { type: String, default: '' },
    subject: { type: String, required: true },
    message: { type: String, required: true, maxlength: 3000 },
    status: { type: String, enum: ['NEW', 'IN_PROGRESS', 'RESOLVED'], default: 'NEW' },
    adminReply: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('ContactMessage', contactSchema);
