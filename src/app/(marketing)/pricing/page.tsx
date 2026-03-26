// src/app/(marketing)/pricing/page.tsx

import Link from 'next/link';

export const metadata = {
  title: 'Pricing — OriginClipAI',
  description: 'Simple pricing for content repurposing. Free tier with 30 minutes/month. Paid plans from $19/mo. No hidden AI credits.',
};

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    minutes: '30 min/month',
    description: 'Try OriginClipAI with no commitment.',
    features: [
      '30 processing minutes / month',
      'Watermarked clips',
      '720p export',
      'LinkedIn posts, X threads, newsletter sections',
      '2 concurrent jobs',
      'Community support',
    ],
    limitations: [
      'Watermark on video clips',
      '720p maximum resolution',
      'No scheduling',
      'No API access',
    ],
    cta: 'Start free',
    ctaHref: '/sign-up',
    highlight: false,
  },
  {
    name: 'Creator',
    price: '$19',
    period: '/month',
    annual: '$15/mo billed annually',
    minutes: '300 min/month',
    description: 'For creators who publish weekly.',
    features: [
      '300 processing minutes / month',
      'No watermark',
      '1080p export',
      'All text output types',
      'Scheduling to 4 platforms',
      '5 concurrent jobs',
      'SRT/VTT caption export',
      'Full export packages (ZIP)',
      'Email support',
    ],
    limitations: [],
    cta: 'Start 7-day trial',
    ctaHref: '/sign-up?plan=creator',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$39',
    period: '/month',
    annual: '$31/mo billed annually',
    minutes: '900 min/month',
    description: 'For prolific creators and API users.',
    features: [
      '900 processing minutes / month',
      'Everything in Creator',
      'Self-serve REST API',
      'Webhooks (job.completed, post.published)',
      'Custom prompt templates',
      'Priority processing queue',
      'Zapier / Make.com integration',
    ],
    limitations: [],
    cta: 'Start 7-day trial',
    ctaHref: '/sign-up?plan=pro',
    highlight: true,
    badge: 'Most popular',
  },
  {
    name: 'Business',
    price: '$79',
    period: '/month',
    annual: '$63/mo billed annually',
    minutes: '2,400 min/month',
    description: 'For high-volume creators and small teams.',
    features: [
      '2,400 processing minutes / month',
      'Everything in Pro',
      'Team seats (coming Q2 2026)',
      'White-label export (no branding)',
      'SLA (99.5% uptime)',
      'Priority email + chat support',
      '10 concurrent jobs',
    ],
    limitations: [],
    cta: 'Start 7-day trial',
    ctaHref: '/sign-up?plan=business',
    highlight: false,
  },
];

const FAQ = [
  {
    q: 'How are processing minutes calculated?',
    a: 'By the duration of your source content. A 60-minute YouTube video uses 60 minutes. A 30-minute podcast uses 30 minutes. Articles and PDFs count as 1 minute flat, regardless of length.',
  },
  {
    q: 'Does the number of clips or text outputs affect usage?',
    a: 'No. Whether you generate 5 clips or 20 clips from a video, the minutes consumed are the same — it\'s based on source duration only.',
  },
  {
    q: 'What happens when I hit my monthly limit?',
    a: 'You can\'t start new jobs until your cycle resets or you upgrade. Existing jobs and outputs remain accessible. We\'ll warn you at 80% usage.',
  },
  {
    q: 'Can I change plans anytime?',
    a: 'Yes. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your current billing cycle.',
  },
  {
    q: 'Is there an annual discount?',
    a: 'Yes. Annual billing saves ~20% on all paid plans. You can switch between monthly and annual in your billing settings.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit cards via Stripe. We don\'t store your card details — Stripe handles payment processing securely.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from Settings > Billing. No cancellation fees, no dark patterns, no retention calls. Your plan downgrades to Free at the end of the billing cycle.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'We offer a full refund within 7 days of your first payment if you\'re not satisfied. Contact support@originclipai.com.',
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-primary)] shadow-md shadow-[var(--accent-primary)]/20">
              <span className="text-sm font-extrabold text-white">O</span>
            </div>
            <span className="text-lg font-bold tracking-tight">
              OriginClip<span className="text-[var(--accent-primary)]">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm font-semibold text-muted-foreground">Sign in</Link>
            <Link href="/sign-up" className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-bold text-white shadow-md shadow-[var(--accent-primary)]/20">
              Try free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-4 pt-16 text-center">
        <h1 className="mb-3 text-4xl font-bold tracking-tight">Simple pricing. No surprises.</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Processing minutes per month. That&apos;s the only variable.
          No hidden AI credits. No per-feature upsells. No surprise bills.
        </p>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-6 md:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 ${
                plan.highlight
                  ? 'border-[var(--accent-primary)] bg-white shadow-lg shadow-[var(--accent-primary)]/10'
                  : 'border-border bg-white shadow-sm'
              }`}
            >
              {plan.badge && (
                <span className="mb-3 inline-block rounded-md bg-[var(--accent-primary)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  {plan.badge}
                </span>
              )}
              <h2 className="text-lg font-bold">{plan.name}</h2>
              <p className="mb-3 text-xs text-muted-foreground">{plan.description}</p>
              <div className="mb-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              {plan.annual && (
                <div className="mb-3 text-[11px] text-[var(--success)]">{plan.annual}</div>
              )}
              <div className="mb-5 text-xs font-semibold text-[var(--accent-primary)]">{plan.minutes}</div>

              <ul className="mb-6 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-0.5 text-[var(--success)]">✓</span> {f}
                  </li>
                ))}
                {plan.limitations.map((l) => (
                  <li key={l} className="flex items-start gap-2 text-sm text-[var(--text-tertiary)]">
                    <span className="mt-0.5">—</span> {l}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`block w-full rounded-lg py-2.5 text-center text-sm font-bold transition ${
                  plan.highlight
                    ? 'bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-primary)]/20'
                    : 'border border-border bg-background text-foreground hover:border-[var(--accent-primary)]'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-10 text-center text-2xl font-bold">Pricing FAQ</h2>
          <div className="space-y-6">
            {FAQ.map((faq) => (
              <div key={faq.q}>
                <h3 className="mb-1.5 text-sm font-bold">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <h2 className="mb-3 text-2xl font-bold">Start repurposing today</h2>
        <p className="mb-6 text-muted-foreground">30 free minutes. No credit card required.</p>
        <Link href="/sign-up" className="inline-block rounded-xl bg-[var(--accent-primary)] px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-[var(--accent-primary)]/20">
          Create free account
        </Link>
      </section>
    </main>
  );
}
