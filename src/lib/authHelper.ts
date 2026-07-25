import { auth } from '@clerk/nextjs/server';

const GUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function guestFallback(req?: Request): string {
  const id = req?.headers.get('X-Guest-Id') ?? '';
  return GUEST_ID_RE.test(id) ? `guest_${id}` : 'demo-user';
}

let warnedAboutClerkMiddleware = false;

export async function getAuthUser(req?: Request) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return { userId: guestFallback(req) };
  }

  try {
    const session = await auth();
    return { userId: session.userId || guestFallback(req) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    // Expected when routes are intentionally excluded from clerkMiddleware (e.g., open APIs).
    if (message.includes("auth() was called but Clerk can't detect usage of clerkMiddleware")) {
      if (!warnedAboutClerkMiddleware) {
        warnedAboutClerkMiddleware = true;
        console.warn('Clerk middleware is not active for this route; using demo-user fallback.');
      }
      return { userId: guestFallback(req) };
    }

    console.error('Clerk auth resolution failed, utilizing fallback demo session context:', e);
    return { userId: guestFallback(req) };
  }
}
