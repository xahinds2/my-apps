import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ShareAccess from '@/features/common/models/ShareAccess';
import { getShareableResource, hashShareToken, isShareExpired } from '@/lib/shareEngine';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const tokenHash = hashShareToken(token);

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const share = await ShareAccess.findOne({
      tokenHash,
      visibility: 'public',
    }).lean();

    if (!share) {
      return NextResponse.json({ error: 'Public share not found' }, { status: 404 });
    }

    if (share.revokedAt) {
      return NextResponse.json({ error: 'Share is revoked' }, { status: 410 });
    }

    if (isShareExpired(share.expiresAt)) {
      return NextResponse.json({ error: 'Share has expired' }, { status: 410 });
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
