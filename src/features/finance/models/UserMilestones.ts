import mongoose, { Schema, Document } from 'mongoose';

export interface IMilestoneItem {
  id: string;
  label: string;
  current: number;
  goal: number;
  color: string;
}

export interface IUserMilestones extends Document {
  userId: string;
  milestones: IMilestoneItem[];
}

const MilestoneItemSchema = new Schema<IMilestoneItem>(
  {
    id:      { type: String, required: true },
    label:   { type: String, required: true, trim: true, maxlength: 100 },
    current: { type: Number, default: 0, min: 0 },
    goal:    { type: Number, required: true, min: 1 },
    color:   { type: String, default: '#60a5fa', maxlength: 20 },
  },
  { _id: false }
);

const UserMilestonesSchema = new Schema<IUserMilestones>(
  {
    userId:     { type: String, required: true, unique: true, index: true },
    milestones: { type: [MilestoneItemSchema], default: [] },
  },
  { timestamps: true }
);

export default (mongoose.models.UserMilestones as mongoose.Model<IUserMilestones>) ||
  mongoose.model<IUserMilestones>('UserMilestones', UserMilestonesSchema);
