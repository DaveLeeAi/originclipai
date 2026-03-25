import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getUser } from '@/lib/auth/server';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  defaultCaptionStyle: z
    .enum(['karaoke', 'boxed', 'minimal', 'impact', 'subtitle'])
    .optional(),
  onboardingComplete: z.literal(true).optional(),
});

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        defaultCaptionStyle: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('[api] GET /api/v1/settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await request.json();
    const input = updateSettingsSchema.parse(body);

    await prisma.profile.update({
      where: { id: user.id },
      data: {
        ...(input.defaultCaptionStyle !== undefined
          ? { defaultCaptionStyle: input.defaultCaptionStyle }
          : {}),
        ...(input.onboardingComplete === true
          ? { onboardingComplete: true }
          : {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('[api] PATCH /api/v1/settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
