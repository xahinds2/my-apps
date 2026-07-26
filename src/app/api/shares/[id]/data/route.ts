import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authHelper';
import { connectToDatabase } from '@/lib/db';
import ShareAccess from '@/features/common/models/ShareAccess';
import { getShareableResource, isShareExpired } from '@/lib/shareEngine';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await getAuthUser(req);

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const share = await ShareAccess.findById(id).lean();
    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    if (share.revokedAt) {
      return NextResponse.json({ error: 'Share is revoked' }, { status: 410 });
    }

    if (isShareExpired(share.expiresAt)) {
      return NextResponse.json({ error: 'Share has expired' }, { status: 410 });
    }

    const isOwner = share.ownerUserId === userId;
    const allowedUserIds = Array.isArray(share.allowedUserIds) ? share.allowedUserIds : [];
    const isAllowedRecipient = allowedUserIds.includes(userId);

    if (!isOwner && !isAllowedRecipient) {
      return NextResponse.json({ error: 'Not allowed to access this shared data' }, { status: 403 });
    }

    const data = await getShareableResource(
      share.ownerUserId,
      share.resourceType,
      share.resourceId
    );

    if (!data) {
      return NextResponse.json({ error: 'Shared resource no longer exists' }, { status: 404 });
    }

    return NextResponse.json({
      data,
      share: {
        id: String(share._id),
        resourceType: share.resourceType,
        resourceId: share.resourceId,
        visibility: share.visibility,
        expiresAt: share.expiresAt,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
