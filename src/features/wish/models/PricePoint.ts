import mongoose, { Schema, Document } from "mongoose";

// Physical collection — namespaced under the wish app.
const COLLECTION = "wish.pricePoint";

// Append-only price history, ONE point per wish per 3-hour refresh window.
// Replaces the capped
// embedded priceHistory[] on the Wish doc. Stored as a MongoDB time-series
// collection so it scales to unbounded daily points (no 16MB doc ceiling) and
// gets efficient time-range queries for insights + future price alerts.
//
// meta  = { wishId, userId }   (grouped/indexed together by the TS engine)
// time  = date                 (start of the 3-hour window the price was captured)

export interface IPerStorePrice {
  store: string;
  price: number;
}

export interface IPricePoint extends Document {
  date: Date;
  meta: {
    wishId: mongoose.Types.ObjectId;
    userId: string;
  };
  lowestPrice: number;
  lowestStore: string;
  currency: string;
  productCount: number;
  perStore?: IPerStorePrice[];
}

const PricePointSchema = new Schema<IPricePoint>(
  {
    date: { type: Date, required: true },
    meta: {
      wishId: { type: Schema.Types.ObjectId, ref: "Wish", required: true },
      userId: { type: String, required: true },
    },
    lowestPrice:  { type: Number, required: true },
    lowestStore:  { type: String, required: true },
    currency:     { type: String, default: "INR" },
    productCount: { type: Number, default: 0 },
    perStore: [
      {
        _id: false,
        store: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
  },
  {
    collection: COLLECTION,
    timeseries: {
      timeField: "date",
      metaField: "meta",
      granularity: "hours",
    },
    // Auto-drop points older than 2 years — long enough for year-over-year
    // insights, bounded so the series never grows without limit.
    expireAfterSeconds: 2 * 365 * 24 * 60 * 60,
  }
);

// One point per wish per 3-hour window is enforced at the app layer (upsert by
// wishId + window bucket); time-series collections do not support unique indexes.

if (process.env.NODE_ENV === "development") {
  delete (mongoose.models as Record<string, unknown>).PricePoint;
}

export default mongoose.models.PricePoint ||
  mongoose.model<IPricePoint>("PricePoint", PricePointSchema, COLLECTION);
