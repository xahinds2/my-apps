import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import Wish from '@/features/wish/models/Wish';

export async function GET() {
  try {
    const { userId } = await getAuthUser();
    const db = await connectToDatabase();

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const wishes = await Wish.find({ userId }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ data: wishes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await getAuthUser();
    const body = await req.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return NextResponse.json({ error: 'Item text cannot be empty' }, { status: 400 });
    }

    const db = await connectToDatabase();

    if (!db) {
      return NextResponse.json(
        {
          source: 'mock',
          data: {
            _id: `local-${Date.now()}`,
            userId,
            text,
            links: [],
            status: 'pending',
            createdAt: new Date().toISOString(),
          },
        },
        { status: 503 }
      );
    }

    const wish = await Wish.create({
      userId,
      text,
      links: [],
    });

    return NextResponse.json({ source: 'database', data: wish }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}