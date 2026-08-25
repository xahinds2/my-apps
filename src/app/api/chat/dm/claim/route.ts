import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import RoomClaim from '@/features/chat/models/RoomClaim';

// Bind a (roomId, username) pair to a sessionId on first access.
// Subsequent callers with a different sessionId are rejected.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const roomId    = String(body.roomId    ?? '').trim().slice(0, 70);
  const username  = String(body.username  ?? '').trim().slice(0, 32);
  const sessionId = String(body.sessionId ?? '').trim().slice(0, 64);

  if (!roomId || !username || !sessionId) {
    return NextResponse.json({ error: 'roomId, username, sessionId required' }, { status: 400 });
  }

  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const existing = await RoomClaim.findOne({ roomId, username }).lean();
  if (existing) {
    if ((existing as { sessionId: string }).sessionId !== sessionId) {
      return NextResponse.json({ error: 'Room already claimed by another session' }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  }

  await RoomClaim.create({ roomId, username, sessionId });
  return NextResponse.json({ ok: true }, { status: 201 });
}
