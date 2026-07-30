import mongoose, { Schema, Document, Types } from 'mongoose';
import { STORES, type GroceryStore } from '../types';

export interface IProductMapping extends Document {
  userId: string;
  itemId: Types.ObjectId;
  itemName: string;
  store: GroceryStore;
  productName: string;
  productUrl?: string;
  createdAt: Date;
}

const ProductMappingSchema: Schema = new Schema(
  {
    userId:      { type: String, required: true },
    itemId:      { type: Schema.Types.ObjectId, required: true, ref: 'GroceryItem' },
    itemName:    { type: String, required: true },
    store:       { type: String, enum: STORES, required: true },
    productName: { type: String, required: true },
    productUrl:  { type: String },
  },
  { timestamps: true }
);

// Multiple mappings allowed per store — one per distinct product (e.g. 250g and 500g Carrot both from Zepto)
ProductMappingSchema.index({ userId: 1, itemId: 1, store: 1, productName: 1 }, { unique: true });

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).ProductMapping;
}

export default mongoose.models.ProductMapping ||
  mongoose.model<IProductMapping>('ProductMapping', ProductMappingSchema, 'grocery_product_mappings');
