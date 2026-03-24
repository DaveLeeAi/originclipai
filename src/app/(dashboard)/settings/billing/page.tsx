'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UsageStatus {
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  percentUsed: number;
  isOverLimit: boolean;
  plan: string;
}

const PLANS = [
  {
    key: 'FREE',
    name: 'Free',
    price: 0,
    minutes: 30,
    features: ['2 concurrent jobs', '720p export', 'Watermarked'],
  },
  {
    key: 'CREATOR',
    name: 'Creator',
    price: 19,
    minutes: 300,
    features: ['5 concurrent jobs', '1080p export', 'No watermark'],
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: 39,
    minutes: 900,
    features: ['5 concurrent jobs', '1080p export', 'API access', 'Custom prompts', 'Priority processing'],
    popular: true,
  },
  {
    key: 'BUSINESS',
    name: 'Business',
    price: 79,
    minutes: 2400,
    features: ['10 concurrent jobs', '1080p export', 'API access', 'Custom prompts', 'Priority processing'],
  },
];

export default function BillingPage() {
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/billing/usage')
      .then((res) => res.json())
      .then((data) => {
        setUsage(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleUpgrade = async (planKey: string) => {
    setUpgrading(planKey);
    try {
      const res = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planKey,
          successUrl: `${window.location.origin}/settings/billing?success=true`,
          cancelUrl: `${window.location.origin}/settings/billing`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      }
    } finally {
      setUpgrading(null);
    }
  };

  const handleManage = async () => {
    const res = await fetch('/api/v1/billing/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnUrl: window.location.href }),
    });
    if (res.ok) {
      const data = await res.json();
      window.location.href = data.url;
    }
  };

  const currentPlan = usage?.plan?.toUpperCase() ?? 'FREE';

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Billing</h1>
      <p className="mb-8 text-sm text-[#6b6960]">Manage your plan and usage.</p>

      {/* Usage meter */}
      {usage && (
        <div className="mb-8 max-w-[560px] rounded-2xl border border-[#e4e2dd] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-[0.1em] text-[#a09e96]">
              Current usage
            </div>
            <Badge variant={usage.isOverLimit ? 'red' : 'green'}>
              {usage.plan}
            </Badge>
          </div>
          <div className="mb-2 h-2 overflow-hidden rounded-full bg-[#e4e2dd]">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                usage.percentUsed >= 90
                  ? 'bg-[#dc2626]'
                  : usage.percentUsed >= 70
                    ? 'bg-[#d97706]'
                    : 'bg-[#5046e5]',
              )}
              style={{ width: `${Math.min(100, usage.percentUsed)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-mono text-[#6b6960]">
              {usage.minutesUsed} / {usage.minutesLimit} minutes used
            </span>
            <span className="text-[#a09e96]">{usage.minutesRemaining} remaining</span>
          </div>
          {currentPlan !== 'FREE' && (
            <button
              onClick={handleManage}
              className="mt-4 text-xs font-semibold text-[#5046e5] hover:underline"
            >
              Manage subscription via Stripe →
            </button>
          )}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid max-w-[900px] gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;

          return (
            <div
              key={plan.key}
              className={cn(
                'rounded-2xl border bg-white p-5 shadow-sm transition-all',
                plan.popular
                  ? 'border-[#5046e5] ring-1 ring-[#5046e5]/20'
                  : 'border-[#e4e2dd]',
                isCurrent && 'ring-2 ring-[#5046e5]/30',
              )}
            >
              {plan.popular && (
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#5046e5]">
                  Most popular
                </div>
              )}
              <div className="mb-1 text-[15px] font-bold">{plan.name}</div>
              <div className="mb-1">
                <span className="text-2xl font-bold">${plan.price}</span>
                <span className="text-sm text-[#6b6960]">/mo</span>
              </div>
              <div className="mb-4 font-mono text-xs text-[#a09e96]">
                {plan.minutes} min/month
              </div>
              <ul className="mb-5 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-[#6b6960]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <Badge variant="accent">Current plan</Badge>
              ) : plan.key === 'FREE' ? null : (
                <Button
                  variant={plan.popular ? 'primary' : 'secondary'}
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={upgrading === plan.key}
                >
                  {upgrading === plan.key ? 'Redirecting...' : 'Upgrade'}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
