import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/client';

/**
 * Get the authenticated user ID from the session cookie.
 *
 * Phase 3 uses a simple cookie-based approach.
 * Phase 5 will integrate Supabase Auth with proper JWT verification.
 */
export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session_user_id');

  if (sessionCookie?.value) {
    return sessionCookie.value;
  }

  // Fallback for development: use DEFAULT_USER_ID env var
  return process.env.DEFAULT_USER_ID ?? null;
}

/**
 * Get the authenticated user's profile, or null if not authenticated.
 */
export async function getSessionProfile() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      plan: true,
      minutesUsedThisCycle: true,
      minutesLimit: true,
      defaultCaptionStyle: true,
    },
  });

  return profile;
}

/**
 * Require authentication. Returns profile or throws redirect.
 */
export async function requireAuth() {
  const profile = await getSessionProfile();
  if (!profile) {
    throw new Error('UNAUTHENTICATED');
  }
  return profile;
}
