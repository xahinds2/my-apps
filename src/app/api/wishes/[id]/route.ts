import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import Wish from '@/features/wish/models/Wish';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await getAuthUser();
    const db = await connectToDatabase();

    if (!db) {
      return NextResponse.json({ success: true, source: 'mock' });
    }

    const wish = await Wish.findOneAndDelete({ _id: id, userId });
    if (!wish) {
      return NextResponse.json({ error: 'Wish not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await getAuthUser();
    const body = await req.json();
    const text = body?.text?.trim();

    if (!text) {
      return NextResponse.json({ error: 'Wish text is required' }, { status: 400 });
    }

    const db = await connectToDatabase();

    if (!db) {
      return NextResponse.json({ source: 'mock', data: { _id: id, userId, text, createdAt: new Date().toISOString() } });
    }

    const wish = await Wish.findOneAndUpdate(
      { _id: id, userId },
      { text },
      { new: true }
    );

    if (!wish) {
      return NextResponse.json({ error: 'Wish not found' }, { status: 404 });
    }

    return NextResponse.json({ source: 'database', data: wish });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
