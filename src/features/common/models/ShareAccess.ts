import mongoose, { Document, Schema } from 'mongoose';

export const SHARE_RESOURCE_TYPES = [
  'manifest_item',
  'manifest_collection',
  'budget_plan',
  'user_insurance',
  'user_milestones',
] as const;

export type ShareResourceType = (typeof SHARE_RESOURCE_TYPES)[number];

export const SHARE_VISIBILITIES = ['private', 'restricted', 'public'] as const;

export type ShareVisibility = (typeof SHARE_VISIBILITIES)[number];

export interface IShareAccess extends Document {
  ownerUserId: string;
  resourceType: ShareResourceType;
  resourceId: string;
  visibility: ShareVisibility;
  allowedUserIds: string[];
  tokenHash?: string;
  expiresAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ShareAccessSchema = new Schema<IShareAccess>(
  {
    ownerUserId: { type: String, required: true, index: true },
    resourceType: {
      type: String,
      required: true,
      enum: SHARE_RESOURCE_TYPES,
      index: true,
    },
    resourceId: { type: String, required: true, index: true },
    visibility: {
      type: String,
      required: true,
      enum: SHARE_VISIBILITIES,
      default: 'private',
      index: true,
    },
    allowedUserIds: { type: [String], default: [] },
    tokenHash: { type: String, index: true },
    expiresAt: { type: Date, index: true },
    revokedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

ShareAccessSchema.index(
  { ownerUserId: 1, resourceType: 1, resourceId: 1 },
  { unique: true }
);

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).ShareAccess;
}

export default (mongoose.models.ShareAccess as mongoose.Model<IShareAccess>) ||
  mongoose.model<IShareAccess>('ShareAccess', ShareAccessSchema, 'share_access');
