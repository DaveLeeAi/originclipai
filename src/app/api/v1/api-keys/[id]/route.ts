// src/app/api/v1/api-keys/[id]/route.ts

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';

/**
 * DELETE /api/v1/api-keys/:id — revoke an API key
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const key = await db.apiKey.findFirst({
    where: { id, userId: user.id },
  });

  if (!key) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  }

  await db.apiKey.update({
    where: { id },
    data: { isActive: false, revokedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
