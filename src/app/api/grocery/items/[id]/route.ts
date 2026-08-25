import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import GroceryItem, { UNITS } from '@/features/grocery/models/GroceryItem';
import CartSession from '@/features/grocery/models/CartSession';
import ProductMapping from '@/features/grocery/models/ProductMapping';
import mongoose from 'mongoose';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const { userId } = await getAuthUser();
    const body = await req.json();

    const update: Record<string, unknown> = {};
    if (typeof body?.name === 'string' && body.name.trim()) update.name = body.name.trim().slice(0, 100);
    if (typeof body?.category === 'string' && body.category.trim()) update.category = body.category.trim().slice(0, 50);
    if (UNITS.includes(body?.unit)) update.unit = body.unit;
    if (typeof body?.defaultQuantity === 'number' && body.defaultQuantity > 0) update.defaultQuantity = body.defaultQuantity;
    if (typeof body?.note === 'string') update.note = body.note.trim().slice(0, 200);

    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const item = await GroceryItem.findOneAndUpdate({ _id: id, userId }, { $set: update }, { returnDocument: 'after' });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (update.name) {
      const oid = new mongoose.Types.ObjectId(id);
      await Promise.all([
        CartSession.updateMany(
          { userId, 'items.itemId': oid },
          { $set: { 'items.$[elem].itemName': update.name } },
          { arrayFilters: [{ 'elem.itemId': oid }] }
        ),
        ProductMapping.updateMany({ userId, itemId: oid }, { $set: { itemName: update.name } }),
      ]);
    }

    return NextResponse.json({ data: item });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const { userId } = await getAuthUser();
    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const item = await GroceryItem.findOneAndDelete({ _id: id, userId });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ data: { deleted: true } });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
