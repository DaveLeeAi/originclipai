// src/components/settings/billing-manager.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BillingManagerProps {
  currentPlan: string;
  minutesUsed: number;
  minutesLimit: number;
  billingCycleStart?: Date;
  onUpgrade: (plan: string) => void;
  onManageBilling: () => void;
}

const PLANS: Array<{
  key: string;
  name: string;
  price: string;
  period: string;
  minutes: string;
  popular?: boolean;
  features: string[];
}> = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    minutes: '30 min/month',
    features: ['Watermarked clips', '720p export', 'Basic text outputs'],
  },
  {
    key: 'creator',
    name: 'Creator',
    price: '$19',
    period: '/mo',
    minutes: '300 min/month',
    features: ['No watermark', '1080p', 'All outputs', 'Scheduling'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$39',
    period: '/mo',
    minutes: '900 min/month',
    popular: true,
    features: ['Everything in Creator', 'API access', 'Custom prompts', 'Priority processing'],
  },
  {
    key: 'business',
    name: 'Business',
    price: '$79',
    period: '/mo',
    minutes: '2,400 min/month',
    features: ['Everything in Pro', 'Team seats (soon)', 'White-label export', 'SLA'],
  },
];

export function BillingManager({
  currentPlan,
  minutesUsed,
  minutesLimit,
  billingCycleStart,
  onUpgrade,
  onManageBilling,
}: BillingManagerProps) {
  const usagePct = minutesLimit > 0 ? Math.min(100, Math.round((minutesUsed / minutesLimit) * 100)) : 0;
  const daysUntilReset = billingCycleStart
    ? Math.max(0, 30 - Math.floor((Date.now() - new Date(billingCycleStart).getTime()) / 86400000))
    : null;

  return (
    <div>
      {/* Current usage */}
      <Card className="mb-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Current usage</h3>
            <p className="text-xs text-[#a09e96]">
              {currentPlan} plan
              {daysUntilReset !== null && ` · Resets in ${daysUntilReset} days`}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold">{minutesUsed}</span>
            <span className="text-sm text-[#a09e96]"> / {minutesLimit} min</span>
          </div>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#e4e2dd]">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              usagePct >= 90 ? 'bg-[#dc2626]' : usagePct >= 70 ? 'bg-[#d97706]' : 'bg-[#5046e5]',
            )}
            style={{ width: `${usagePct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-[#a09e96]">
          <span>{usagePct}% used</span>
          <span>{minutesLimit - minutesUsed} min remaining</span>
        </div>
      </Card>

      {/* Plan cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isDowngrade = PLANS.findIndex(p => p.key === currentPlan) > PLANS.findIndex(p => p.key === plan.key);

          return (
            <div
              key={plan.key}
              className={cn(
                'rounded-2xl border p-5',
                isCurrent
                  ? 'border-[#5046e5] bg-[#5046e5]/[0.03] shadow-md shadow-indigo-500/10'
                  : 'border-[#e4e2dd] bg-white shadow-sm',
              )}
            >
              {plan.popular && !isCurrent && (
                <Badge variant="accent" className="mb-2">Most popular</Badge>
              )}
              {isCurrent && (
                <Badge variant="green" className="mb-2">Current plan</Badge>
              )}
              <h3 className="text-base font-bold">{plan.name}</h3>
              <div className="mt-1 mb-0.5">
                <span className="text-2xl font-bold">{plan.price}</span>
                <span className="text-xs text-[#6b6960]">{plan.period}</span>
              </div>
              <div className="mb-4 text-xs font-semibold text-[#5046e5]">{plan.minutes}</div>
              <ul className="mb-5 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-[#6b6960]">
                    <span className="mt-0.5 text-[#16a34a]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={onManageBilling}
                >
                  Manage billing
                </Button>
              ) : (
                <Button
                  variant={isDowngrade ? 'ghost' : 'primary'}
                  size="sm"
                  className="w-full"
                  onClick={() => onUpgrade(plan.key)}
                >
                  {isDowngrade ? 'Downgrade' : plan.key === 'free' ? 'Downgrade' : 'Upgrade'}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Manage subscription */}
      {currentPlan !== 'free' && (
        <Card className="p-4 text-center">
          <p className="text-sm text-[#6b6960]">
            Need to update payment method, view invoices, or cancel?{' '}
            <button
              onClick={onManageBilling}
              className="font-semibold text-[#5046e5] hover:underline"
            >
              Manage subscription →
            </button>
          </p>
        </Card>
      )}
    </div>
  );
}
