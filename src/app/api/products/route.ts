import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';

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

// GET /api/products?q=<query>&page=1&limit=48&store=amazon
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';
  const store = searchParams.get('store')?.trim() || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '48'), 200));
  const skip = (page - 1) * limit;

  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (q) filter.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (store) filter.store = store;

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  return NextResponse.json(
    { data: products, total, page, limit, hasMore: skip + products.length < total },
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

  const ops = items
    .filter((p): p is Record<string, unknown> =>
      typeof p === 'object' && p !== null &&
      typeof (p as Record<string, unknown>).url === 'string' &&
      typeof (p as Record<string, unknown>).title === 'string' &&
      typeof (p as Record<string, unknown>).store === 'string' &&
      typeof (p as Record<string, unknown>).storeProductId === 'string'
    )
    .map(p => {
      // Only $set fields that are actually provided — never overwrite with null
      const fields: Record<string, unknown> = { updatedAt: new Date() };
      for (const [k, v] of Object.entries(p)) {
        if (v !== null && v !== undefined) fields[k] = v;
      }
      return {
        updateOne: {
          filter: { store: p.store, storeProductId: p.storeProductId },
          update: { $set: fields },
          upsert: true,
        },
      };
    });

  if (ops.length === 0) {
    return NextResponse.json({ saved: 0 }, { headers: corsHeaders() });
  }

  try {
    const result = await Product.bulkWrite(ops);
    return NextResponse.json(
      { saved: result.upsertedCount + result.modifiedCount },
      { headers: corsHeaders() }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[products POST]', msg);
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders() });
  }
}
