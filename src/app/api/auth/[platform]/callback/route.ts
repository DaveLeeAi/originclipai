import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSocialAdapter } from '@/lib/social';
import { prisma } from '@/lib/db/client';
import type { Platform } from '@prisma/client';

const VALID_PLATFORMS = ['youtube', 'tiktok', 'linkedin', 'x'] as const;
type ValidPlatform = (typeof VALID_PLATFORMS)[number];

function isValidPlatform(platform: string): platform is ValidPlatform {
  return (VALID_PLATFORMS as readonly string[]).includes(platform);
}

/**
 * Map route platform param to Prisma Platform enum value.
 */
function toPrismaplatform(platform: ValidPlatform): Platform {
  const map: Record<ValidPlatform, Platform> = {
    youtube: 'youtube',
    tiktok: 'tiktok',
    linkedin: 'linkedin',
    x: 'x',
  };
  return map[platform];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } },
): Promise<NextResponse> {
  const { origin } = new URL(request.url);
  const settingsUrl = `${origin}/settings/connections`;

  try {
    const { platform } = params;

    if (!isValidPlatform(platform)) {
      return NextResponse.redirect(`${settingsUrl}?error=unsupported_platform`);
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error(`[oauth] ${platform} callback error from provider:`, error);
      return NextResponse.redirect(`${settingsUrl}?error=provider_denied`);
    }

    if (!code) {
      return NextResponse.redirect(`${settingsUrl}?error=no_code`);
    }

    // Authenticate the current user via Supabase session cookie
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(
            cookiesToSet: {
              name: string;
              value: string;
              options?: Record<string, unknown>;
            }[],
          ) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              // Called from Server Component — ignorable with middleware refreshing sessions.
            }
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${origin}/sign-in?error=not_authenticated`);
    }

    // Exchange code for tokens
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      throw new Error('NEXT_PUBLIC_APP_URL is not configured');
    }

    const redirectUri = `${appUrl}/api/auth/${platform}/callback`;
    const adapter = getSocialAdapter(platform);
    const tokens = await adapter.exchangeCode(code, redirectUri);

    // Get user info from the platform
    const userInfo = await adapter.getUserInfo(tokens.accessToken);

    // Upsert social connection
    const prismaPlatform = toPrismaplatform(platform);

    await prisma.socialConnection.upsert({
      where: {
        userId_platform: {
          userId: user.id,
          platform: prismaPlatform,
        },
      },
      create: {
        userId: user.id,
        platform: prismaPlatform,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        tokenExpiresAt: tokens.tokenExpiresAt ?? null,
        scopes: tokens.scopes ?? [],
        platformUserId: userInfo.platformUserId,
        platformUsername: userInfo.platformUsername,
        platformAvatarUrl: userInfo.platformAvatarUrl ?? null,
        isActive: true,
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        tokenExpiresAt: tokens.tokenExpiresAt ?? null,
        scopes: tokens.scopes ?? [],
        platformUserId: userInfo.platformUserId,
        platformUsername: userInfo.platformUsername,
        platformAvatarUrl: userInfo.platformAvatarUrl ?? null,
        isActive: true,
        error: null,
      },
    });

    return NextResponse.redirect(`${settingsUrl}?success=${platform}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[oauth] callback error:', message);
    return NextResponse.redirect(`${settingsUrl}?error=connection_failed`);
  }
}
