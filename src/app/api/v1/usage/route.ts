// src/app/api/v1/usage/route.ts

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getUsageStatus } from '@/lib/billing';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const usage = await getUsageStatus(user.id);
  return NextResponse.json(usage);
}
