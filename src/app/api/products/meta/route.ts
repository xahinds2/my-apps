import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';

const ALLOWED_STORES = ['amazon', 'flipkart', 'myntra', 'nykaa', 'croma'];

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// GET /api/products/meta?q=<query>
// Returns per-store counts and total for the given query. Lightweight — no product data.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  await connectToDatabase();

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

  const counts = await Promise.all(
    ALLOWED_STORES.map(s => Product.countDocuments({ ...filter, store: s } as Record<string, unknown>))
  );

  const storeCounts = Object.fromEntries(ALLOWED_STORES.map((s, i) => [s, counts[i]]));
  const total = counts.reduce((a, b) => a + b, 0);

  return NextResponse.json({ storeCounts, total }, { headers: corsHeaders() });
}
