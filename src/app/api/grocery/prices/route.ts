import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import StorePriceEntry from '@/features/grocery/models/StorePriceEntry';
import ProductMapping from '@/features/grocery/models/ProductMapping';
import GroceryItem from '@/features/grocery/models/GroceryItem';
import { STORES } from '@/features/grocery/types';
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
    const [groceryItems, mappings] = await Promise.all([
      GroceryItem.find({ _id: { $in: objIds } }).lean(),
      ProductMapping.find({ userId, itemId: { $in: objIds } }).lean(),
    ]);

    const results: Record<string, unknown>[] = [];

    // Confirmed mapping entries
    if (mappings.length > 0) {
      const mappingIndex = new Map<string, string>();
      for (const m of mappings) mappingIndex.set(`${m.store}:${m.productName}`, String(m.itemId));
      const confirmed = await StorePriceEntry.find({
        $or: mappings.map(m => ({ store: m.store, productName: m.productName })),
      }).lean();
      for (const e of confirmed) {
        const itemId = mappingIndex.get(`${e.store}:${e.productName}`);
        if (itemId) results.push({ ...e, itemId });
      }
    }

    // Confirmed stores per item — fallback only fills stores that have no confirmed mapping
    const confirmedStoresByItem = new Map<string, Set<string>>();
    for (const m of mappings) {
      const key = String(m.itemId);
      if (!confirmedStoresByItem.has(key)) confirmedStoresByItem.set(key, new Set());
      confirmedStoresByItem.get(key)!.add(m.store);
    }

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
    const needsCandidates = groceryItems.filter(i =>
      STORES.some(s => !confirmedStoresByItem.get(String(i._id))?.has(s))
    );

    if (needsCandidates.length > 0) {
      const candidates = await StorePriceEntry.find({
        $or: needsCandidates.map(i => ({ productName: { $regex: i.name, $options: 'i' } })),
      }).sort({ scrapedAt: -1 }).lean();

      // Best candidate per item+store, skipping stores already covered by a confirmed mapping
      const seen = new Set<string>();
      for (const entry of candidates) {
        for (const item of needsCandidates) {
          if (confirmedStoresByItem.get(String(item._id))?.has(entry.store)) continue;
          if (!norm(entry.productName).includes(norm(item.name))) continue;
          const key = `${String(item._id)}:${entry.store}`;
          if (seen.has(key)) continue;
          seen.add(key);
          results.push({ ...entry, itemId: String(item._id) });
          break;
        }
      }
    }

    return NextResponse.json({ data: results });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
