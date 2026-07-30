import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import StorePriceEntry from '@/features/grocery/models/StorePriceEntry';
import mongoose from 'mongoose';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const { userId } = await getAuthUser();
    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const entry = await StorePriceEntry.findOneAndDelete({ _id: id, userId });
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ data: { deleted: true } });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
