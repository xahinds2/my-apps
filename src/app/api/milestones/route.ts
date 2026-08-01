import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import UserMilestones from '@/features/finance/models/UserMilestones';

export async function GET() {
  try {
    const { userId } = await getAuthUser();
    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const doc = await UserMilestones.findOne({ userId }).lean();
    return NextResponse.json({ milestones: doc?.milestones ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await getAuthUser();
    const body = await req.json();
    const raw: unknown[] = Array.isArray(body?.milestones) ? body.milestones : [];

    if (raw.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 milestones allowed' }, { status: 400 });
    }

    const milestones = raw.map((m: unknown) => {
      const item = m as Record<string, unknown>;
      return {
        id:      String(item.id ?? '').slice(0, 40),
        label:   String(item.label ?? '').trim().slice(0, 100),
        current: typeof item.current === 'number' && item.current >= 0 ? Math.round(item.current) : 0,
        goal:    typeof item.goal === 'number' && item.goal >= 1 ? Math.round(item.goal) : 1,
        color:   String(item.color ?? '#60a5fa').slice(0, 20),
      };
    });

    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    await UserMilestones.findOneAndUpdate(
      { userId },
      { $set: { milestones } },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
