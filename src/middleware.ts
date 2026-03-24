import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge middleware — protects dashboard routes.
 *
 * Phase 3: checks for session_user_id cookie or DEFAULT_USER_ID.
 * Phase 5: will verify Supabase Auth JWT.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Public routes — never redirect
  const publicPaths = ['/sign-in', '/sign-up', '/api/'];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for session
  const sessionUserId =
    request.cookies.get('session_user_id')?.value ??
    process.env.DEFAULT_USER_ID;

  if (!sessionUserId) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Inject user ID header for API routes to use
  const response = NextResponse.next();
  response.headers.set('x-user-id', sessionUserId);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next (Next.js internals)
     * - static files (images, fonts, etc.)
     * - favicon.ico
     */
    '/((?!_next|.*\\..*|favicon\\.ico).*)',
  ],
};
