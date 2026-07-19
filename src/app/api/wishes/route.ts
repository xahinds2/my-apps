import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import Wish from '@/models/Wish';

export async function GET() {
  try {
    const { userId } = await getAuthUser();
    const db = await connectToDatabase();

    if (!db) {
      return NextResponse.json({ source: 'mock', data: [] });
    }

    const wishes = await Wish.find({ userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ source: 'database', data: wishes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await getAuthUser();
    const body = await req.json();
    const text = body?.text?.trim();

    if (!text) {
      return NextResponse.json({ error: 'Wish text is required' }, { status: 400 });
    }

    const db = await connectToDatabase();

    if (!db) {
      // Demo mode — return a fake record; client handles localStorage
      return NextResponse.json({
        source: 'mock',
        data: { _id: `mock-${Date.now()}`, userId, text, createdAt: new Date().toISOString() },
      }, { status: 201 });
    }

    const wish = await Wish.create({ userId, text });
    return NextResponse.json({ source: 'database', data: wish }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
