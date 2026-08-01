import mongoose, { Schema, Document } from 'mongoose';
import { STORES, type GroceryStore } from '../types';
export { STORES, type GroceryStore } from '../types';

export interface IStorePriceEntry extends Document {
  store: GroceryStore;
  price: number;
  unit: string;
  productName: string;
  productUrl?: string;
  imageUrl?: string;
  scrapedAt: Date;
}

const StorePriceEntrySchema: Schema = new Schema({
  store: { type: String, enum: STORES, required: true },
  price: { type: Number, required: true, min: 0 },
  unit: { type: String, default: '' },
  productName: { type: String, required: true },
  productUrl:  { type: String },
  imageUrl:    { type: String },
  scrapedAt:   { type: Date, default: Date.now },
});

// One price per product name+store+unit — shared across all users
StorePriceEntrySchema.index({ store: 1, productName: 1, unit: 1 }, { unique: true });

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).StorePriceEntry;
}

export default mongoose.models.StorePriceEntry ||
  mongoose.model<IStorePriceEntry>('StorePriceEntry', StorePriceEntrySchema, 'grocery_prices');
