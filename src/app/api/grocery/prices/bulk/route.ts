import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import GroceryItem from '@/features/grocery/models/GroceryItem';
import StorePriceEntry, { STORES } from '@/features/grocery/models/StorePriceEntry';
import mongoose from 'mongoose';

interface ScrapedProduct {
  name: string;
  price: number;
  unit?: string;
  productName?: string;
  productUrl?: string;
  imageUrl?: string;
}

// Every word in the grocery name must appear as a whole word in the scraped name.
function fuzzyMatch(groceryName: string, scrapedName: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  const gWords = norm(groceryName).split(/\s+/).filter(w => w.length >= 2);
  const sWords = norm(scrapedName).split(/\s+/);
  return gWords.length > 0 && gWords.every(gw =>
    sWords.some(sw => sw === gw || (gw.length >= 4 && (sw.startsWith(gw) || gw.startsWith(sw))))
  );
}

export async function POST(req: Request) {
  try {
    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const { userId } = await getAuthUser(req);
    const body = await req.json();
    const store = STORES.includes(body?.store) ? body.store : null;
    if (!store) return NextResponse.json({ error: 'Invalid store' }, { status: 400 });

    const products: ScrapedProduct[] = Array.isArray(body?.products) ? body.products : [];
    if (products.length === 0) return NextResponse.json({ matched: 0, saved: 0, unmatched: [] });

    const groceryItems = await GroceryItem.find({ userId }).lean();

    const upserts: Promise<unknown>[] = [];

    for (const product of products) {
      const scrapedName = typeof product.name === 'string' ? product.name.trim() : '';
      if (!scrapedName) continue;

      const productName = product.productName || scrapedName;
      const unit = product.unit ?? '';
      const price = typeof product.price === 'number' ? product.price : null;

      // Try to link to a grocery item, but save regardless
      const groceryItem = groceryItems.find(item => fuzzyMatch(item.name, scrapedName));

      upserts.push(
        StorePriceEntry.findOneAndUpdate(
          { userId, store, productName, unit },
          {
            $set: {
              ...(groceryItem ? { itemId: new mongoose.Types.ObjectId(String(groceryItem._id)), itemName: groceryItem.name } : {}),
              price,
              unit,
              productName,
              productUrl: product.productUrl ?? undefined,
              imageUrl: product.imageUrl || undefined,
              scrapedAt: new Date(),
            },
          },
          { upsert: true, new: true }
        )
      );
    }

    await Promise.all(upserts);
    return NextResponse.json({ saved: upserts.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
