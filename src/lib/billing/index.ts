// src/lib/billing/index.ts

import Stripe from 'stripe';
import { prisma as db } from '@/lib/db/client';

// --- STRIPE CLIENT ---

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-02-25.clover',
    });
  }
  return _stripe;
}

// --- PLAN DEFINITIONS ---

export interface PlanDefinition {
  name: string;
  minutesLimit: number;
  maxConcurrentJobs: number;
  hasApi: boolean;
  hasCustomPrompts: boolean;
  hasPriorityProcessing: boolean;
  watermark: boolean;
  maxResolution: '720p' | '1080p';
  stripePriceId: string | null;
}

export const PLANS: Record<string, PlanDefinition> = {
  FREE: {
    name: 'Free',
    minutesLimit: 30,
    maxConcurrentJobs: 2,
    hasApi: false,
    hasCustomPrompts: false,
    hasPriorityProcessing: false,
    watermark: true,
    maxResolution: '720p',
    stripePriceId: null,
  },
  CREATOR: {
    name: 'Creator',
    minutesLimit: 300,
    maxConcurrentJobs: 5,
    hasApi: false,
    hasCustomPrompts: false,
    hasPriorityProcessing: false,
    watermark: false,
    maxResolution: '1080p',
    stripePriceId: process.env.STRIPE_PRICE_CREATOR ?? null,
  },
  PRO: {
    name: 'Pro',
    minutesLimit: 900,
    maxConcurrentJobs: 5,
    hasApi: true,
    hasCustomPrompts: true,
    hasPriorityProcessing: true,
    watermark: false,
    maxResolution: '1080p',
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
  },
  BUSINESS: {
    name: 'Business',
    minutesLimit: 2400,
    maxConcurrentJobs: 10,
    hasApi: true,
    hasCustomPrompts: true,
    hasPriorityProcessing: true,
    watermark: false,
    maxResolution: '1080p',
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS ?? null,
  },
};

// --- USAGE TRACKING ---

export interface UsageStatus {
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  percentUsed: number;
  isOverLimit: boolean;
  plan: string;
}

/**
 * Get current usage status for a user.
 */
export async function getUsageStatus(userId: string): Promise<UsageStatus> {
  const profile = await db.profile.findUniqueOrThrow({
    where: { id: userId },
    select: { plan: true, minutesUsedThisCycle: true, minutesLimit: true },
  });

  const remaining = Math.max(0, profile.minutesLimit - profile.minutesUsedThisCycle);

  return {
    minutesUsed: profile.minutesUsedThisCycle,
    minutesLimit: profile.minutesLimit,
    minutesRemaining: remaining,
    percentUsed: profile.minutesLimit > 0
      ? Math.round((profile.minutesUsedThisCycle / profile.minutesLimit) * 100)
      : 0,
    isOverLimit: profile.minutesUsedThisCycle >= profile.minutesLimit,
    plan: profile.plan,
  };
}

/**
 * Check if user can start a new job of given duration.
 * Returns { allowed, reason } — reason is human-readable if not allowed.
 */
export async function canStartJob(
  userId: string,
  estimatedMinutes: number,
): Promise<{ allowed: boolean; reason?: string }> {
  const profile = await db.profile.findUniqueOrThrow({
    where: { id: userId },
    select: { plan: true, minutesUsedThisCycle: true, minutesLimit: true },
  });

  const plan = PLANS[profile.plan] ?? PLANS.FREE;

  // Check minute limit
  if (profile.minutesUsedThisCycle + estimatedMinutes > profile.minutesLimit) {
    return {
      allowed: false,
      reason: `You've used ${profile.minutesUsedThisCycle} of ${profile.minutesLimit} minutes this month. This job requires ~${estimatedMinutes} minutes. Upgrade your plan for more minutes.`,
    };
  }

  // Check concurrent job limit
  const activeJobs = await db.job.count({
    where: {
      userId,
      status: { in: ['created', 'ingesting', 'transcribing', 'analyzing', 'rendering'] },
    },
  });

  if (activeJobs >= plan.maxConcurrentJobs) {
    return {
      allowed: false,
      reason: `You have ${activeJobs} active jobs. Your ${plan.name} plan allows ${plan.maxConcurrentJobs} concurrent jobs. Wait for a job to complete or upgrade.`,
    };
  }

  return { allowed: true };
}

/**
 * Record minutes consumed by a completed job.
 * Called by the worker when a job finishes processing.
 */
export async function recordUsage(userId: string, minutes: number): Promise<void> {
  await db.profile.update({
    where: { id: userId },
    data: {
      minutesUsedThisCycle: { increment: Math.ceil(minutes) },
    },
  });
}

/**
 * Check if a feature is available on the user's plan.
 */
export async function checkFeatureAccess(
  userId: string,
  feature: keyof Omit<PlanDefinition, 'name' | 'minutesLimit' | 'maxConcurrentJobs' | 'stripePriceId'>,
): Promise<boolean> {
  const profile = await db.profile.findUniqueOrThrow({
    where: { id: userId },
    select: { plan: true },
  });

  const plan = PLANS[profile.plan] ?? PLANS.FREE;
  return !!plan[feature];
}

// --- STRIPE CHECKOUT ---

/**
 * Create a Stripe Checkout session for upgrading to a paid plan.
 */
export async function createCheckoutSession(
  userId: string,
  targetPlan: string,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const stripe = getStripe();
  const planDef = PLANS[targetPlan];

  if (!planDef?.stripePriceId) {
    throw new Error(`No Stripe price configured for plan: ${targetPlan}`);
  }

  const profile = await db.profile.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, stripeCustomerId: true },
  });

  // Get or create Stripe customer
  let customerId = profile.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      metadata: { userId },
    });
    customerId = customer.id;

    await db.profile.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: planDef.stripePriceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: { userId, plan: targetPlan },
    },
  });

  return session.url!;
}

/**
 * Create a Stripe Billing Portal session for managing subscription.
 */
export async function createPortalSession(
  userId: string,
  returnUrl: string,
): Promise<string> {
  const stripe = getStripe();

  const profile = await db.profile.findUniqueOrThrow({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!profile.stripeCustomerId) {
    throw new Error('No Stripe customer ID found. User has never subscribed.');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}
