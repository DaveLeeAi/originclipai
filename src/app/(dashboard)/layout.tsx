// src/app/(dashboard)/layout.tsx

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/auth/server';
import { AppShell } from '@/components/layout/app-shell';
import { db } from '@/lib/db/client';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Fetch usage for the sidebar meter
  const profile = await db.profile.findUnique({
    where: { id: user.id },
    select: { plan: true, minutesUsedThisCycle: true, minutesLimit: true },
  });

  return (
    <AppShell
      minutesUsed={profile?.minutesUsedThisCycle ?? 0}
      minutesLimit={profile?.minutesLimit ?? 30}
      plan={profile?.plan ?? 'Free'}
    >
      {children}
    </AppShell>
  );
}
