import { NextResponse } from 'next/server';
import { createPortalSession } from '@/lib/billing';
import { getSessionUserId } from '@/lib/auth';
import { z } from 'zod';

const portalSchema = z.object({
  returnUrl: z.string().url(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await request.json();
    const input = portalSchema.parse(body);

    const url = await createPortalSession(userId, input.returnUrl);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('[api] POST /api/v1/billing/portal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
