import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * POST /api/v1/auth/sign-up
 *
 * Phase 3 stub: creates a profile and sets session cookie.
 * Phase 5 will use Supabase Auth with proper password hashing.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const input = signUpSchema.parse(body);

    // Check for existing user
    const existing = await prisma.profile.findFirst({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    // TODO: Phase 5 — create Supabase Auth user, use their UUID
    // For now, generate a profile directly
    const profile = await prisma.profile.create({
      data: {
        id: crypto.randomUUID(),
        email: input.email,
        plan: 'free',
        minutesLimit: 30,
      },
    });

    const response = NextResponse.json({ success: true, userId: profile.id });
    response.cookies.set('session_user_id', profile.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('[api] POST /api/v1/auth/sign-up error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
