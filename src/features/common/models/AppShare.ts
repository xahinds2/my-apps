import mongoose, { Document, Schema } from 'mongoose';

export interface IAppShare extends Document {
  owner: string;
  appname: string;
  public: boolean;
  viewableUsers: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AppShareSchema = new Schema<IAppShare>(
  {
    owner: { type: String, required: true, index: true },
    appname: { type: String, required: true, index: true },
    public: { type: Boolean, default: false },
    viewableUsers: { type: [String], default: [] },
  },
  { timestamps: true }
);

AppShareSchema.index({ owner: 1, appname: 1 }, { unique: true });

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).AppShare;
}

export default mongoose.models.AppShare ||
  mongoose.model<IAppShare>('AppShare', AppShareSchema, 'app_shares');
