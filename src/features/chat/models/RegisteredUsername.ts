import mongoose, { Schema, Document } from 'mongoose';

export interface IRegisteredUsername extends Document {
  username: string;
  createdAt: Date;
}

const RegisteredUsernameSchema = new Schema(
  { username: { type: String, required: true, trim: true, maxlength: 32 } },
  { timestamps: true }
);

RegisteredUsernameSchema.index({ username: 1 }, { unique: true });

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).RegisteredUsername;
}

export default mongoose.models.RegisteredUsername ||
  mongoose.model<IRegisteredUsername>('RegisteredUsername', RegisteredUsernameSchema, 'chat_usernames');
