import mongoose, { Schema, Document } from "mongoose";

// Physical collection name. Namespaced under the wish app so related
// collections group together (wish, wish.product, wish.pricePoint).
const COLLECTION = "wish.product";

// The extension refreshes the catalog every 3 hours. A product survives
// STALE_HOURS without a re-scrape before a TTL index removes it. The 6h value
// keeps a buffer over the 3h refresh so a late or failed run does not expire
// the catalog before replacements land.
const STALE_HOURS = 6;

export type Availability = "in_stock" | "out_of_stock" | "unknown";

export interface IProductSource {
  query?: string;
  pageUrl?: string;
  scrapedAt?: Date;
}

export interface IProduct extends Document {
  // identity — idempotent upsert key
  store: "amazon" | "flipkart" | "myntra" | "nykaa" | "croma";
  storeProductId: string;
  url: string;
  // display
  title: string;
  brand?: string;
  image?: string;
  // pricing (kept flat; mrp/discountPct grow pricing without a breaking change)
  price?: number;
  mrp?: number;
  discountPct?: number;
  currency: string;
  availability: Availability;
  // social proof
  rating?: number;
  reviews?: number;
  // search — DERIVED server-side from title, never trusted from the client
  searchText?: string;
  titleTokens?: string[];
  // cross-store identity — DERIVED server-side (brand|model|capacity). Same
  // real product from different stores shares this key; "" when uncertain.
  canonicalKey?: string;
  // provenance — page/scrape context, not a product attribute
  source?: IProductSource;
  // resilience / forward-compat
  fieldsMissing?: string[];
  schemaVersion?: number;
  raw?: unknown;
  // freshness
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema(
  {
    store:          { type: String, enum: ["amazon", "flipkart", "myntra", "nykaa", "croma"], required: true },
    storeProductId: { type: String, required: true },
    url:            { type: String, required: true },
    title:          { type: String, required: true, trim: true },
    brand:          { type: String, trim: true },
    image:          { type: String },
    price:          { type: Number },
    mrp:            { type: Number },
    discountPct:    { type: Number },
    currency:       { type: String, default: "INR" },
    availability:   { type: String, enum: ["in_stock", "out_of_stock", "unknown"], default: "unknown" },
    rating:         { type: Number },
    reviews:        { type: Number },
    searchText:     { type: String },
    titleTokens:    [{ type: String }],
    canonicalKey:   { type: String },
    source: {
      query:     { type: String },
      pageUrl:   { type: String },
      scrapedAt: { type: Date },
    },
    fieldsMissing:  [{ type: String }],
    schemaVersion:  { type: Number, default: 2 },
    raw:            { type: Schema.Types.Mixed },
    firstSeenAt:    { type: Date, default: Date.now },
    lastSeenAt:     { type: Date, default: Date.now },
  },
  { timestamps: true, collection: COLLECTION }
);

// One record per product per store — idempotent upsert key.
ProductSchema.index({ store: 1, storeProductId: 1 }, { unique: true });
// AND-token match ($all) — the primary search filter.
ProductSchema.index({ titleTokens: 1 });
// Phrase search fallback.
ProductSchema.index({ searchText: "text" });
// Per-store facet + recency sort (round-robin interleave in searchProducts).
ProductSchema.index({ store: 1, updatedAt: -1 });
// Cheapest-in-store lookups (snapshot / summary).
ProductSchema.index({ store: 1, price: 1 });
ProductSchema.index({ brand: 1 });
// Cross-store grouping + cheapest-per-product (compare route). Sparse so the
// many "" (uncanonicalizable) rows do not bloat the index.
ProductSchema.index({ canonicalKey: 1, price: 1 }, { sparse: true });
// TTL: drop products not re-scraped within STALE_HOURS so the catalog self-cleans.
ProductSchema.index({ lastSeenAt: 1 }, { expireAfterSeconds: STALE_HOURS * 60 * 60 });

// In development, drop the cached model so schema changes are picked up on hot reload.
if (process.env.NODE_ENV === "development") {
  delete (mongoose.models as Record<string, unknown>).Product;
}

export default mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema, COLLECTION);
