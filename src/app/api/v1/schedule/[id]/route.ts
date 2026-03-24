import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getSessionUserId } from '@/lib/auth';
import { z } from 'zod';

const updateScheduleSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(['queued', 'cancelled']).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const post = await prisma.scheduledPost.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!post || post.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body: unknown = await request.json();
    const input = updateScheduleSchema.parse(body);

    const updated = await prisma.scheduledPost.update({
      where: { id: params.id },
      data: {
        ...(input.scheduledAt ? { scheduledAt: new Date(input.scheduledAt) } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error(`[api] PATCH /api/v1/schedule/${params.id} error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
