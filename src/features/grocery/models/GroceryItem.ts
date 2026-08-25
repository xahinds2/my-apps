import mongoose, { Schema, Document } from 'mongoose';
import { CATEGORIES, UNITS, type GroceryCategory, type GroceryUnit } from '../types';
export { CATEGORIES, UNITS, type GroceryCategory, type GroceryUnit } from '../types';

export interface IGroceryItem extends Document {
  userId: string;
  name: string;
  category: GroceryCategory;
  unit: GroceryUnit;
  defaultQuantity: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GroceryItemSchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, default: 'other', trim: true, maxlength: 50 },
    unit: { type: String, enum: UNITS, default: 'piece' },
    defaultQuantity: { type: Number, default: 1, min: 0.1, max: 999 },
    note: { type: String, maxlength: 200 },
  },
  { timestamps: true }
);

GroceryItemSchema.index({ userId: 1, createdAt: -1 });

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).GroceryItem;
}

export default mongoose.models.GroceryItem ||
  mongoose.model<IGroceryItem>('GroceryItem', GroceryItemSchema, 'grocery_items');
