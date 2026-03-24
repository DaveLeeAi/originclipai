import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getSessionUserId } from '@/lib/auth';
import { z } from 'zod';
import { createHash, randomBytes } from 'crypto';

const createKeySchema = z.object({
  name: z.string().min(1).max(100).default('Default'),
});

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        isActive: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('[api] GET /api/v1/api-keys error:', error);
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
    const input = createKeySchema.parse(body);

    // Generate API key
    const rawKey = `oc_${randomBytes(32).toString('hex')}`;
    const keyPrefix = rawKey.slice(0, 10);
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        keyPrefix,
        keyHash,
        name: input.name,
      },
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        isActive: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ key: rawKey, apiKey }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('[api] POST /api/v1/api-keys error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
