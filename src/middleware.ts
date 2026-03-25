// src/middleware.ts

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware refreshes the Supabase auth session on every request.
 * This ensures the session stays alive and tokens are refreshed.
 *
 * Protected routes: everything under /(dashboard)/
 * Public routes: /(marketing)/, /(auth)/, /api/webhooks/
 */
export async function middleware(request: NextRequest) {
  // Dev auth bypass — skip all Supabase auth in development
  const devBypass = process.env.DEV_AUTH_BYPASS === 'true';

  if (devBypass) {
    // Let the landing page at / render normally
    if (request.nextUrl.pathname === '/') {
      return NextResponse.next({ request });
    }
    // Skip auth pages — redirect to dashboard
    if (request.nextUrl.pathname === '/sign-in' || request.nextUrl.pathname === '/sign-up') {
      const redirect = request.nextUrl.searchParams.get('redirect') ?? '/jobs';
      const url = request.nextUrl.clone();
      url.pathname = redirect;
      url.search = '';
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session
  const { data: { user } } = await supabase.auth.getUser();

  // Check if the route requires auth
  const isProtectedRoute =
    !request.nextUrl.pathname.startsWith('/sign-') &&
    !request.nextUrl.pathname.startsWith('/api/webhooks') &&
    !request.nextUrl.pathname.startsWith('/api/v1/openapi') &&
    !request.nextUrl.pathname.startsWith('/compare') &&
    !request.nextUrl.pathname.startsWith('/blog') &&
    !request.nextUrl.pathname.startsWith('/pricing') &&
    !request.nextUrl.pathname.startsWith('/features') &&
    !request.nextUrl.pathname.startsWith('/use-cases') &&
    request.nextUrl.pathname !== '/';

  // Landing page at / is public. Dashboard home is also /, but the (dashboard) layout handles the redirect.
  // For API routes, check bearer token auth
  if (request.nextUrl.pathname.startsWith('/api/v1/') && !request.nextUrl.pathname.includes('openapi')) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer sk_')) {
      // API key auth — let the route handler validate it
      return supabaseResponse;
    }
    // Otherwise, require Supabase session
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Redirect unauthenticated users away from protected pages
  if (isProtectedRoute && !user && !request.nextUrl.pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users from root to dashboard
  if (user && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/jobs';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname === '/sign-in' || request.nextUrl.pathname === '/sign-up')) {
    const redirect = request.nextUrl.searchParams.get('redirect') ?? '/';
    const url = request.nextUrl.clone();
    url.pathname = redirect;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
