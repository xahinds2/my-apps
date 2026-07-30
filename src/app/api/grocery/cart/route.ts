import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import CartSession from '@/features/grocery/models/CartSession';

export async function GET() {
  try {
    const { userId } = await getAuthUser();
    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const sessions = await CartSession.find({ userId }).sort({ createdAt: 1 }).lean();
    return NextResponse.json({ data: sessions });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await getAuthUser();
    const body = await req.json();

    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const cartType: string | null = ['main', 'zepto', 'instamart'].includes(body?.cartType) ? body.cartType : null;

    // For typed carts: return existing active one if it exists (upsert-style)
    if (cartType) {
      const existing = await CartSession.findOne({ userId, cartType, status: 'active' }).lean();
      if (existing) return NextResponse.json({ data: existing });
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const timeStr = today.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const defaultName = cartType === 'main' ? 'Main Cart' : cartType === 'zepto' ? 'Zepto' : cartType === 'instamart' ? 'Swiggy' : `Cart – ${dateStr}, ${timeStr}`;
    const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 100) : defaultName;

    const session = await CartSession.create({ userId, name, cartType, items: [] });
    return NextResponse.json({ data: session }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
