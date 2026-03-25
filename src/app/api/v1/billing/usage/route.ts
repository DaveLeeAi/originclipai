import { NextResponse } from 'next/server';
import { getUsageStatus } from '@/lib/billing';
import { getUser } from '@/lib/auth/server';

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    const usage = await getUsageStatus(userId);
    return NextResponse.json(usage);
  } catch (error) {
    console.error('[api] GET /api/v1/billing/usage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
