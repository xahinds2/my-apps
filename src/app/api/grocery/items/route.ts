import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import GroceryItem, { UNITS } from '@/features/grocery/models/GroceryItem';

export async function GET() {
  try {
    const { userId } = await getAuthUser();
    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const items = await GroceryItem.find({ userId }).sort({ category: 1, name: 1 }).lean();
    return NextResponse.json({ data: items });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await getAuthUser();
    const body = await req.json();

    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 100) : '';
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const category = typeof body?.category === 'string' && body.category.trim() ? body.category.trim().slice(0, 50) : 'other';
    const unit = UNITS.includes(body?.unit) ? body.unit : 'piece';
    const defaultQuantity = typeof body?.defaultQuantity === 'number' && body.defaultQuantity > 0 ? body.defaultQuantity : 1;
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 200) : undefined;

    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const item = await GroceryItem.create({ userId, name, category, unit, defaultQuantity, ...(note ? { note } : {}) });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
