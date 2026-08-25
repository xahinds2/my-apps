import mongoose, { Schema, Document } from 'mongoose';

export interface IRegisteredUsername extends Document {
  username: string;
  deviceToken: string;
  lastActiveAt: Date;
  createdAt: Date;
}

const RegisteredUsernameSchema = new Schema(
  {
    username: { type: String, required: true, trim: true, maxlength: 32 },
    deviceToken: { type: String, required: true, maxlength: 64 },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

RegisteredUsernameSchema.index({ username: 1 }, { unique: true });
RegisteredUsernameSchema.index({ deviceToken: 1 }, { unique: true, sparse: true });
// Auto-delete usernames inactive for 24 hours
RegisteredUsernameSchema.index({ lastActiveAt: 1 }, { expireAfterSeconds: 86400 });

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).RegisteredUsername;
}

export default mongoose.models.RegisteredUsername ||
  mongoose.model<IRegisteredUsername>('RegisteredUsername', RegisteredUsernameSchema, 'chat_usernames');
