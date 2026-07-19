import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  title: string;
  price?: number;
  currency: string;
  image?: string;
  url: string;
  store: 'amazon' | 'flipkart' | 'myntra' | 'nykaa' | 'croma';
  storeProductId: string;   // store-specific stable ID
  rating?: number;
  reviews?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema(
  {
    title:          { type: String, required: true, trim: true },
    price:          { type: Number },
    currency:       { type: String, default: 'INR' },
    image:          { type: String },
    url:            { type: String, required: true },
    store:          { type: String, enum: ['amazon', 'flipkart', 'myntra', 'nykaa', 'croma'], required: true },
    storeProductId: { type: String, required: true },
    rating:         { type: Number },
    reviews:        { type: Number },
  },
  { timestamps: true }
);

// Compound unique key: one record per product per store
ProductSchema.index({ store: 1, storeProductId: 1 }, { unique: true });
// Fast title search
ProductSchema.index({ title: 'text' });

// In development, delete the cached model so schema changes are picked up on hot reload
if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).Product;
}

export default mongoose.model<IProduct>('Product', ProductSchema);
