// src/app/(dashboard)/settings/billing/page.tsx
'use client';

import { useUsage } from '@/lib/hooks/use-jobs';
import { BillingManager } from '@/components/settings/billing-manager';

export default function BillingPage() {
  const { minutesUsed, minutesLimit, plan } = useUsage();

  const handleUpgrade = async (targetPlan: string) => {
    const res = await fetch('/api/v1/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: targetPlan }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const handleManageBilling = async () => {
    const res = await fetch('/api/v1/billing/portal', { method: 'POST' });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your plan and usage</p>
      </div>
      <div className="max-w-4xl">
        <BillingManager
          currentPlan={plan}
          minutesUsed={minutesUsed}
          minutesLimit={minutesLimit}
          onUpgrade={handleUpgrade}
          onManageBilling={handleManageBilling}
        />
      </div>
    </div>
  );
}
