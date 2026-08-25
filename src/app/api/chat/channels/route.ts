import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ChatChannel from '@/features/chat/models/ChatChannel';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$|^[a-z0-9]$/;
const DEFAULTS = ['general', 'random', 'tech', 'off-topic'];

export async function GET() {
  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ channels: DEFAULTS });

  // Seed defaults into DB on first call so all channels live in one place
  await ChatChannel.bulkWrite(
    DEFAULTS.map(name => ({
      updateOne: { filter: { name }, update: { $setOnInsert: { name } }, upsert: true },
    })),
    { ordered: false }
  );

  const all = await ChatChannel.find().sort({ createdAt: 1 }).select('name').lean();
  return NextResponse.json(
    { channels: all.map((c: { name: string }) => c.name) },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' } }
  );
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
