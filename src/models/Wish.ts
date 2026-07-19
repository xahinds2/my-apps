import mongoose, { Schema, Document } from 'mongoose';

export interface IWish extends Document {
  userId: string;
  text: string;
  createdAt: Date;
}

const WishSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Wish || mongoose.model<IWish>('Wish', WishSchema);
