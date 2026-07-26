import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authHelper';
import { connectToDatabase } from '@/lib/db';
import AppShare from '@/features/common/models/AppShare';

// GET /api/shares?appname=manifest
// Returns the list of ownerUserIds whose data the current user is allowed to see.
export async function GET(req: Request) {
  try {
    const { userId } = await getAuthUser(req);
    const db = await connectToDatabase();

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const url = new URL(req.url);
    const appname = url.searchParams.get('appname');

    if (!appname) {
      return NextResponse.json({ error: 'appname is required' }, { status: 400 });
    }

    const shares = await AppShare.find({
      appname,
      owner: { $ne: userId },
      $or: [{ public: true }, { viewableUsers: userId }],
    })
      .select('owner')
      .lean();

    return NextResponse.json({ userIds: shares.map(s => s.owner) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

