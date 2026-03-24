// src/app/api/v1/api-keys/route.ts

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { checkFeatureAccess } from '@/lib/billing';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * GET /api/v1/api-keys — list user's API keys
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const keys = await db.apiKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      keyPrefix: true,
      name: true,
      isActive: true,
      lastUsedAt: true,
      usageCount: true,
      createdAt: true,
      revokedAt: true,
    },
  });

  return NextResponse.json({ keys });
}

/**
 * POST /api/v1/api-keys — create a new API key
 */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasAccess = await checkFeatureAccess(user.id, 'hasApi');
  if (!hasAccess) {
    return NextResponse.json({ error: 'API access requires Pro or Business plan' }, { status: 403 });
  }

  const { name } = await req.json();

  if (!name || typeof name !== 'string' || name.length > 100) {
    return NextResponse.json({ error: 'Invalid key name' }, { status: 400 });
  }

  // Generate key: sk_live_ + 32 random bytes as hex
  const rawKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
  const keyPrefix = rawKey.slice(0, 16); // sk_live_a1b2c3d4
  const keyHash = await bcrypt.hash(rawKey, 10);

  await db.apiKey.create({
    data: {
      userId: user.id,
      keyPrefix,
      keyHash,
      name: name.trim(),
    },
  });

  // Return the raw key ONCE — it's never stored or shown again
  return NextResponse.json({ key: rawKey, prefix: keyPrefix }, { status: 201 });
}
