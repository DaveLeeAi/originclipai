// src/app/api/v1/connections/[id]/route.ts

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const connection = await db.socialConnection.findFirst({
    where: { id, userId: user.id },
  });

  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  await db.socialConnection.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
