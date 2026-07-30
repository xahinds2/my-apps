import mongoose, { Schema, Document, Types } from 'mongoose';
import { STORES, type GroceryStore } from '../types';

export interface IPriceCandidate extends Document {
  userId: string;
  itemId: Types.ObjectId;
  itemName: string;
  store: GroceryStore;
  productName: string;
  productUrl?: string;
  price: number;
  unit: string;
  scrapedAt: Date;
}

const PriceCandidateSchema: Schema = new Schema({
  userId:      { type: String, required: true },
  itemId:      { type: Schema.Types.ObjectId, required: true, ref: 'GroceryItem' },
  itemName:    { type: String, required: true },
  store:       { type: String, enum: STORES, required: true },
  productName: { type: String, required: true },
  productUrl:  { type: String },
  price:       { type: Number, required: true, min: 0 },
  unit:        { type: String, default: '' },
  scrapedAt:   { type: Date, default: Date.now },
});

// One row per scraped product per grocery item per store per user
PriceCandidateSchema.index({ userId: 1, itemId: 1, store: 1, productName: 1 }, { unique: true });
PriceCandidateSchema.index({ userId: 1, itemId: 1 });

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).PriceCandidate;
}

export default mongoose.models.PriceCandidate ||
  mongoose.model<IPriceCandidate>('PriceCandidate', PriceCandidateSchema, 'grocery_price_candidates');
