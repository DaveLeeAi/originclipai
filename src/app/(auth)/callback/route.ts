// src/app/(auth)/callback/route.ts

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db/client';

/**
 * OAuth callback handler.
 * Exchanges the auth code for a session, creates/updates the profile,
 * and redirects to the dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') ?? '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=no_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`);
  }

  // Ensure profile exists
  const existingProfile = await db.profile.findUnique({
    where: { id: data.user.id },
  });

  if (!existingProfile) {
    await db.profile.create({
      data: {
        id: data.user.id,
        email: data.user.email!,
        displayName: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null,
        avatarUrl: data.user.user_metadata?.avatar_url ?? null,
        plan: 'free',
        minutesLimit: 30,
        minutesUsedThisCycle: 0,
        billingCycleStart: new Date(),
      },
    });
  }

  return NextResponse.redirect(`${origin}${redirect}`);
}
