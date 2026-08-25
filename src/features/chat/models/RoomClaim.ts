import mongoose, { Schema, Document } from 'mongoose';

export interface IRoomClaim extends Document {
  roomId: string;
  username: string;
  sessionId: string;
  createdAt: Date;
}

const RoomClaimSchema = new Schema(
  {
    roomId:    { type: String, required: true, maxlength: 70 },
    username:  { type: String, required: true, maxlength: 32 },
    sessionId: { type: String, required: true, maxlength: 64 },
  },
  { timestamps: true }
);

// One claim per (room, username) — first claimant wins
RoomClaimSchema.index({ roomId: 1, username: 1 }, { unique: true });

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).RoomClaim;
}

export default mongoose.models.RoomClaim ||
  mongoose.model<IRoomClaim>('RoomClaim', RoomClaimSchema, 'chat_room_claims');
