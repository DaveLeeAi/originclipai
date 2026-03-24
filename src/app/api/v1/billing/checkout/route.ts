import { NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/billing';
import { getSessionUserId } from '@/lib/auth';
import { z } from 'zod';

const checkoutSchema = z.object({
  plan: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await request.json();
    const input = checkoutSchema.parse(body);

    const url = await createCheckoutSession(
      userId,
      input.plan,
      input.successUrl,
      input.cancelUrl,
    );

    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('[api] POST /api/v1/billing/checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
