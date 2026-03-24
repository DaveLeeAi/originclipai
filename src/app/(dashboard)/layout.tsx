import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect('/sign-in');
  }

  const planLabel =
    profile.plan === 'free'
      ? 'Free'
      : profile.plan === 'creator'
        ? 'Creator'
        : profile.plan === 'pro'
          ? 'Pro'
          : 'Business';

  return (
    <AppShell
      minutesUsed={profile.minutesUsedThisCycle}
      minutesLimit={profile.minutesLimit}
      plan={planLabel}
    >
      {children}
    </AppShell>
  );
}
