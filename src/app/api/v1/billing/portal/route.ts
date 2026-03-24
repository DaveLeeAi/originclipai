// src/app/api/v1/billing/portal/route.ts

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { createPortalSession } from '@/lib/billing';

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const url = await createPortalSession(
      user.id,
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    );

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Portal session failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
