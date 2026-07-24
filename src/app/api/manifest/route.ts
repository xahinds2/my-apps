import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import ManifestItem from '@/features/manifest/models/ManifestItem';

function isValidUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const { userId } = await getAuthUser();
    const db = await connectToDatabase();

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const manifestItems = await ManifestItem.find({ userId }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ data: manifestItems });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await getAuthUser();
    const body = await req.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return NextResponse.json({ error: 'Item text cannot be empty' }, { status: 400 });
    }

    const db = await connectToDatabase();

    if (!db) {
      return NextResponse.json(
        {
          source: 'mock',
          data: {
            _id: `local-${Date.now()}`,
            userId,
            text,
            links: [],
            status: 'pending',
            createdAt: new Date().toISOString(),
          },
        },
        { status: 503 }
      );
    }

    const links = Array.isArray(body?.links)
      ? (body.links as { url: unknown; label?: unknown }[])
          .filter(link => isValidUrl(link.url))
          .map(link => ({
            url: link.url as string,
            ...(typeof link.label === 'string' && link.label ? { label: link.label } : {}),
          }))
      : [];

    const image = typeof body?.image === 'string' && isValidUrl(body.image) ? body.image : undefined;
    const budget = typeof body?.budget === 'string' ? body.budget.trim().slice(0, 100) : undefined;
    const timeline = typeof body?.timeline === 'string' ? body.timeline.trim().slice(0, 100) : undefined;
    const status = ['pending', 'bought', 'skipped'].includes(body?.status) ? body.status : undefined;
    const priority = ['must', 'nice', 'maybe'].includes(body?.priority) ? body.priority : undefined;
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : undefined;

    const manifestItem = await ManifestItem.create({
      userId,
      text,
      links,
      ...(image ? { image } : {}),
      ...(budget ? { budget } : {}),
      ...(timeline ? { timeline } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(note ? { note } : {}),
    });

    return NextResponse.json({ source: 'database', data: manifestItem }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}