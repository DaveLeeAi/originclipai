// src/app/api/v1/onboarding/complete/route.ts

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db.profile.update({
    where: { id: user.id },
    data: { onboardingComplete: true },
  });

  return NextResponse.json({ ok: true });
}
