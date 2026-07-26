import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getAuthUser } from '@/lib/authHelper';

interface ClerkEmailAddress {
  emailAddress?: string;
}

interface ClerkUserLike {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  primaryEmailAddress?: ClerkEmailAddress | null;
  emailAddresses?: ClerkEmailAddress[];
}

function buildDisplayName(user: ClerkUserLike): string {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  if (fullName) return fullName;
  if (user.username) return user.username;
  const primary = user.primaryEmailAddress?.emailAddress;
  if (primary) return primary;
  const fallback = user.emailAddresses?.[0]?.emailAddress;
  if (fallback) return fallback;
  return 'Unknown user';
}

function getPrimaryEmail(user: ClerkUserLike): string {
  return user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '';
}

export async function GET(req: Request) {
  try {
    const { userId } = await getAuthUser(req);

    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      return NextResponse.json({ data: [] });
    }

    const client = await clerkClient();
    const listResult = await client.users.getUserList({ limit: 100 });

    const rawUsers = (Array.isArray((listResult as unknown as { data?: unknown[] })?.data)
      ? (listResult as unknown as { data: unknown[] }).data
      : []) as ClerkUserLike[];

    const users = rawUsers
      .filter(user => user.id && user.id !== userId)
      .map(user => ({
        id: user.id,
        name: buildDisplayName(user),
        email: getPrimaryEmail(user),
      }));

    return NextResponse.json({ data: users });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
