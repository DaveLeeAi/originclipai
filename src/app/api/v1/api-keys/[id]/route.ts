import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getSessionUserId } from '@/lib/auth';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const key = await prisma.apiKey.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!key || key.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.apiKey.update({
      where: { id: params.id },
      data: { isActive: false, revokedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[api] DELETE /api/v1/api-keys/${params.id} error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
