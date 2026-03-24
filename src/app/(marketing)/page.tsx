// src/app/(marketing)/page.tsx
//
// OriginClipAI landing page.
// Static page — Server Component. No client-side JS needed.

import Link from 'next/link';

export const metadata = {
  title: 'OriginClipAI — Turn any content into clips, posts, and threads',
  description:
    'AI content repurposing engine for creators. Paste a YouTube URL, article, or PDF and get video clips, LinkedIn posts, X threads, and newsletter drafts. Free to start.',
  openGraph: {
    title: 'OriginClipAI — Content repurposing for creators',
    description:
      'One upload → video clips + LinkedIn posts + X threads + newsletter sections. AI-powered, human-reviewed.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OriginClipAI — Turn any content into clips, posts, and threads',
    description:
      'One upload → video clips + LinkedIn posts + X threads + newsletter sections.',
  },
};

// --- PAGE ---

export default function LandingPage() {
  return (
    <div className="text-[#1a1a1a]">
      {/* HERO */}
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e4e2dd] bg-white px-4 py-1.5 text-xs font-semibold text-[#6b6960] shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
          Now in public beta
        </div>
        <h1 className="mb-6 text-5xl font-bold leading-[1.1] tracking-tight md:text-6xl">
          Turn any content into
          <br />
          <span className="text-[#5046e5]">clips, posts, and threads</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[#6b6960]">
          Paste a YouTube URL, article, or PDF. Get video clips with captions,
          LinkedIn posts, X threads, and newsletter drafts — reviewed and scheduled
          from one dashboard. Stop juggling three tools.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="rounded-xl bg-gradient-to-r from-[#5046e5] to-[#7c3aed] px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-xl"
          >
            Start free — no credit card
          </Link>
          <a
            href="#how-it-works"
            className="rounded-xl border border-[#e4e2dd] bg-white px-8 py-3.5 text-base font-semibold text-[#6b6960] shadow-sm transition hover:border-[#5046e5] hover:text-[#5046e5]"
          >
            See how it works
          </a>
        </div>
        <p className="mt-6 text-xs text-[#a09e96]">
          30 free minutes per month. No watermark on paid plans. Cancel anytime.
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="border-t border-[#e4e2dd] bg-white py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">
            One upload. Everything you need.
          </h2>
          <p className="mx-auto mb-16 max-w-xl text-center text-[#6b6960]">
            Four steps from raw content to published posts across every platform.
          </p>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { step: '1', title: 'Paste or upload', desc: 'YouTube URL, article link, PDF, audio, or video file. We accept it all.' },
              { step: '2', title: 'AI analyzes', desc: 'Transcription, speaker detection, clip scoring, and text drafts — all automatic.' },
              { step: '3', title: 'You review', desc: 'Approve, edit, or skip each clip and text output. AI proposes, you decide.' },
              { step: '4', title: 'Schedule', desc: 'Queue approved outputs to TikTok, YouTube Shorts, LinkedIn, and X.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#5046e5]/[0.07] text-lg font-bold text-[#5046e5]">
                  {item.step}
                </div>
                <h3 className="mb-2 text-base font-bold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[#6b6960]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">
            What you get from one upload
          </h2>
          <p className="mx-auto mb-16 max-w-xl text-center text-[#6b6960]">
            Video clips AND text outputs. Not one or the other. Both.
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { title: '8-20 video clips', desc: 'AI-scored, auto-reframed for vertical, with word-level captions and speaker color coding.', tag: 'Video' },
              { title: 'LinkedIn posts', desc: '2-3 hook-driven posts formatted for the LinkedIn algorithm. Different angle per post.', tag: 'Text' },
              { title: 'X threads', desc: 'Structured 5-10 post threads with numbered posts. Each under 280 characters.', tag: 'Text' },
              { title: 'Newsletter sections', desc: 'Ready to paste into Substack or ConvertKit. Conversational, personal, insight-driven.', tag: 'Text' },
              { title: 'Speaker-aware clipping', desc: 'AI knows host from guest. Filter clips by who\'s speaking. Guest insights over host questions.', tag: 'AI' },
              { title: 'Export everything', desc: 'Individual clips, batch ZIP, captions (SRT/VTT), all text as Markdown. One-click full bundle.', tag: 'Export' },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-[#e4e2dd] bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <span className="mb-3 inline-block rounded-md bg-[#5046e5]/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5046e5]">
                  {feature.tag}
                </span>
                <h3 className="mb-2 text-base font-bold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-[#6b6960]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INPUT TYPES */}
      <section className="border-t border-[#e4e2dd] bg-white py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">
            Not just video
          </h2>
          <p className="mx-auto mb-16 max-w-xl text-center text-[#6b6960]">
            Paste a blog post. Upload a whitepaper. Drop a podcast. We turn any content into everything else.
          </p>
          <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-6">
            {[
              { label: 'YouTube', sub: 'Any public URL' },
              { label: 'Video', sub: 'MP4, MOV, WebM' },
              { label: 'Audio', sub: 'MP3, WAV, M4A' },
              { label: 'Articles', sub: 'Any blog URL' },
              { label: 'PDFs', sub: 'Whitepaper, ebook' },
              { label: 'API', sub: 'Headless pipeline' },
            ].map((input) => (
              <div
                key={input.label}
                className="rounded-xl border border-[#e4e2dd] bg-[#f6f5f2] p-4 text-center"
              >
                <div className="text-sm font-bold">{input.label}</div>
                <div className="mt-1 text-xs text-[#a09e96]">{input.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">
            Simple pricing. No surprises.
          </h2>
          <p className="mx-auto mb-16 max-w-xl text-center text-[#6b6960]">
            Processing minutes per month. That&apos;s the only variable. No hidden AI credits. No per-feature upsells.
          </p>
          <div className="grid gap-6 md:grid-cols-4">
            {[
              {
                name: 'Free', price: '$0', period: 'forever', minutes: '30 min/month',
                features: ['Watermarked clips', '720p export', 'Basic text outputs', '2 concurrent jobs'],
                cta: 'Start free', highlight: false,
              },
              {
                name: 'Creator', price: '$19', period: '/month', minutes: '300 min/month',
                features: ['No watermark', '1080p export', 'All text outputs', 'Scheduling (4 platforms)', '5 concurrent jobs'],
                cta: 'Start trial', highlight: false,
              },
              {
                name: 'Pro', price: '$39', period: '/month', minutes: '900 min/month',
                features: ['Everything in Creator', 'API access', 'Custom prompt templates', 'Priority processing', 'Webhooks'],
                cta: 'Start trial', highlight: true,
              },
              {
                name: 'Business', price: '$79', period: '/month', minutes: '2,400 min/month',
                features: ['Everything in Pro', 'Team seats (coming)', 'White-label export', 'SLA', 'Priority support'],
                cta: 'Contact us', highlight: false,
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border p-6 ${
                  tier.highlight
                    ? 'border-[#5046e5] bg-white shadow-lg shadow-indigo-500/10'
                    : 'border-[#e4e2dd] bg-white shadow-sm'
                }`}
              >
                {tier.highlight && (
                  <span className="mb-3 inline-block rounded-md bg-[#5046e5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-bold">{tier.name}</h3>
                <div className="mt-2 mb-1">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className="text-sm text-[#6b6960]">{tier.period}</span>
                </div>
                <div className="mb-5 text-xs font-semibold text-[#5046e5]">{tier.minutes}</div>
                <ul className="mb-6 space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#6b6960]">
                      <span className="mt-0.5 text-[#16a34a]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className={`block w-full rounded-lg py-2.5 text-center text-sm font-bold transition ${
                    tier.highlight
                      ? 'bg-gradient-to-r from-[#5046e5] to-[#7c3aed] text-white shadow-md shadow-indigo-500/25'
                      : 'border border-[#e4e2dd] bg-[#f6f5f2] text-[#1a1a1a] hover:border-[#5046e5]'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-[#e4e2dd] bg-white py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="space-y-8">
            {[
              {
                q: 'How is this different from OpusClip or Vizard?',
                a: 'OpusClip and Vizard generate video clips only. They don\'t produce LinkedIn posts, X threads, or newsletter sections. OriginClipAI generates both video clips AND text outputs from one upload, so you don\'t need to use a second tool like Castmagic for text repurposing.',
              },
              {
                q: 'What input formats do you support?',
                a: 'YouTube URLs, direct video URLs, MP4/MOV/WebM uploads, MP3/WAV/M4A audio files, article/blog URLs, and PDF uploads. We\'re the only repurposing tool that accepts articles and PDFs as inputs.',
              },
              {
                q: 'How does speaker-aware clipping work?',
                a: 'Our AI detects who\'s speaking in your content and identifies their role (host vs. guest). Clip scoring weights guest insights higher than host questions, so the best guest moments surface first. You can filter clips by speaker in the review queue.',
              },
              {
                q: 'Are the AI outputs ready to post as-is?',
                a: 'We\'re honest about this: AI outputs are 80% ready. That\'s why we built a structured review workflow — approve, edit, or skip each clip and text output before scheduling. The review step is the product, not an afterthought.',
              },
              {
                q: 'What platforms can I schedule to?',
                a: 'YouTube Shorts, TikTok, LinkedIn (text posts), and X/Twitter (tweets and threads). Instagram Reels and Facebook are coming soon.',
              },
              {
                q: 'Do you have an API?',
                a: 'Yes. Pro plans and above include self-serve API access with REST endpoints for the full pipeline: create jobs, check status, list clips and text outputs, trigger renders, and schedule posts. Plus webhooks for job completion events.',
              },
              {
                q: 'How is billing calculated?',
                a: 'By processing minutes — the duration of your source content. A 60-minute YouTube video uses 60 minutes of your monthly allocation regardless of how many clips or text outputs it generates. Text-only inputs (articles, PDFs) count as 1 minute flat.',
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Yes. No contracts, no cancellation fees, no dark patterns. Cancel from your settings page and your plan downgrades to Free at the end of the billing cycle.',
              },
            ].map((faq) => (
              <div key={faq.q}>
                <h3 className="mb-2 text-base font-bold">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-[#6b6960]">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">
            Stop juggling three tools
          </h2>
          <p className="mb-8 text-[#6b6960]">
            One upload. Clips, posts, threads, and newsletter drafts.
            Reviewed and scheduled from one dashboard.
          </p>
          <Link
            href="/sign-up"
            className="inline-block rounded-xl bg-gradient-to-r from-[#5046e5] to-[#7c3aed] px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-xl"
          >
            Try OriginClipAI free
          </Link>
        </div>
      </section>

    </div>
  );
}
