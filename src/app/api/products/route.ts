import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Product, { IProduct } from '@/models/Product';
import type { PipelineStage } from 'mongoose';

const ALLOWED_STORES = new Set(['amazon', 'flipkart', 'myntra', 'nykaa', 'croma']);

// Allow Chrome extension origin
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function isAuthorized(req: NextRequest) {
  const token = process.env.SCRAPER_TOKEN;
  if (!token) return true; // dev mode — no token required
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${token}`;
}

function isDuplicateKeyError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const maybeErr = err as { code?: number; writeErrors?: Array<{ code?: number }> };
  if (maybeErr.code === 11000) return true;
  return Array.isArray(maybeErr.writeErrors) && maybeErr.writeErrors.some(e => e?.code === 11000);
}

// GET /api/products?q=<query>&page=1&limit=48&store=amazon
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';
  const store = searchParams.get('store')?.trim() || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '48'), 200));
  const skip = (page - 1) * limit;

  await connectToDatabase();

  const STORE_LIST = [...ALLOWED_STORES];

  const filter: Record<string, unknown> = {
    title: { $exists: true, $ne: '' },
    price: { $exists: true, $gt: 0 },
    image: { $exists: true, $ne: '' },
  };
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const terms = q.toLowerCase().split(/\s+/).filter(t => t.length >= 2);
    filter.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { category: { $regex: escaped, $options: 'i' } },
      { productType: { $regex: escaped, $options: 'i' } },
      ...(terms.length ? [{ keywords: { $in: terms } }] : []),
    ];
  }

  // When a specific store is requested, use simple pagination
  if (store && ALLOWED_STORES.has(store)) {
    const storeFilter = { ...filter, store } as Record<string, unknown>;
    const [products, total] = await Promise.all([
      Product.find(storeFilter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(storeFilter),
    ]);
    return NextResponse.json(
      { data: products, total, page, limit, hasMore: skip + products.length < total },
      { headers: corsHeaders() }
    );
  }

  // No store filter — distribute results evenly across all stores so the
  // most-recently-scraped store doesn't fill the entire first page.
  // Use `limit` per store so that stores with no matches don't reduce the
  // total returned — remaining slots are filled by stores that do have results.
  const perStore = limit;
  const storeSkip = (page - 1) * perStore;

  const facetStages: Record<string, PipelineStage.FacetPipelineStage[]> = {};
  for (const s of STORE_LIST) {
    facetStages[s] = [
      { $match: { ...filter, store: s } },
      { $sort: { updatedAt: -1 } },
      { $skip: storeSkip },
      { $limit: perStore },
    ];
  }

  // Per-store counts needed for total and hasMore (not returned to client)
  const [facetResult, storeCountArr] = await Promise.all([
    Product.aggregate<Record<string, Record<string, unknown>[]>>([{ $facet: facetStages }]),
    Promise.all(STORE_LIST.map(s => Product.countDocuments({ ...filter, store: s } as Record<string, unknown>))),
  ]);

  const total = storeCountArr.reduce((a, b) => a + b, 0);
  const hasMore = STORE_LIST.some((_, i) => storeSkip + perStore < storeCountArr[i]);

  // Round-robin interleave: amazon, flipkart, myntra, nykaa, croma, amazon, ...
  const buckets = STORE_LIST.map(s => facetResult[0]?.[s] ?? []);
  const mixed: Record<string, unknown>[] = [];
  const maxLen = Math.max(...buckets.map(b => b.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const bucket of buckets) {
      if (i < bucket.length) mixed.push(bucket[i]);
    }
  }

  return NextResponse.json(
    { data: mixed.slice(0, limit), total, page, limit, hasMore },
    { headers: corsHeaders() }
  );
}

// POST /api/products — upsert one or many products from the extension
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
  }

  let body: { products?: unknown[]; [k: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders() });
  }

  const items: unknown[] = Array.isArray(body.products) ? body.products : [body];

  await connectToDatabase();

  const validItems = items
    .filter((p): p is Record<string, unknown> =>
      typeof p === 'object' && p !== null &&
      typeof (p as Record<string, unknown>).url === 'string' &&
      typeof (p as Record<string, unknown>).title === 'string' && String((p as Record<string, unknown>).title).trim() !== '' &&
      typeof (p as Record<string, unknown>).store === 'string' &&
      typeof (p as Record<string, unknown>).storeProductId === 'string' &&
      typeof (p as Record<string, unknown>).image === 'string' && String((p as Record<string, unknown>).image).trim() !== '' &&
      (p as Record<string, unknown>).price !== null && (p as Record<string, unknown>).price !== undefined && String((p as Record<string, unknown>).price).trim() !== ''
    )
    .filter(p => ALLOWED_STORES.has(String(p.store)));

  // Last-write-wins dedupe within a single request payload to avoid same-key upsert races.
  const deduped = new Map<string, Record<string, unknown>>();
  for (const p of validItems) {
    const store = String(p.store).trim();
    const storeProductId = String(p.storeProductId).trim();
    if (!store || !storeProductId) continue;
    deduped.set(`${store}::${storeProductId}`, {
      ...p,
      store,
      storeProductId,
      title: String(p.title).trim(),
      url: String(p.url).trim(),
      ...(typeof p.category === 'string' && p.category.trim()
        ? { category: p.category.trim().toLowerCase() }
        : {}),
      ...(typeof p.brand === 'string' && p.brand.trim()
        ? { brand: p.brand.trim() }
        : {}),
      ...(typeof p.productType === 'string' && p.productType.trim()
        ? { productType: p.productType.trim().toLowerCase() }
        : {}),
      ...(Array.isArray(p.keywords) && p.keywords.length
        ? { keywords: (p.keywords as string[]).map((k: string) => k.toLowerCase().trim()).filter((k: string) => k.length >= 2) }
        : {}),
    });
  }

  // Whitelist of fields allowed into the DB.
  // To add a new field: add it here + to the schema in Product.ts.
  const ALLOWED_FIELDS = new Set([
    'store', 'storeProductId', 'title', 'url',
    'price', 'currency', 'image',
    'rating', 'reviews',
    'brand', 'category', 'productType', 'keywords',
  ]);

  const ops = Array.from(deduped.values()).map(p => {
    // Only $set whitelisted fields that are actually provided — never overwrite with null
    const fields: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(p)) {
      if (ALLOWED_FIELDS.has(k) && v !== null && v !== undefined) fields[k] = v;
    }
    return {
      updateOne: {
        filter: { store: p.store as IProduct['store'], storeProductId: p.storeProductId as string },
        update: { $set: fields },
        upsert: true,
      },
    };
  });

  if (ops.length === 0) {
    return NextResponse.json({ saved: 0 }, { headers: corsHeaders() });
  }

  try {
    const result = await Product.bulkWrite(ops, { ordered: false });
    return NextResponse.json(
      { saved: result.upsertedCount + result.modifiedCount },
      { headers: corsHeaders() }
    );
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      // In concurrent upserts, unique index may reject a competing insert; retry as pure updates.
      const updateOnlyOps = ops.map(op => ({
        updateOne: {
          ...op.updateOne,
          upsert: false,
        },
      }));
      const retry = await Product.bulkWrite(updateOnlyOps, { ordered: false });
      return NextResponse.json(
        { saved: retry.modifiedCount },
        { headers: corsHeaders() }
      );
    }

    const msg = err instanceof Error ? err.message : String(err);
    console.error('[products POST]', msg);
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders() });
  }
}
