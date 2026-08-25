import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import RegisteredUsername from '@/features/chat/models/RegisteredUsername';

// Search by prefix, get status, or restore username from device token
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim().slice(0, 32) ?? '';
  const statusFor = req.nextUrl.searchParams.get('status')?.trim().slice(0, 32) ?? '';
  const device = req.nextUrl.searchParams.get('device')?.trim().slice(0, 64) ?? '';

  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  if (device) {
    const user = await RegisteredUsername.findOne({ deviceToken: device }).select('username lastActiveAt').lean() as { username: string; lastActiveAt?: Date } | null;
    if (!user) return NextResponse.json({ username: null });
    return NextResponse.json({ username: user.username });
  }

  if (statusFor) {
    const user = await RegisteredUsername.findOne({ username: statusFor }).select('lastActiveAt').lean() as { lastActiveAt?: Date } | null;
    if (!user) return NextResponse.json({ online: false, lastActiveAt: null });
    const lastActiveAt = user.lastActiveAt ?? null;
    const online = lastActiveAt ? Date.now() - new Date(lastActiveAt).getTime() < 6 * 60 * 1000 : false;
    return NextResponse.json({ online, lastActiveAt });
  }

  if (!q) return NextResponse.json({ usernames: [] });

  const results = await RegisteredUsername.find(
    { username: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
  ).select('username').limit(10).lean();

  return NextResponse.json({ usernames: results.map((r: { username: string }) => r.username) });
}

// Claim a username — 201 if registered, 409 if taken
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = String(body?.username ?? '').trim().slice(0, 32);
  const deviceToken = String(body?.deviceToken ?? '').trim().slice(0, 64);
  if (!username || !deviceToken) return NextResponse.json({ error: 'username and deviceToken required' }, { status: 400 });

  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    await RegisteredUsername.create({ username, deviceToken, lastActiveAt: new Date() });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'taken' }, { status: 409 });
    }
    throw e;
  }
}

// Heartbeat — keeps username alive by updating lastActiveAt
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = String(body?.username ?? '').trim().slice(0, 32);
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });

  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const result = await RegisteredUsername.updateOne(
    { username },
    { $set: { lastActiveAt: new Date() } }
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: 'expired' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
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
