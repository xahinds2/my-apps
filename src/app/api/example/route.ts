import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';

/**
 * Example API route — rename/remove this and add your own routes.
 * GET /api/example
 */
export async function GET() {
  try {
    const { userId } = await getAuthUser();
    const db = await connectToDatabase();

    return NextResponse.json({
      message: 'API is working.',
      userId,
      dbConnected: db !== null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
