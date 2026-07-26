import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authHelper';
import { connectToDatabase } from '@/lib/db';
import AppShare from '@/features/common/models/AppShare';

// GET /api/share?appname=manifest
// Returns the current user's own share config for the given app.
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

    const share = await AppShare.findOne({ owner: userId, appname }).lean();
    return NextResponse.json({ data: share ?? null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/share
// Upserts the current user's share config for an app.
// Body: { appname: string, public?: boolean, viewableUsers?: string[], userId?: string, remove?: boolean }
//   - public: sets the public flag
//   - viewableUsers: replaces the entire viewableUsers list when provided as an array
//   - userId + remove: adds or removes a single user from viewableUsers
export async function POST(req: Request) {
  try {
    const { userId } = await getAuthUser(req);
    const body = await req.json();

    const appname = typeof body?.appname === 'string' ? body.appname.trim() : '';
    if (!appname) {
      return NextResponse.json({ error: 'appname is required' }, { status: 400 });
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const setFields: Record<string, unknown> = {};
    const updateOps: Record<string, unknown> = {};

    if (typeof body?.public === 'boolean') {
      setFields.public = body.public;
    }

    if (Array.isArray(body?.viewableUsers)) {
      // Replace the entire list, filtering out the owner's own ID.
      setFields.viewableUsers = (body.viewableUsers as unknown[])
        .filter((id): id is string => typeof id === 'string' && id !== userId);
    }

    if (Object.keys(setFields).length > 0) {
      updateOps.$set = setFields;
    }

    // Granular single-user add/remove (only when viewableUsers array not provided).
    if (!Array.isArray(body?.viewableUsers)) {
      const targetUserId = typeof body?.userId === 'string' ? body.userId.trim() : null;
      if (targetUserId && targetUserId !== userId) {
        if (body?.remove === true) {
          updateOps.$pull = { viewableUsers: targetUserId };
        } else {
          updateOps.$addToSet = { viewableUsers: targetUserId };
        }
      }
    }

    if (Object.keys(updateOps).length === 0) {
      return NextResponse.json(
        { error: 'Provide at least one of: public, viewableUsers, or userId' },
        { status: 400 }
      );
    }

    const share = await AppShare.findOneAndUpdate(
      { owner: userId, appname },
      updateOps,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ data: share });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

