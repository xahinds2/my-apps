import mongoose, { Schema, Document } from 'mongoose';

export interface IManifestLink {
  url: string;
  label?: string;
}

export interface IManifestItem extends Document {
  userId: string;
  text: string;
  links: IManifestLink[];
  image?: string;
  budget?: string;
  timeline?: string;
  status?: 'pending' | 'bought' | 'skipped';
  priority?: 'must' | 'nice' | 'maybe';
  note?: string;
  createdAt: Date;
}

const ManifestLinkSchema: Schema = new Schema({
  url: { type: String, required: true },
  label: { type: String },
}, { _id: false });

const ManifestItemSchema: Schema = new Schema({
  userId: { type: String, required: true },
  text: { type: String, required: true, trim: true },
  links: { type: [ManifestLinkSchema], default: [] },
  image: { type: String },
  budget: { type: String },
  timeline: { type: String },
  status: { type: String, enum: ['pending', 'bought', 'skipped'], default: 'pending' },
  priority: { type: String, enum: ['must', 'nice', 'maybe'] },
  note: { type: String },
  createdAt: { type: Date, default: Date.now },
});

ManifestItemSchema.index({ userId: 1, createdAt: -1 });

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).ManifestItem;
}

export default mongoose.models.ManifestItem || mongoose.model<IManifestItem>('ManifestItem', ManifestItemSchema, 'wishes');