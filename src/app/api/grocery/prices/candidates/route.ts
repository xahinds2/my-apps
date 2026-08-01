import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import StorePriceEntry from '@/features/grocery/models/StorePriceEntry';
import ProductMapping from '@/features/grocery/models/ProductMapping';
import GroceryItem from '@/features/grocery/models/GroceryItem';
import mongoose from 'mongoose';

// GET /api/grocery/prices/candidates?itemId=X[&q=search]
// Without q: returns scraped prices already matched to itemId.
// With q: searches all scraped prices by productName and marks which are confirmed for itemId.
export async function GET(req: Request) {
  try {
    const { userId } = await getAuthUser(req);
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');
    const q = searchParams.get('q')?.trim();
    if (!itemId || !mongoose.isValidObjectId(itemId)) {
      return NextResponse.json({ error: 'Invalid itemId' }, { status: 400 });
    }

    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const objItemId = new mongoose.Types.ObjectId(itemId);

    // When no explicit query, fall back to the grocery item's name
    let searchTerm = q;
    if (!searchTerm) {
      const item = await GroceryItem.findById(objItemId).lean();
      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      searchTerm = item.name;
    }
    const term: string = searchTerm!;

    // Tokenise: individual words ≥2 chars so multi-word names like "Basmati Rice" match both tokens
    const tokens = term
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(t => t.length >= 2);

    const mongoQuery =
      tokens.length > 1
        ? { $or: tokens.map(t => ({ productName: { $regex: t, $options: 'i' } })) }
        : { productName: { $regex: term, $options: 'i' } };

    const [entries, mappings] = await Promise.all([
      StorePriceEntry.find(mongoQuery).sort({ scrapedAt: -1 }).lean(),
      ProductMapping.find({ userId, itemId: objItemId }).lean(),
    ]);

    const confirmedSet = new Set(mappings.map(m => `${m.store}:${m.productName}`));

    // Deduplicate: keep only the latest scrape per store+productName
    const deduped = new Map<string, typeof entries[0]>();
    for (const e of entries) {
      const key = `${e.store}:${e.productName}`;
      const existing = deduped.get(key);
      if (!existing || new Date(e.scrapedAt) > new Date(existing.scrapedAt)) deduped.set(key, e);
    }

    const termLower = term.toLowerCase();
    function score(productName: string): number {
      const pLower = productName.toLowerCase();
      const pTokens = pLower.split(/[^a-z0-9]+/).filter(t => t.length >= 2);
      const matchCount = tokens.filter(t => pLower.includes(t)).length;
      if (matchCount === 0) return 0;
      // ratio penalises long names where the matched token is a tiny fraction (e.g. brand names)
      const ratio = matchCount / Math.max(pTokens.length, 1);
      let s = matchCount + ratio * 5;
      if (pLower === termLower) s += 10;
      else if (pLower.startsWith(termLower)) s += 5;
      else if (pLower.includes(termLower)) s += 3;
      return s;
    }

    // Confirmed first → relevance score desc → most recently scraped
    const data = [...deduped.values()]
      .filter(e => score(e.productName) > 0)
      .sort((a, b) => {
        const aC = confirmedSet.has(`${a.store}:${a.productName}`) ? 0 : 1;
        const bC = confirmedSet.has(`${b.store}:${b.productName}`) ? 0 : 1;
        if (aC !== bC) return aC - bC;
        const sd = score(b.productName) - score(a.productName);
        if (sd !== 0) return sd;
        return new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime();
      })
      .slice(0, 100)
      .map(e => ({ ...e, confirmed: confirmedSet.has(`${e.store}:${e.productName}`) }));

    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
