import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import StorePriceEntry from '@/features/grocery/models/StorePriceEntry';
import mongoose from 'mongoose';

export async function GET(req: Request) {
  try {
    const { userId } = await getAuthUser();
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get('itemIds') ?? '';
    const itemIds = raw.split(',').filter(id => mongoose.isValidObjectId(id));

    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const query = itemIds.length > 0
      ? { userId, itemId: { $in: itemIds.map(id => new mongoose.Types.ObjectId(id)) } }
      : { userId };

    const prices = await StorePriceEntry.find(query).sort({ scrapedAt: -1 }).lean();
    return NextResponse.json({ data: prices });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
