import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import CartSession, { type ICartSessionItem } from '@/features/grocery/models/CartSession';
import GroceryItem from '@/features/grocery/models/GroceryItem';
import mongoose from 'mongoose';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const { userId } = await getAuthUser();
    const body = await req.json();
    const { itemId, quantity } = body ?? {};

    if (!mongoose.isValidObjectId(itemId)) return NextResponse.json({ error: 'Invalid itemId' }, { status: 400 });
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const groceryItem = await GroceryItem.findOne({ _id: itemId, userId }).lean();
    if (!groceryItem) return NextResponse.json({ error: 'Grocery item not found' }, { status: 404 });

    const session = await CartSession.findOne({ _id: id, userId });
    if (!session) return NextResponse.json({ error: 'Cart session not found' }, { status: 404 });

    const existing = session.items.find((i: ICartSessionItem) => i.itemId.toString() === itemId);
    if (existing) {
      existing.quantity = qty;
    } else {
      session.items.push({ itemId, itemName: groceryItem.name, quantity: qty, addedAt: new Date() });
    }

    await session.save();
    return NextResponse.json({ data: session });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const { userId } = await getAuthUser();
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');

    if (!itemId || !mongoose.isValidObjectId(itemId)) return NextResponse.json({ error: 'Invalid itemId' }, { status: 400 });

    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const session = await CartSession.findOneAndUpdate(
      { _id: id, userId },
      { $pull: { items: { itemId: new mongoose.Types.ObjectId(itemId) } } },
      { returnDocument: 'after' }
    );
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ data: session });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
