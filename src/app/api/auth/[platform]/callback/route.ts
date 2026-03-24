// src/app/api/auth/[platform]/callback/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getSocialAdapter } from '@/lib/social';
import { db } from '@/lib/db/client';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/:platform/callback
 * Handles the OAuth callback from the social platform.
 * Exchanges the auth code for tokens and stores the connection.
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
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const settingsUrl = new URL('/settings/connections', request.url);

  // Handle OAuth errors
  if (error) {
    settingsUrl.searchParams.set('error', `${platform} authorization failed: ${error}`);
    return NextResponse.redirect(settingsUrl);
  }

  if (!code) {
    settingsUrl.searchParams.set('error', 'No authorization code received');
    return NextResponse.redirect(settingsUrl);
  }

  // Verify CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get(`oauth_state_${platform}`)?.value;
  if (!savedState || savedState !== state) {
    settingsUrl.searchParams.set('error', 'Invalid OAuth state. Please try again.');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const adapter = getSocialAdapter(platform);
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/${platform}/callback`;

    // Exchange code for tokens
    const tokens = await adapter.exchangeCode(code, redirectUri);

    // Get user info from the platform
    const userInfo = await adapter.getUserInfo(tokens.accessToken);

    // Upsert the connection (one per platform per user)
    await db.socialConnection.upsert({
      where: {
        userId_platform: {
          userId: user.id,
          platform: platform.toUpperCase() as any,
        },
      },
      create: {
        userId: user.id,
        platform: platform.toUpperCase() as any,
        platformUserId: userInfo.platformUserId,
        platformUsername: userInfo.platformUsername,
        platformAvatarUrl: userInfo.platformAvatarUrl,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.tokenExpiresAt,
        scopes: tokens.scopes ?? [],
        isActive: true,
        error: null,
      },
      update: {
        platformUserId: userInfo.platformUserId,
        platformUsername: userInfo.platformUsername,
        platformAvatarUrl: userInfo.platformAvatarUrl,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? undefined,
        tokenExpiresAt: tokens.tokenExpiresAt,
        scopes: tokens.scopes ?? [],
        isActive: true,
        error: null,
      },
    });

    // Clear the OAuth state cookie
    const response = NextResponse.redirect(settingsUrl);
    response.cookies.delete(`oauth_state_${platform}`);
    settingsUrl.searchParams.set('connected', platform);

    return NextResponse.redirect(settingsUrl);
  } catch (error: any) {
    console.error(`[oauth] ${platform} callback error:`, error);
    settingsUrl.searchParams.set('error', `Failed to connect ${platform}: ${error.message}`);
    return NextResponse.redirect(settingsUrl);
  }
}
