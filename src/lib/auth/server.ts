// src/lib/auth/server.ts

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Dev-mode auth bypass.
 * When DEV_AUTH_BYPASS=true and Supabase isn't configured, returns a fake user
 * so you can test the full pipeline locally without Supabase Auth.
 *
 * Set in .env.local:
 *   DEV_AUTH_BYPASS=true
 *   DEV_USER_ID=00000000-0000-0000-0000-000000000001
 *   DEV_USER_EMAIL=dev@localhost
 */
const DEV_BYPASS_ENABLED = process.env.DEV_AUTH_BYPASS === 'true';

const DEV_USER = DEV_BYPASS_ENABLED
  ? {
      id: process.env.DEV_USER_ID ?? '00000000-0000-0000-0000-000000000001',
      email: process.env.DEV_USER_EMAIL ?? 'dev@localhost',
      user_metadata: {
        full_name: 'Dev User',
        avatar_url: null,
      },
      app_metadata: {},
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString(),
    }
  : null;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    },
  );
}

/**
 * Get the current authenticated user or null.
 * Use in Server Components and API routes.
 *
 * In dev mode with DEV_AUTH_BYPASS=true, returns a fake user.
 */
export async function getUser() {
  if (DEV_USER) {
    return DEV_USER as ReturnType<Awaited<ReturnType<typeof createClient>>['auth']['getUser']> extends { data: { user: infer U } } ? U : never;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Require authentication — throws redirect if not authenticated.
 * Use at the top of protected Server Components.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    const { redirect } = await import('next/navigation');
    redirect('/sign-in');
  }
  return user;
}
