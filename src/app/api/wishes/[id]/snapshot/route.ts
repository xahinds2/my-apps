import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import Wish from '@/models/Wish';
import Product from '@/models/Product';

const HISTORY_LIMIT = 180; // one entry per day × ~6 months
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

// POST /api/wishes/:id/snapshot
// Queries the Product collection for the wish's text, appends the cheapest price
// to the wish's price history, and returns the current snapshot plus the 6-month low.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await getAuthUser();

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const wish = await Wish.findOne({ _id: id, userId });
    if (!wish) {
      return NextResponse.json({ error: 'Wish not found' }, { status: 404 });
    }

    const q = wish.text;
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

    // Alternatives when few or no exact matches
    let alternatives: { title: string; price: number; store: string; url: string; image: string }[] = [];
    if (productCount < 3 && terms.length > 1) {
      const broader = await Product.find({
        price: { $exists: true, $gt: 0 },
        image: { $exists: true, $ne: '' },
        $or: terms.map((t: string) => ({
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

    if (!cheapest?.price) {
      await Wish.updateOne(
        { _id: id, userId },
        { priceSnapshot: { productCount: 0, checkedAt: new Date() } }
      );
      return NextResponse.json({ productCount: 0, alternatives });
    }

    // Append new price entry, cap at HISTORY_LIMIT
    const entry = { price: cheapest.price, store: cheapest.store, date: new Date() };
    const history: { price: number; store: string; date: Date }[] = [
      ...(wish.priceHistory ?? []),
      entry,
    ].slice(-HISTORY_LIMIT);

    // Compute 6-month low from updated history
    const sixMonthsAgo = new Date(Date.now() - SIX_MONTHS_MS);
    const recent = history.filter(h => h.date >= sixMonthsAgo);
    const minEntry = recent.length
      ? recent.reduce((m, h) => (h.price < m.price ? h : m), recent[0])
      : null;

    const snapshot = {
      latestPrice: cheapest.price,
      latestStore: cheapest.store,
      currency: cheapest.currency ?? 'INR',
      productCount,
      checkedAt: new Date(),
    };

    await Wish.updateOne(
      { _id: id, userId },
      { priceSnapshot: snapshot, priceHistory: history }
    );

    return NextResponse.json({
      latestPrice: cheapest.price,
      latestStore: cheapest.store,
      currency: cheapest.currency ?? 'INR',
      productCount,
      lowestPrice6m: minEntry?.price ?? null,
      lowestStore6m: minEntry?.store ?? null,
      lowestDate6m: minEntry?.date ?? null,
      alternatives,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
