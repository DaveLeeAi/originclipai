import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/v1/auth/sign-in
 *
 * Phase 3 stub: looks up profile by email and sets a session cookie.
 * Phase 5 will use Supabase Auth with proper password verification.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const input = signInSchema.parse(body);

    const profile = await prisma.profile.findFirst({
      where: { email: input.email },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    // TODO: Phase 5 — verify password via Supabase Auth
    // For now, any existing profile can sign in (dev mode)

    const response = NextResponse.json({ success: true });
    response.cookies.set('session_user_id', profile.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('[api] POST /api/v1/auth/sign-in error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
