import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getSessionUserId } from '@/lib/auth';

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await prisma.socialConnection.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        platformUsername: true,
        isActive: true,
        lastUsedAt: true,
        error: true,
      },
    });

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('[api] GET /api/v1/connections error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
