// src/app/(dashboard)/layout.tsx

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/auth/server';
import { AppShell } from '@/components/layout/app-shell';
import { OnboardingWrapper } from '@/components/onboarding/onboarding-wrapper';
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

  // Fetch profile for sidebar meter and onboarding state
  const profile = await db.profile.findUnique({
    where: { id: user.id },
    select: {
      plan: true,
      minutesUsedThisCycle: true,
      minutesLimit: true,
      onboardingComplete: true,
      displayName: true,
    },
  });

  const showOnboarding = !profile?.onboardingComplete;

  return (
    <AppShell
      minutesUsed={profile?.minutesUsedThisCycle ?? 0}
      minutesLimit={profile?.minutesLimit ?? 30}
      plan={profile?.plan ?? 'Free'}
    >
      {showOnboarding && (
        <OnboardingWrapper userName={profile?.displayName ?? undefined} />
      )}
      {children}
    </AppShell>
  );
}
