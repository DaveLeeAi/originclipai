import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getSessionUserId } from '@/lib/auth';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  defaultCaptionStyle: z.enum(['karaoke', 'subtitle', 'minimal']).optional(),
  onboardingComplete: z.literal(true).optional(),
});

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await request.json();
    const input = updateSettingsSchema.parse(body);

    await prisma.profile.update({
      where: { id: userId },
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
