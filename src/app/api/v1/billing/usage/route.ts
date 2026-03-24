import { NextResponse } from 'next/server';
import { getUsageStatus } from '@/lib/billing';
import { getSessionUserId } from '@/lib/auth';

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usage = await getUsageStatus(userId);
    return NextResponse.json(usage);
  } catch (error) {
    console.error('[api] GET /api/v1/billing/usage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
