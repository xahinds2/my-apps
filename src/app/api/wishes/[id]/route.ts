import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import Wish from '@/features/wish/models/Wish';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await getAuthUser();
    const db = await connectToDatabase();

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const wish = await Wish.findOne({ _id: id, userId }).lean();
    if (!wish) {
      return NextResponse.json({ error: 'Manifest item not found' }, { status: 404 });
    }

    return NextResponse.json({ data: wish });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await getAuthUser();
    const db = await connectToDatabase();

    if (!db) {
      return NextResponse.json({ success: true, source: 'mock' });
    }

    const wish = await Wish.findOneAndDelete({ _id: id, userId });
    if (!wish) {
      return NextResponse.json({ error: 'Manifest item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isValidUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await getAuthUser();
    const body = await req.json();

    const update: Record<string, unknown> = {};

    if (body?.text !== undefined) {
      const text = body.text.trim();
      if (!text) return NextResponse.json({ error: 'Item text cannot be empty' }, { status: 400 });
      update.text = text;
    }

    if (body?.links !== undefined) {
      if (!Array.isArray(body.links)) {
        return NextResponse.json({ error: 'Links must be an array' }, { status: 400 });
      }
      const sanitized = (body.links as { url: unknown; label?: unknown }[]).filter(l => isValidUrl(l.url));
      update.links = sanitized.map(l => ({
        url: l.url as string,
        ...(typeof l.label === 'string' && l.label ? { label: l.label } : {}),
      }));
    }

    if (body?.image !== undefined) {
      update.image = typeof body.image === 'string' && isValidUrl(body.image) ? body.image : null;
    }
    if (body?.budget !== undefined) {
      update.budget = typeof body.budget === 'string' ? body.budget.trim().slice(0, 100) : null;
    }
    if (body?.timeline !== undefined) {
      update.timeline = typeof body.timeline === 'string' ? body.timeline.trim().slice(0, 100) : null;
    }
    if (body?.status !== undefined) {
      const allowed = ['pending', 'bought', 'skipped'];
      update.status = allowed.includes(body.status) ? body.status : 'pending';
    }
    if (body?.priority !== undefined) {
      const allowed = ['must', 'nice', 'maybe'];
      update.priority = allowed.includes(body.priority) ? body.priority : null;
    }
    if (body?.note !== undefined) {
      update.note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const db = await connectToDatabase();

    if (!db) {
      return NextResponse.json({ source: 'mock', data: { _id: id, userId, ...update, createdAt: new Date().toISOString() } });
    }

    const wish = await Wish.findOneAndUpdate(
      { _id: id, userId },
      { $set: update },
      { new: true }
    );

    if (!wish) {
      return NextResponse.json({ error: 'Manifest item not found' }, { status: 404 });
    }

    return NextResponse.json({ source: 'database', data: wish });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
