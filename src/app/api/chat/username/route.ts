import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import RegisteredUsername from '@/features/chat/models/RegisteredUsername';

// Search registered usernames by prefix
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim().slice(0, 32) ?? '';
  if (!q) return NextResponse.json({ usernames: [] });

  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const results = await RegisteredUsername.find(
    { username: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
  ).select('username').limit(10).lean();

  return NextResponse.json({ usernames: results.map((r: { username: string }) => r.username) });
}

// Claim a username — 201 if registered, 409 if taken
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = String(body?.username ?? '').trim().slice(0, 32);
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });

  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    await RegisteredUsername.create({ username });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'taken' }, { status: 409 });
    }
    throw e;
  }
}

// Release a username
export async function DELETE(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username');
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });

  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  await RegisteredUsername.deleteOne({ username });
  return NextResponse.json({ ok: true });
}
