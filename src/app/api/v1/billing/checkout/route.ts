// src/app/api/v1/billing/checkout/route.ts

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { createCheckoutSession } from '@/lib/billing';

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan } = await req.json();

  if (!['creator', 'pro', 'business'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  try {
    const url = await createCheckoutSession(
      user.id,
      plan,
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?cancelled=true`,
    );

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
