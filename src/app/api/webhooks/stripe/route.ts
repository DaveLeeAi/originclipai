// src/app/api/webhooks/stripe/route.ts

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db/client';
import { Plan } from '@prisma/client';

function getStripeClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  });
}

// Plan mapping: Stripe price ID → app plan + limits
const PLAN_MAP: Record<string, { plan: string; minutesLimit: number }> = {
  [process.env.STRIPE_PRICE_CREATOR ?? 'price_creator']: { plan: 'creator', minutesLimit: 300 },
  [process.env.STRIPE_PRICE_PRO ?? 'price_pro']: { plan: 'pro', minutesLimit: 900 },
  [process.env.STRIPE_PRICE_BUSINESS ?? 'price_business']: { plan: 'business', minutesLimit: 2400 },
};

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  const stripe = getStripeClient();

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        // Unhandled event type — log and ignore
        console.log(`[stripe-webhook] Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[stripe-webhook] Error handling ${event.type}:`, err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

// --- HANDLERS ---

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!customerId || !subscriptionId) return;

  // Fetch the subscription to get the plan details
  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const planInfo = priceId ? PLAN_MAP[priceId] : null;

  if (!planInfo) {
    console.error(`[stripe-webhook] Unknown price ID: ${priceId}`);
    return;
  }

  // Find user by Stripe customer ID
  await db.profile.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      plan: planInfo.plan as Plan,
      minutesLimit: planInfo.minutesLimit,
      stripeSubscriptionId: subscriptionId,
      billingCycleStart: new Date(subscription.billing_cycle_anchor * 1000),
    },
  });

  console.log(`[stripe-webhook] Checkout complete: customer=${customerId}, plan=${planInfo.plan}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const planInfo = priceId ? PLAN_MAP[priceId] : null;

  if (!planInfo) return;

  // Handle plan changes (upgrade/downgrade)
  await db.profile.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      plan: planInfo.plan as Plan,
      minutesLimit: planInfo.minutesLimit,
      stripeSubscriptionId: subscription.id,
    },
  });

  console.log(`[stripe-webhook] Subscription updated: customer=${customerId}, plan=${planInfo.plan}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Downgrade to free
  await db.profile.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      plan: 'free',
      minutesLimit: 30,
      stripeSubscriptionId: null,
    },
  });

  console.log(`[stripe-webhook] Subscription cancelled: customer=${customerId}, downgraded to free`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  // Reset usage on successful payment (new billing cycle)
  const stripe = getStripeClient();
  const subscriptionId = invoice.parent?.subscription_details?.subscription as string | undefined;
  const subscription = subscriptionId
    ? await stripe.subscriptions.retrieve(subscriptionId)
    : null;

  await db.profile.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      minutesUsedThisCycle: 0,
      billingCycleStart: subscription
        ? new Date(subscription.billing_cycle_anchor * 1000)
        : new Date(),
    },
  });

  console.log(`[stripe-webhook] Payment succeeded: customer=${customerId}, usage reset`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  // Log the failure — don't downgrade immediately (Stripe handles retry)
  console.warn(`[stripe-webhook] Payment failed: customer=${customerId}, invoice=${invoice.id}`);

  // Optionally: mark the profile with a payment_issue flag for UI display
  // Not implemented in v1 — Stripe's dunning handles retries
}
