import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ChatMessage, { CHANNELS } from '@/features/chat/models/ChatMessage';

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get('since');
  const ch = req.nextUrl.searchParams.get('ch');
  const channel = CHANNELS.includes(ch as never) ? ch : 'general';

  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const query: Record<string, unknown> = { channel };
  if (since) query.createdAt = { $gt: new Date(since) };

  const messages = await ChatMessage.find(query)
    .sort({ createdAt: 1 })
    .limit(200)
    .lean();

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const username = String(body.username ?? '').trim().slice(0, 32);
  const text = String(body.text ?? '').trim().slice(0, 500);
  const ch = String(body.channel ?? '');
  const channel = CHANNELS.includes(ch as never) ? ch : 'general';

  if (!username || !text) {
    return NextResponse.json({ error: 'username and text are required' }, { status: 400 });
  }

  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const message = await ChatMessage.create({ username, text, channel });
  return NextResponse.json({ message }, { status: 201 });
}
