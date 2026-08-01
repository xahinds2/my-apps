import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICartSessionItem {
  itemId: Types.ObjectId;
  itemName: string;
  quantity: number;
  addedAt: Date;
}

export interface ICartSession extends Document {
  userId: string;
  name: string;
  cartType: 'main' | 'zepto' | 'instamart' | 'flipkart_minutes' | 'amazon_fresh' | null;
  status: 'active' | 'completed';
  items: ICartSessionItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CartSessionItemSchema: Schema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, required: true, ref: 'GroceryItem' },
    itemName: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 0.1, max: 999 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CartSessionSchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    cartType: { type: String, enum: ['main', 'zepto', 'instamart', 'flipkart_minutes', 'amazon_fresh', null], default: null },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    items: { type: [CartSessionItemSchema], default: [] },
  },
  { timestamps: true }
);

CartSessionSchema.index({ userId: 1, createdAt: -1 });

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).CartSession;
}

export default mongoose.models.CartSession ||
  mongoose.model<ICartSession>('CartSession', CartSessionSchema, 'grocery_carts');
