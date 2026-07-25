import mongoose, { Schema, Document } from 'mongoose';

export interface IInsurancePolicy {
  id: string;
  name: string;   // person name (grouping key)
  type: string;
  cover: string;
  policy: string;
  expiry: string;
}

export interface IUserInsurance extends Document {
  userId: string;
  policies: IInsurancePolicy[];
}

const InsurancePolicySchema = new Schema<IInsurancePolicy>(
  {
    id:     { type: String, required: true },
    name:   { type: String, required: true, trim: true, maxlength: 100 },
    type:   { type: String, required: true, trim: true, maxlength: 40 },
    cover:  { type: String, default: '', trim: true, maxlength: 40 },
    policy: { type: String, default: '', trim: true, maxlength: 120 },
    expiry: { type: String, default: '', trim: true, maxlength: 40 },
  },
  { _id: false }
);

const UserInsuranceSchema = new Schema<IUserInsurance>(
  {
    userId:   { type: String, required: true, unique: true, index: true },
    policies: { type: [InsurancePolicySchema], default: [] },
  },
  { timestamps: true }
);

export default (mongoose.models.UserInsurance as mongoose.Model<IUserInsurance>) ||
  mongoose.model<IUserInsurance>('UserInsurance', UserInsuranceSchema);
