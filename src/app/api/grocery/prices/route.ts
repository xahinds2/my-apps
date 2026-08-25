import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import StorePriceEntry from '@/features/grocery/models/StorePriceEntry';
import ProductMapping from '@/features/grocery/models/ProductMapping';
import mongoose from 'mongoose';

export async function GET(req: Request) {
  try {
    const { userId } = await getAuthUser();
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get('itemIds') ?? '';
    const itemIds = raw.split(',').filter(id => mongoose.isValidObjectId(id));

    if (itemIds.length === 0) return NextResponse.json({ data: [] });

    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const objIds = itemIds.map(id => new mongoose.Types.ObjectId(id));
    const mappings = await ProductMapping.find({ userId, itemId: { $in: objIds } }).lean();

    const results: Record<string, unknown>[] = [];

    // Confirmed mapping entries only — no name-based fallback
    if (mappings.length > 0) {
      // Two indexes: exact (with unit) and legacy (without unit, for mappings with unit='')
      const exactIndex = new Map<string, string>();
      const legacyIndex = new Map<string, string>();
      for (const m of mappings) {
        if (m.unit) exactIndex.set(`${m.store}:${m.productName}:${m.unit}`, String(m.itemId));
        else legacyIndex.set(`${m.store}:${m.productName}`, String(m.itemId));
      }
      const confirmed = await StorePriceEntry.find({
        $or: mappings.map(m => ({ store: m.store, productName: m.productName, ...(m.unit ? { unit: m.unit } : {}) })),
      }).sort({ scrapedAt: -1 }).lean();
      const seen = new Set<string>();
      for (const e of confirmed) {
        const itemId = exactIndex.get(`${e.store}:${e.productName}:${e.unit ?? ''}`)
          ?? legacyIndex.get(`${e.store}:${e.productName}`);
        if (!itemId) continue;
        const sKey = `${itemId}:${e.store}:${e.productName}:${e.unit ?? ''}`;
        if (seen.has(sKey)) continue;
        seen.add(sKey);
        results.push({ ...e, itemId });
      }
    }

    return NextResponse.json({ data: results });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
