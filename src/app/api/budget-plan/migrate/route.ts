import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import BudgetPlan from '@/features/finance/models/BudgetPlan';

const GUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const realUserId = session.userId;

    const body = await req.json();
    const { guestId } = body;

    if (!guestId || !GUEST_ID_RE.test(String(guestId))) {
      return NextResponse.json({ error: 'Invalid guestId' }, { status: 400 });
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const guestUserId = `guest_${guestId}`;
    const guestDocs = await BudgetPlan.find({ userId: guestUserId }).lean();

    if (guestDocs.length === 0) {
      return NextResponse.json({ migrated: 0 });
    }

    let migrated = 0;
    for (const doc of guestDocs) {
      // Only migrate years the real user doesn't already have
      const existing = await BudgetPlan.findOne({ userId: realUserId, year: doc.year }).lean();
      if (!existing) {
        await BudgetPlan.updateOne(
          { userId: guestUserId, year: doc.year },
          { $set: { userId: realUserId } }
        );
        migrated++;
      }
    }

    // Clean up remaining guest docs (years skipped due to existing data)
    await BudgetPlan.deleteMany({ userId: guestUserId });

    return NextResponse.json({ migrated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
