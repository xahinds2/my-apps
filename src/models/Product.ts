import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  title: string;
  price?: number;
  currency: string;
  image?: string;
  url: string;
  store: 'amazon' | 'flipkart';
  rating?: number;
  reviews?: number;
  asin?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema(
  {
    title:    { type: String, required: true, trim: true },
    price:    { type: Number },
    currency: { type: String, default: 'INR' },
    image:    { type: String },
    url:      { type: String, required: true, unique: true },
    store:    { type: String, enum: ['amazon', 'flipkart'], required: true },
    rating:   { type: Number },
    reviews:  { type: Number },
    asin:     { type: String },
  },
  { timestamps: true }
);

// Full-text index for search
ProductSchema.index({ title: 'text' });

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
