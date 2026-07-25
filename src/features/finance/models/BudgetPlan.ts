import mongoose, { Schema, Document } from 'mongoose';

export interface IBudgetItem {
  id: string;
  name: string;
  order: number;
  amounts: number[]; // length 12 — index 0 = Jan, 11 = Dec
}

export interface IBudgetCategory {
  id: string;
  name: string;
  color: 'blue' | 'green' | 'red' | 'purple' | 'yellow' | 'gray';
  order: number;
  items: IBudgetItem[];
}

export interface IBudgetPlan extends Document {
  userId: string;
  year: number;
  incomes: number[]; // length 12
  categories: IBudgetCategory[];
  createdAt: Date;
  updatedAt: Date;
}

const BudgetItemSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    order: { type: Number, default: 0 },
    amounts: { type: [Number], default: () => Array(12).fill(0) },
  },
  { _id: false }
);

const BudgetCategorySchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    color: {
      type: String,
      enum: ['blue', 'green', 'red', 'purple', 'yellow', 'gray'],
      default: 'blue',
    },
    order: { type: Number, default: 0 },
    items: { type: [BudgetItemSchema], default: [] },
  },
  { _id: false }
);

const BudgetPlanSchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    year: { type: Number, required: true, min: 2020, max: 2100 },
    incomes: { type: [Number], default: () => Array(12).fill(0) },
    categories: { type: [BudgetCategorySchema], default: [] },
  },
  { timestamps: true }
);

BudgetPlanSchema.index({ userId: 1, year: 1 }, { unique: true });

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).BudgetPlan;
}

export default mongoose.models.BudgetPlan ||
  mongoose.model<IBudgetPlan>('BudgetPlan', BudgetPlanSchema, 'budget_plans');
