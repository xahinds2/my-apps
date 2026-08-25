import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ChatChannel from '@/features/chat/models/ChatChannel';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$|^[a-z0-9]$/;

export async function GET() {
  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const channels = await ChatChannel.find().sort({ createdAt: 1 }).select('name').lean();
  return NextResponse.json({ channels: channels.map((c: { name: string }) => c.name) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? '').trim().toLowerCase().replace(/\s+/g, '-');

  if (!name || !SLUG_RE.test(name)) {
    return NextResponse.json({ error: 'Invalid channel name. Use lowercase letters, numbers, and hyphens.' }, { status: 400 });
  }

  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    await ChatChannel.create({ name });
    return NextResponse.json({ name }, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'Channel already exists' }, { status: 409 });
    }
    throw e;
  }
}
