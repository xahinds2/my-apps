import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';

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

// GET /api/products/summary?q=<query>
// Returns cheapest current price, store, product count, and alternatives for a wish query.
// Stateless — does not write to DB. Used for unauthenticated / local-storage users.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  if (!q) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400, headers: corsHeaders() });
  }

  const db = await connectToDatabase();
  if (!db) {
    return NextResponse.json({ productCount: 0, alternatives: [] }, { headers: corsHeaders() });
  }

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const terms = q.toLowerCase().split(/\s+/).filter((t: string) => t.length >= 2);

  const filter: Record<string, unknown> = {
    price: { $exists: true, $gt: 0 },
    $or: [
      { title: { $regex: escaped, $options: 'i' } },
      { category: { $regex: escaped, $options: 'i' } },
      { productType: { $regex: escaped, $options: 'i' } },
      ...(terms.length ? [{ keywords: { $in: terms } }] : []),
    ],
  };

  const [cheapest, productCount] = await Promise.all([
    Product.findOne(filter).sort({ price: 1 }).lean(),
    Product.countDocuments(filter),
  ]);

  // When few exact matches, fetch broader alternatives from partial-term search
  let alternatives: { title: string; price: number; store: string; url: string; image: string }[] = [];
  if (productCount < 3 && terms.length > 1) {
    const broader = await Product.find({
      price: { $exists: true, $gt: 0 },
      image: { $exists: true, $ne: '' },
      $or: terms.map(t => ({
        title: { $regex: t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      })),
    })
      .sort({ price: 1 })
      .limit(6)
      .lean();

    alternatives = broader
      .filter(p => String(p._id) !== String(cheapest?._id))
      .slice(0, 4)
      .map(p => ({
        title: p.title,
        price: p.price!,
        store: p.store,
        url: p.url,
        image: p.image ?? '',
      }));
  }

  if (!cheapest) {
    return NextResponse.json({ productCount: 0, alternatives }, { headers: corsHeaders() });
  }

  return NextResponse.json(
    {
      latestPrice: cheapest.price,
      latestStore: cheapest.store,
      currency: cheapest.currency ?? 'INR',
      productCount,
      alternatives,
    },
    { headers: corsHeaders() }
  );
}
