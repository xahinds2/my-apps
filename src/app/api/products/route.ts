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

// GET /api/products?q=<query>&limit=20
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 48);

  await connectToDatabase();

  let products;
  if (q) {
    products = await Product.find(
      { title: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
    )
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();
  } else {
    products = await Product.find().sort({ updatedAt: -1 }).limit(limit).lean();
  }

  return NextResponse.json({ data: products }, { headers: corsHeaders() });
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
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null && typeof (p as Record<string, unknown>).url === 'string' && typeof (p as Record<string, unknown>).title === 'string')
    .map(p => ({
      updateOne: {
        filter: { url: p.url },
        update: { $set: { ...p, updatedAt: new Date() } },
        upsert: true,
      },
    }));

  if (ops.length === 0) {
    return NextResponse.json({ saved: 0 }, { headers: corsHeaders() });
  }

  const result = await Product.bulkWrite(ops);
  return NextResponse.json(
    { saved: result.upsertedCount + result.modifiedCount },
    { headers: corsHeaders() }
  );
}
