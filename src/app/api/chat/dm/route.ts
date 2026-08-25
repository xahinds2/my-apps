import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import DirectMessage from '@/features/chat/models/DirectMessage';

export async function DELETE(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username');
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });

  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const result = await DirectMessage.deleteMany({ $or: [{ from: username }, { to: username }] });
  return NextResponse.json({ deleted: result.deletedCount });
}

export async function GET(req: NextRequest) {
  const room  = req.nextUrl.searchParams.get('room');
  const since = req.nextUrl.searchParams.get('since');
  if (!room) return NextResponse.json({ error: 'room required' }, { status: 400 });

  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const query: Record<string, unknown> = { roomId: room };
  if (since) query.createdAt = { $gt: new Date(since) };

  const messages = await DirectMessage.find(query).sort({ createdAt: 1 }).limit(200).lean();
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const from = String(body.from ?? '').trim().slice(0, 32);
  const to   = String(body.to   ?? '').trim().slice(0, 32);
  const text = String(body.text ?? '').trim().slice(0, 500);
  const room = String(body.room ?? '').trim().slice(0, 70);

  if (!from || !to || !text || !room) {
    return NextResponse.json({ error: 'from, to, room, and text are required' }, { status: 400 });
  }

  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const message = await DirectMessage.create({ roomId: room, from, to, text });
  return NextResponse.json({ message }, { status: 201 });
}
