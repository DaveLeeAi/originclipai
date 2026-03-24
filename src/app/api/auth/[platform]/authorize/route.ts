// src/app/api/auth/[platform]/authorize/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getSocialAdapter } from '@/lib/social';
import crypto from 'crypto';

/**
 * GET /api/auth/:platform/authorize
 * Redirects the user to the platform's OAuth consent page.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  const { platform } = await params;

  try {
    const adapter = getSocialAdapter(platform);
    const state = crypto.randomBytes(16).toString('hex');

    // Store state in cookie for CSRF verification on callback
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/${platform}/callback`;
    const authUrl = adapter.getAuthUrl(redirectUri, state);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(`oauth_state_${platform}`, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.redirect(
      new URL(`/settings/connections?error=${encodeURIComponent(error.message)}`, request.url),
    );
  }
}
