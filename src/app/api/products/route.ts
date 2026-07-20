import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Product, { IProduct } from "@/features/wish/models/Product";
import { ALLOWED_STORES, searchProducts, deriveSearch, deriveCanonicalKey, normalizeWhitespace } from "@/features/wish/productQuery";

const SCHEMA_VERSION = 2;
// Upper bound on products accepted in one request, so a single call cannot
// enqueue an unbounded bulkWrite. Reject (not truncate) so the client knows to
// split the batch rather than silently losing items.
const MAX_BATCH = 500;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function isAuthorized(req: NextRequest) {
  const token = process.env.SCRAPER_TOKEN;
  if (!token) return true; // dev mode — no token required
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${token}`;
}

function isDuplicateKeyError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const maybeErr = err as { code?: number; writeErrors?: Array<{ code?: number }> };
  if (maybeErr.code === 11000) return true;
  return Array.isArray(maybeErr.writeErrors) && maybeErr.writeErrors.some((e) => e?.code === 11000);
}

// Parse a positive integer query param with a fallback; guards against NaN from
// non-numeric input (e.g. ?page=abc).
function toInt(value: string | null, fallback: number): number {
  const n = parseInt(value || "", 10);
  return Number.isFinite(n) ? n : fallback;
}

// GET /api/products?q=<query>&page=1&limit=48&store=amazon
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const store = searchParams.get("store")?.trim() || "";
  const page = Math.max(1, toInt(searchParams.get("page"), 1));
  const limit = Math.max(1, Math.min(toInt(searchParams.get("limit"), 48), 200));

  await connectToDatabase();

  const result = await searchProducts({ q, store, page, limit });
  return NextResponse.json(result, { headers: corsHeaders() });
}

// Numeric coercion for soft fields; returns null when unparseable. Handles
// currency-formatted strings: drops digit-group commas ("64,499" -> "64499"),
// then extracts the FIRST number token so a stray period in the prefix (e.g.
// "Rs. 1,499.00") cannot leak into the value. Naively stripping [^0-9.] left
// that period in place and produced 0.1499.
function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const m = v.replace(/,/g, "").match(/\d+(\.\d+)?/);
    if (!m) return null;
    const n = parseFloat(m[0]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// POST /api/products — upsert one or many products from the extension.
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders() });
  }

  let body: { products?: unknown[]; source?: { query?: string; pageUrl?: string }; schemaVersion?: number; [k: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders() });
  }

  const items: unknown[] = Array.isArray(body.products) ? body.products : [body];

  if (items.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Batch too large: ${items.length} > ${MAX_BATCH}` },
      { status: 413, headers: corsHeaders() }
    );
  }

  const clientVersion = typeof body.schemaVersion === "number" ? body.schemaVersion : SCHEMA_VERSION;
  const pageSource = body.source && typeof body.source === "object" ? body.source : {};
  const scrapedAt = new Date();

  await connectToDatabase();

  let skipped = 0;
  const softMissing: Record<string, number> = {};

  // Build one upsert doc per item. HARD-required: store, storeProductId, url,
  // title. Everything else is soft — a missing soft field is recorded, never a
  // reason to drop the product.
  const deduped = new Map<string, { fields: Record<string, unknown>; missing: string[] }>();

  for (const raw of items) {
    if (!raw || typeof raw !== "object") { skipped++; continue; }
    const p = raw as Record<string, unknown>;

    const store = typeof p.store === "string" ? p.store.trim() : "";
    const storeProductId = typeof p.storeProductId === "string" ? p.storeProductId.trim() : "";
    const url = typeof p.url === "string" ? p.url.trim() : "";
    const title = typeof p.title === "string" ? normalizeWhitespace(p.title) : "";

    if (!store || !ALLOWED_STORES.has(store) || !storeProductId || !url || !title) {
      skipped++;
      continue;
    }

    const { searchText, titleTokens } = deriveSearch(title);
    const brandHint = typeof p.brand === "string" ? p.brand : "";
    const canonicalKey = deriveCanonicalKey(title, brandHint);
    const missing: string[] = [];

    const fields: Record<string, unknown> = {
      store,
      storeProductId,
      url,
      title,
      searchText,
      titleTokens,
      // Only stored when non-empty: a stored "" is a value, not "missing", and
      // would defeat the sparse { canonicalKey, price } index.
      ...(canonicalKey ? { canonicalKey } : {}),
      currency: typeof p.currency === "string" && p.currency.trim() ? p.currency.trim() : "INR",
      source: {
        query: typeof pageSource.query === "string" ? pageSource.query : undefined,
        pageUrl: typeof pageSource.pageUrl === "string" ? pageSource.pageUrl : undefined,
        scrapedAt,
      },
      schemaVersion: SCHEMA_VERSION,
      // Drives the recency sort in GET; also bumped as lastSeenAt below so the
      // TTL index does not expire a product that is still being re-scraped.
      updatedAt: scrapedAt,
      lastSeenAt: scrapedAt,
    };

    const price = toNumber(p.price);
    if (price !== null && price > 0) fields.price = price; else missing.push("price");

    const image = typeof p.image === "string" && p.image.trim() ? p.image.trim() : null;
    if (image) fields.image = image; else missing.push("image");

    const brand = typeof p.brand === "string" && p.brand.trim() ? p.brand.trim() : null;
    if (brand) fields.brand = brand;

    const rating = toNumber(p.rating);
    if (rating !== null && rating > 0) fields.rating = rating;

    const reviews = toNumber(p.reviews);
    if (reviews !== null && reviews > 0) fields.reviews = reviews;

    const mrp = toNumber(p.mrp);
    if (mrp !== null && mrp > 0) fields.mrp = mrp;

    // Unknown/newer client shape: stash the raw item so nothing is silently lost.
    if (clientVersion > SCHEMA_VERSION) fields.raw = p;

    if (missing.length) fields.fieldsMissing = missing;
    for (const m of missing) softMissing[m] = (softMissing[m] || 0) + 1;

    deduped.set(`${store}::${storeProductId}`, { fields, missing });
  }

  // firstSeenAt is written only on insert so a re-scrape never resets it;
  // lastSeenAt (in $set) is what the TTL index watches.
  const ops = Array.from(deduped.values()).map(({ fields }) => ({
    updateOne: {
      filter: { store: fields.store as IProduct["store"], storeProductId: fields.storeProductId as string },
      update: { $set: fields, $setOnInsert: { firstSeenAt: scrapedAt } },
      upsert: true,
    },
  }));

  if (ops.length === 0) {
    return NextResponse.json({ saved: 0, skipped, softMissing }, { headers: corsHeaders() });
  }

  try {
    const result = await Product.bulkWrite(ops, { ordered: false });
    return NextResponse.json(
      { saved: result.upsertedCount + result.modifiedCount, skipped, softMissing },
      { headers: corsHeaders() }
    );
  } catch (err) {
    // A duplicate-key error here means two concurrent upserts raced to insert the
    // same {store, storeProductId}. The row now exists, so retrying the SAME
    // upsert ops resolves to updates — without dropping any genuinely-new items.
    if (isDuplicateKeyError(err)) {
      const retry = await Product.bulkWrite(ops, { ordered: false });
      return NextResponse.json(
        { saved: retry.upsertedCount + retry.modifiedCount, skipped, softMissing },
        { headers: corsHeaders() }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[products POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders() });
  }
}
