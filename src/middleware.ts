import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function applyRateLimit(req: NextRequest): NextResponse | null {
  if (!req.nextUrl.pathname.startsWith('/api/')) return null;

  const ip = getClientIP(req);
  const isWrite = WRITE_METHODS.has(req.method);
  // Stricter limit for write operations to slow down automated abuse
  const max = isWrite ? 20 : 100;
  const key = `${ip}:${isWrite ? 'w' : 'r'}`;

  const result = checkRateLimit(key, { max, windowMs: 60_000 });

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };

  if (!result.allowed) {
    headers['Retry-After'] = String(Math.ceil((result.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'Too many requests. Please slow down and try again later.' },
      { status: 429, headers }
    );
  }

  return null;
}

const BLOCKED_PREFIXES = ['/', '/finance', '/manifest', '/grocery'];

export default clerkMiddleware(async (auth, req) => {
  // When BLOCK_HOME=true, redirect all app pages to /chat
  if (process.env.STANDALONE === 'true') {
    const { pathname } = req.nextUrl;
    if (!pathname.startsWith('/chat') && BLOCKED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
      return NextResponse.redirect(new URL('/chat', req.url));
    }
  }

  // Protect pages that require authentication
  if (req.nextUrl.pathname.startsWith('/finance') || req.nextUrl.pathname.startsWith('/manifest') || req.nextUrl.pathname.startsWith('/grocery')) {
    await auth.protect();
  }

  const rateLimitResponse = applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;
});

export const config = {
  matcher: [
    // Rate-limit all API routes
    '/api/(.*)',
    // Run Clerk on all pages except Next.js internals and static files
    '/((?!trpc|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/(.*)',
  ],
};
