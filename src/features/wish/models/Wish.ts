import mongoose, { Schema, Document } from 'mongoose';

export interface IWishLink {
  url: string;
  label?: string;
}

export interface IWish extends Document {
  userId: string;
  text: string;
  links: IWishLink[];
  image?: string;
  budget?: string;
  timeline?: string;
  status?: 'pending' | 'bought' | 'skipped';
  priority?: 'must' | 'nice' | 'maybe';
  note?: string;
  createdAt: Date;
}

const WishLinkSchema: Schema = new Schema({
  url: { type: String, required: true },
  label: { type: String },
}, { _id: false });

const WishSchema: Schema = new Schema({
  userId: { type: String, required: true },
  text: { type: String, required: true, trim: true },
  links: { type: [WishLinkSchema], default: [] },
  image: { type: String },
  budget: { type: String },
  timeline: { type: String },
  status: { type: String, enum: ['pending', 'bought', 'skipped'], default: 'pending' },
  priority: { type: String, enum: ['must', 'nice', 'maybe'] },
  note: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// List render: fetch a user's wishes newest-first without an in-memory sort.
WishSchema.index({ userId: 1, createdAt: -1 });

// In development, drop the cached model so schema changes are picked up on hot reload.
if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).Wish;
}

export default mongoose.models.Wish || mongoose.model<IWish>('Wish', WishSchema);
