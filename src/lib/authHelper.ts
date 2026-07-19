import { auth } from '@clerk/nextjs/server';

let warnedAboutClerkMiddleware = false;

export async function getAuthUser() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    // Safe bypass in Demo Mode
    return { userId: 'demo-user' };
  }
  
  try {
    const session = await auth();
    return { userId: session.userId || 'demo-user' };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    // Expected when routes are intentionally excluded from clerkMiddleware (e.g., open APIs).
    if (message.includes("auth() was called but Clerk can't detect usage of clerkMiddleware")) {
      if (!warnedAboutClerkMiddleware) {
        warnedAboutClerkMiddleware = true;
        console.warn('Clerk middleware is not active for this route; using demo-user fallback.');
      }
      return { userId: 'demo-user' };
    }

    console.error('Clerk auth resolution failed, utilizing fallback demo session context:', e);
    return { userId: 'demo-user' };
  }
}
