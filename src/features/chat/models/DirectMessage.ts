import mongoose, { Schema, Document } from 'mongoose';

export interface IDirectMessage extends Document {
  roomId: string;
  from: string;
  to: string;
  text: string;
  createdAt: Date;
}

const DirectMessageSchema = new Schema(
  {
    roomId: { type: String, required: true, maxlength: 70 },
    from: { type: String, required: true, trim: true, maxlength: 32 },
    to: { type: String, required: true, trim: true, maxlength: 32 },
    text: { type: String, trim: true, maxlength: 500, default: '' },
    fromSessionId: { type: String, maxlength: 64 },
    attachments: [{ url: String, name: String, fileType: String, size: Number }],
  },
  { timestamps: true }
);

DirectMessageSchema.index({ roomId: 1, createdAt: 1 });

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).DirectMessage;
}

export default mongoose.models.DirectMessage ||
  mongoose.model<IDirectMessage>('DirectMessage', DirectMessageSchema, 'chat_dms');
