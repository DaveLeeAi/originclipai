// src/app/(dashboard)/layout.tsx

import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { AppShell } from '@/components/layout/app-shell';
import { OnboardingWrapper } from '@/components/onboarding/onboarding-wrapper';
import { db } from '@/lib/db/client';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Fetch profile for sidebar meter and onboarding state
  let profile = await db.profile.findUnique({
    where: { id: user.id },
    select: {
      plan: true,
      minutesUsedThisCycle: true,
      minutesLimit: true,
      onboardingComplete: true,
      displayName: true,
    },
  });

  if (!profile) {
    profile = await db.profile.create({
      data: {
        id: user.id,
        email: user.email!,
        displayName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        avatarUrl: user.user_metadata?.avatar_url ?? null,
        plan: 'free',
        minutesLimit: 30,
        minutesUsedThisCycle: 0,
        billingCycleStart: new Date(),
        onboardingComplete: false,
      },
      select: {
        plan: true,
        minutesUsedThisCycle: true,
        minutesLimit: true,
        onboardingComplete: true,
        displayName: true,
      },
    });
  }

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
