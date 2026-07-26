import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authHelper';
import { connectToDatabase } from '@/lib/db';
import ShareAccess, {
  SHARE_VISIBILITIES,
  type ShareVisibility,
} from '@/features/common/models/ShareAccess';
import {
  buildPublicShareUrl,
  createShareToken,
  hashShareToken,
  normalizeAllowedUserIds,
  parseExpiry,
} from '@/lib/shareEngine';

function isShareVisibility(value: unknown): value is ShareVisibility {
  return typeof value === 'string' && SHARE_VISIBILITIES.includes(value as ShareVisibility);
}

function serializeShare(share: Record<string, unknown>) {
  return {
    id: String(share._id),
    ownerUserId: share.ownerUserId,
    resourceType: share.resourceType,
    resourceId: share.resourceId,
    visibility: share.visibility,
    allowedUserIds: Array.isArray(share.allowedUserIds) ? share.allowedUserIds : [],
    expiresAt: share.expiresAt,
    revokedAt: share.revokedAt,
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
  };
}

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

    const share = await ShareAccess.findOne({ _id: id, ownerUserId: userId }).lean();
    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    return NextResponse.json({ data: serializeShare(share as unknown as Record<string, unknown>) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await getAuthUser(req);
    const body = await req.json();

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const existing = await ShareAccess.findOne({ _id: id, ownerUserId: userId }).lean();
    if (!existing) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    const updateSet: Record<string, unknown> = {};
    const updateUnset: Record<string, number> = {};

    if (body?.visibility !== undefined) {
      if (!isShareVisibility(body.visibility)) {
        return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
      }
      updateSet.visibility = body.visibility;
    }

    if (body?.allowedUserIds !== undefined) {
      updateSet.allowedUserIds = normalizeAllowedUserIds(body.allowedUserIds, userId);
    }

    if (body?.expiresAt !== undefined) {
      if (body.expiresAt === null || body.expiresAt === '') {
        updateUnset.expiresAt = 1;
      } else {
        const expiresAt = parseExpiry(body.expiresAt);
        if (!expiresAt) {
          return NextResponse.json({ error: 'Invalid expiresAt date' }, { status: 400 });
        }
        updateSet.expiresAt = expiresAt;
      }
    }

    if (body?.revoke === true) {
      updateSet.revokedAt = new Date();
    }

    const nextVisibility = (updateSet.visibility as ShareVisibility | undefined) ?? (existing.visibility as ShareVisibility);

    let rawToken: string | null = null;
    const shouldRotatePublicToken = body?.rotatePublicToken === true;

    if (nextVisibility === 'public') {
      const hasToken = typeof existing.tokenHash === 'string' && existing.tokenHash.length > 0;
      if (shouldRotatePublicToken || !hasToken) {
        rawToken = createShareToken();
        updateSet.tokenHash = hashShareToken(rawToken);
      }
    } else {
      updateUnset.tokenHash = 1;
    }

    if (Object.keys(updateSet).length === 0 && Object.keys(updateUnset).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const updated = await ShareAccess.findOneAndUpdate(
      { _id: id, ownerUserId: userId },
      {
        ...(Object.keys(updateSet).length > 0 ? { $set: updateSet } : {}),
        ...(Object.keys(updateUnset).length > 0 ? { $unset: updateUnset } : {}),
      },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: serializeShare(updated as unknown as Record<string, unknown>),
      ...(rawToken ? { publicToken: rawToken, publicUrl: buildPublicShareUrl(req, rawToken) } : {}),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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

    const deleted = await ShareAccess.findOneAndDelete({ _id: id, ownerUserId: userId }).lean();
    if (!deleted) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
