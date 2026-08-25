import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ChatMessage from '@/features/chat/models/ChatMessage';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$|^[a-z0-9]$/;

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get('since');
  const ch = req.nextUrl.searchParams.get('ch');
  const channel = ch && SLUG_RE.test(ch) ? ch : 'general';

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
  const channel = ch && SLUG_RE.test(ch) ? ch : 'general';
  const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 5) : [];

  if (!username || (!text && attachments.length === 0)) {
    return NextResponse.json({ error: 'username and text or attachments are required' }, { status: 400 });
  }

  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    const message = await ChatMessage.create({ username, text, channel, attachments });
    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    console.error('Message create error:', e);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}
