// src/app/api/v1/connections/route.ts

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';

/**
 * GET /api/v1/connections — list user's social connections
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const connections = await db.socialConnection.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      platform: true,
      platformUsername: true,
      platformAvatarUrl: true,
      isActive: true,
      lastUsedAt: true,
      error: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ connections });
}
