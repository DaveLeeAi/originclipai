import { NextResponse, type NextRequest } from 'next/server';
import { getSocialAdapter } from '@/lib/social';
import { getUser } from '@/lib/auth/server';
import crypto from 'crypto';

const VALID_PLATFORMS = ['youtube', 'tiktok', 'linkedin', 'x'] as const;
type ValidPlatform = (typeof VALID_PLATFORMS)[number];

function isValidPlatform(platform: string): platform is ValidPlatform {
  return (VALID_PLATFORMS as readonly string[]).includes(platform);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } },
): Promise<NextResponse> {
  try {
    const { platform } = params;

    if (!isValidPlatform(platform)) {
      const origin = new URL(request.url).origin;
      return NextResponse.redirect(
        `${origin}/settings/connections?error=unsupported_platform`,
      );
    }

    // Require authenticated user
    const user = await getUser();
    if (!user) {
      const origin = new URL(request.url).origin;
      return NextResponse.redirect(`${origin}/sign-in`);
    }

    const adapter = getSocialAdapter(platform);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      throw new Error('NEXT_PUBLIC_APP_URL is not configured');
    }

    const redirectUri = `${appUrl}/api/auth/${platform}/callback`;
    const state = crypto.randomUUID();

    const authUrl = adapter.getAuthUrl(redirectUri, state);

    return NextResponse.redirect(authUrl);
  } catch (error: unknown) {
    console.error('[oauth] authorize error:', error);
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(
      `${origin}/settings/connections?error=auth_init_failed`,
    );
  }
}
