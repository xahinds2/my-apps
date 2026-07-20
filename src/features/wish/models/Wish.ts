import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceHistoryEntry {
  price: number;
  store: string;
  date: Date;
}

export interface IPriceSnapshot {
  latestPrice?: number;
  latestStore?: string;
  currency?: string;
  productCount?: number;
  checkedAt?: Date;
}

export interface IWish extends Document {
  userId: string;
  text: string;
  createdAt: Date;
  priceSnapshot?: IPriceSnapshot;
  priceHistory?: IPriceHistoryEntry[];
}

const WishSchema: Schema = new Schema({
  userId: { type: String, required: true },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
  priceSnapshot: {
    latestPrice: Number,
    latestStore: String,
    currency: { type: String, default: 'INR' },
    productCount: Number,
    checkedAt: Date,
  },
  priceHistory: [{
    price: { type: Number, required: true },
    store: { type: String, required: true },
    date: { type: Date, default: Date.now },
  }],
});

// List render: fetch a user's wishes newest-first without an in-memory sort.
WishSchema.index({ userId: 1, createdAt: -1 });

// In development, drop the cached model so schema changes are picked up on hot reload.
if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).Wish;
}

export default mongoose.models.Wish || mongoose.model<IWish>('Wish', WishSchema);
