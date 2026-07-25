import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import UserInsurance from '@/features/finance/models/UserInsurance';

export async function GET() {
  try {
    const { userId } = await getAuthUser();
    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const doc = await UserInsurance.findOne({ userId }).lean();
    return NextResponse.json({ policies: doc?.policies ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await getAuthUser();
    const body = await req.json();
    const raw: unknown[] = Array.isArray(body?.policies) ? body.policies : [];

    if (raw.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 policies allowed' }, { status: 400 });
    }

    const policies = raw.map((p: unknown) => {
      const item = p as Record<string, unknown>;
      return {
        id:     String(item.id ?? '').slice(0, 40),
        name:   String(item.name ?? '').trim().slice(0, 100),
        type:   String(item.type ?? 'Health').trim().slice(0, 40),
        cover:  String(item.cover ?? '').trim().slice(0, 40),
        policy: String(item.policy ?? '').trim().slice(0, 120),
        expiry: String(item.expiry ?? '').trim().slice(0, 40),
      };
    });

    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    await UserInsurance.findOneAndUpdate(
      { userId },
      { $set: { policies } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
