import { auth } from '@clerk/nextjs/server';

export async function getAuthUser() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    // Safe bypass in Demo Mode
    return { userId: 'demo-user' };
  }
  
  try {
    const session = await auth();
    return { userId: session.userId || 'demo-user' };
  } catch (e) {
    console.error('Clerk auth resolution failed, utilizing fallback demo session context:', e);
    return { userId: 'demo-user' };
  }
}
