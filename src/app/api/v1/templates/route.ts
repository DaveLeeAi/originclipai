import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getSessionUserId } from '@/lib/auth';
import { z } from 'zod';

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  outputType: z.string().default('custom'),
  promptText: z.string().min(1),
  description: z.string().optional(),
});

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.promptTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        outputType: true,
        promptText: true,
        description: true,
        isActive: true,
        usageCount: true,
      },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('[api] GET /api/v1/templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await request.json();
    const input = createTemplateSchema.parse(body);

    const template = await prisma.promptTemplate.create({
      data: {
        userId,
        name: input.name,
        outputType: input.outputType as 'custom',
        promptText: input.promptText,
        description: input.description ?? null,
      },
      select: {
        id: true,
        name: true,
        outputType: true,
        promptText: true,
        description: true,
        isActive: true,
        usageCount: true,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('[api] POST /api/v1/templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
