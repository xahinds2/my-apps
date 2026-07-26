import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authHelper';
import { connectToDatabase } from '@/lib/db';
import AppShare from '@/features/common/models/AppShare';
import ManifestItem from '@/features/manifest/models/ManifestItem';

// GET /api/shares/incoming?appname=manifest
// Returns data from all users who have shared the given app with the current user.
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

    // Find all users who have shared this app with the current user (or made it public).
    const shares = await AppShare.find({
      appname,
      owner: { $ne: userId },
      $or: [{ public: true }, { viewableUsers: userId }],
    })
      .select('owner')
      .lean();

    if (shares.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const ownerIds = shares.map(s => s.owner);

    if (appname === 'manifest') {
      const docs = await ManifestItem.find({ userId: { $in: ownerIds } })
        .sort({ createdAt: -1 })
        .lean();

      // Group items by owner.
      const grouped = ownerIds.map(owner => ({
        ownerUserId: owner,
        items: JSON.parse(JSON.stringify(docs.filter(d => d.userId === owner))),
      }));

      return NextResponse.json({ data: grouped });
    }

    return NextResponse.json({ error: 'Unsupported appname' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
