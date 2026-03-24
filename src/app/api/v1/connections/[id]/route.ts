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

    const conn = await prisma.socialConnection.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!conn || conn.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.socialConnection.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[api] DELETE /api/v1/connections/${params.id} error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
