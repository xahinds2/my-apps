import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  username: string;
  text: string;
  createdAt: Date;
}

export const CHANNELS = ['general', 'random', 'tech', 'off-topic'] as const;
export type Channel = typeof CHANNELS[number];

const ChatMessageSchema: Schema = new Schema(
  {
    username: { type: String, required: true, trim: true, maxlength: 32 },
    text: { type: String, trim: true, maxlength: 500, default: '' },
    channel: { type: String, default: 'general', maxlength: 32 },
    attachments: [{ url: String, name: String, fileType: String, size: Number }],
  },
  { timestamps: true }
);

ChatMessageSchema.index({ channel: 1, createdAt: -1 });

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).ChatMessage;
}

export default mongoose.models.ChatMessage ||
  mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema, 'chat_messages');
