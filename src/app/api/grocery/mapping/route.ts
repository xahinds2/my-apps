import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import ProductMapping from '@/features/grocery/models/ProductMapping';
import StorePriceEntry from '@/features/grocery/models/StorePriceEntry';
import { STORES } from '@/features/grocery/models/StorePriceEntry';
import GroceryItem from '@/features/grocery/models/GroceryItem';
import mongoose from 'mongoose';

// GET /api/grocery/mapping?itemId=X   — single item
// GET /api/grocery/mapping?itemIds=X,Y,Z  — bulk for cart
export async function GET(req: Request) {
  try {
    const { userId } = await getAuthUser(req);
    const { searchParams } = new URL(req.url);
    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const itemIdsParam = searchParams.get('itemIds');
    const itemIdParam  = searchParams.get('itemId');

    if (itemIdsParam) {
      const ids = itemIdsParam.split(',').filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id));
      const mappings = await ProductMapping.find({ userId, itemId: { $in: ids } }).lean();
      return NextResponse.json({ data: mappings });
    }

    if (!itemIdParam || !mongoose.isValidObjectId(itemIdParam)) {
      return NextResponse.json({ error: 'itemId or itemIds required' }, { status: 400 });
    }
    const mappings = await ProductMapping.find({ userId, itemId: new mongoose.Types.ObjectId(itemIdParam) }).lean();
    return NextResponse.json({ data: mappings });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/grocery/mapping  — confirms that the current StorePriceEntry for this item+store is correct
// Body: { itemId, store }
export async function POST(req: Request) {
  try {
    const { userId } = await getAuthUser(req);
    const body = await req.json();
    const { itemId, store, productName: confirmedProductName, unit: confirmedUnit } = body ?? {};

    if (!itemId || !mongoose.isValidObjectId(itemId)) {
      return NextResponse.json({ error: 'Invalid itemId' }, { status: 400 });
    }
    if (!STORES.includes(store)) {
      return NextResponse.json({ error: 'Invalid store' }, { status: 400 });
    }

    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const objItemId = new mongoose.Types.ObjectId(itemId);
    if (!confirmedProductName) return NextResponse.json({ error: 'productName required' }, { status: 400 });

    const priceQuery: Record<string, unknown> = { store, productName: confirmedProductName };
    if (confirmedUnit) priceQuery.unit = confirmedUnit;
    const entry = await StorePriceEntry.findOne(priceQuery).lean();
    if (!entry) return NextResponse.json({ error: 'No scraped price found for this item+store' }, { status: 404 });

    const groceryItem = await GroceryItem.findById(objItemId).lean();
    const itemName = groceryItem?.name ?? confirmedProductName;

    const mapping = await ProductMapping.findOneAndUpdate(
      { userId, itemId: objItemId, store, productName: entry.productName, unit: entry.unit ?? '' },
      { $set: { itemName, productName: entry.productName, unit: entry.unit ?? '', productUrl: entry.productUrl } },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({ data: mapping });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
