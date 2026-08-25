import mongoose, { Schema, Document } from 'mongoose';

export interface IChatChannel extends Document {
  name: string;
  createdAt: Date;
}

const ChatChannelSchema: Schema = new Schema(
  { name: { type: String, required: true, trim: true, maxlength: 32, unique: true } },
  { timestamps: true }
);

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).ChatChannel;
}

export default mongoose.models.ChatChannel ||
  mongoose.model<IChatChannel>('ChatChannel', ChatChannelSchema, 'chat_channels');
