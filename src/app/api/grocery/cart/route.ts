import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import CartSession from '@/features/grocery/models/CartSession';

export async function GET() {
  try {
    const { userId } = await getAuthUser();
    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const sessions = await CartSession.find({ userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ data: sessions });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await getAuthUser();
    const body = await req.json();

    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const name = typeof body?.name === 'string' && body.name.trim()
      ? body.name.trim().slice(0, 100)
      : `Shopping – ${today}`;

    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const session = await CartSession.create({ userId, name, items: [] });
    return NextResponse.json({ data: session }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
