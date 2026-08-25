import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import DirectMessage from '@/features/chat/models/DirectMessage';

// Returns all DM rooms the user is involved in, latest message per room
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username');
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });

  const db = await connectToDatabase();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const rooms = await DirectMessage.aggregate([
    { $match: { $or: [{ from: username }, { to: username }] } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$roomId',
        peer: { $first: { $cond: [{ $eq: ['$from', username] }, '$to', '$from'] } },
        lastMessage: { $first: '$text' },
        lastAt: { $first: '$createdAt' },
      },
    },
    { $sort: { lastAt: -1 } },
    { $limit: 20 },
  ]);

  return NextResponse.json({
    rooms: rooms.map(r => ({ room: r._id, peer: r.peer, lastMessage: r.lastMessage, lastAt: r.lastAt })),
  });
}
