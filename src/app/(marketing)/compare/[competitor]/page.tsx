// src/app/(marketing)/compare/[competitor]/page.tsx

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

// --- COMPETITOR DATA ---

interface CompetitorData {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  pricing: string;
  bestFor: string;
  features: Record<string, 'yes' | 'no' | 'partial' | 'paid' | string>;
}

const COMPETITORS: Record<string, CompetitorData> = {
  'opus-clip': {
    name: 'OpusClip',
    slug: 'opus-clip',
    tagline: 'AI video clipper with 16M+ users',
    description: 'OpusClip is the market leader in AI video clipping, backed by SoftBank. It generates scored video clips from YouTube URLs and video uploads with auto-captions and a built-in scheduler.',
    strengths: [
      'Large user base and brand recognition',
      'ClipAnything multimodal AI engine',
      'Built-in scheduler for 6 platforms',
      'AI B-Roll generation',
      'XML export for Premiere/DaVinci',
    ],
    weaknesses: [
      'No text repurposing — no LinkedIn posts, X threads, or newsletter drafts',
      'No article or PDF input support',
      'Scheduler widely reported as unreliable (TikTok drops, silent failures)',
      'Only 15-30% of AI clips usable without editing',
      'Trustpilot 2.4/5 — billing complaints and charges after cancellation',
      'API locked to Enterprise/Business plans only',
      'Virality Score has no proven correlation with actual performance',
    ],
    pricing: 'Free (60 min, watermark) → $15/mo → $29/mo → $79/mo',
    bestFor: 'Creators who only need video clips and already have separate tools for text content and scheduling.',
    features: {
      'YouTube URL input': 'yes',
      'Article/blog URL input': 'no',
      'PDF input': 'no',
      'Audio file input': 'no',
      'AI clip detection': 'yes',
      'Speaker diarization': 'yes',
      'Speaker role detection (host vs guest)': 'no',
      'Auto-reframe (vertical)': 'yes',
      'Word-level captions': 'yes',
      'LinkedIn post generation': 'no',
      'X thread generation': 'no',
      'Newsletter section generation': 'no',
      'Blog draft generation': 'no',
      'Summary & chapter markers': 'no',
      'Structured review queue': 'no',
      'Built-in scheduling': 'yes (unreliable)',
      'Self-serve API': 'Enterprise only',
      'Export package (all outputs)': 'no',
      'Custom prompt templates': 'no',
    },
  },
  vizard: {
    name: 'Vizard',
    slug: 'vizard',
    tagline: 'AI video editor with Spark 1.0 multimodal LLM',
    description: 'Vizard.ai is the second-largest AI video clipper with 10M+ users. Its standout feature is Spark 1.0, a proprietary multimodal LLM that enables prompt-based clipping — you can describe the type of clip you want in natural language.',
    strengths: [
      'Spark 1.0 prompt-based clipping ("find clips about pricing")',
      'Best-in-class speaker-change detection',
      'Self-serve API on all paid plans',
      'Supports audio file input (unlike OpusClip)',
      'Built-in scheduler for 7 platforms',
    ],
    weaknesses: [
      'No text repurposing — social captions only',
      'No article or PDF input support',
      'Viral score inconsistency (same as OpusClip)',
      'Processing slowdowns during peak times',
      'Limited editing tools',
    ],
    pricing: 'Free (60 min, 720p) → ~$14.50/mo → ~$30/mo → Enterprise',
    bestFor: 'Creators who want prompt-based clip selection and API access but only need video output.',
    features: {
      'YouTube URL input': 'yes',
      'Article/blog URL input': 'no',
      'PDF input': 'no',
      'Audio file input': 'yes',
      'AI clip detection': 'yes',
      'Speaker diarization': 'yes',
      'Speaker role detection (host vs guest)': 'no',
      'Auto-reframe (vertical)': 'yes',
      'Word-level captions': 'yes',
      'LinkedIn post generation': 'no',
      'X thread generation': 'no',
      'Newsletter section generation': 'no',
      'Blog draft generation': 'no',
      'Summary & chapter markers': 'no',
      'Structured review queue': 'no',
      'Built-in scheduling': 'yes',
      'Self-serve API': 'yes (all paid)',
      'Export package (all outputs)': 'no',
      'Custom prompt templates': 'no',
    },
  },
  descript: {
    name: 'Descript',
    slug: 'descript',
    tagline: 'Transcript-first video editor with Underlord AI',
    description: 'Descript pioneered transcript-based video editing — delete a word from the transcript and the video cuts automatically. Its Underlord AI co-editor can chain multi-step editing workflows. Backed by OpenAI with $100M+ in funding.',
    strengths: [
      'Transcript-first editing paradigm (genuinely innovative)',
      'Underlord AI generates show notes, blog drafts, social posts',
      'Best text output quality among video editors',
      'Full NLE capabilities (multi-track, effects, screen recording)',
      'Strong collaboration features for teams',
    ],
    weaknesses: [
      'No "paste URL, get clips" workflow — requires importing and editing',
      'No built-in social scheduling (top user feature request)',
      'Complex interface with steep learning curve',
      'AI credits system is the #1 complaint — bills jumping from $30 to $195+/month',
      'No YouTube URL input — file upload only',
      'No article or PDF input',
      'Desktop app is resource-heavy',
    ],
    pricing: 'Free (10 hrs) → $8/mo → $24/mo → $40/mo (plus volatile AI credits)',
    bestFor: 'Creators who need deep editing control and are willing to learn a complex tool. Not for quick repurposing.',
    features: {
      'YouTube URL input': 'no',
      'Article/blog URL input': 'no',
      'PDF input': 'no',
      'Audio file input': 'yes',
      'AI clip detection': 'no',
      'Speaker diarization': 'yes',
      'Speaker role detection (host vs guest)': 'no',
      'Auto-reframe (vertical)': 'partial (manual)',
      'Word-level captions': 'yes',
      'LinkedIn post generation': 'partial (Underlord)',
      'X thread generation': 'no',
      'Newsletter section generation': 'no',
      'Blog draft generation': 'yes (Underlord)',
      'Summary & chapter markers': 'yes (Underlord)',
      'Structured review queue': 'no (full NLE)',
      'Built-in scheduling': 'no',
      'Self-serve API': 'no',
      'Export package (all outputs)': 'no',
      'Custom prompt templates': 'no',
    },
  },
};

const ORIGIN_FEATURES: Record<string, string> = {
  'YouTube URL input': 'yes',
  'Article/blog URL input': 'yes',
  'PDF input': 'yes',
  'Audio file input': 'yes',
  'AI clip detection': 'yes',
  'Speaker diarization': 'yes',
  'Speaker role detection (host vs guest)': 'yes',
  'Auto-reframe (vertical)': 'yes',
  'Word-level captions': 'yes',
  'LinkedIn post generation': 'yes (first-class)',
  'X thread generation': 'yes (first-class)',
  'Newsletter section generation': 'yes (first-class)',
  'Blog draft generation': 'yes',
  'Summary & chapter markers': 'yes',
  'Structured review queue': 'yes',
  'Built-in scheduling': 'yes (4 platforms)',
  'Self-serve API': 'yes (Pro+)',
  'Export package (all outputs)': 'yes',
  'Custom prompt templates': 'yes',
};

// --- METADATA ---

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const { competitor } = await params;
  const data = COMPETITORS[competitor];
  if (!data) return {};

  return {
    title: `OriginClipAI vs ${data.name}: Which content repurposing tool is right for you?`,
    description: `Honest comparison of OriginClipAI and ${data.name}. See features, pricing, strengths, and weaknesses side by side. Find the best fit for your creator workflow.`,
  };
}

export function generateStaticParams() {
  return Object.keys(COMPETITORS).map((slug) => ({ competitor: slug }));
}

// --- PAGE ---

export default async function ComparePage({
  params,
}: {
  params: Promise<{ competitor: string }>;
}) {
  const { competitor: slug } = await params;
  const comp = COMPETITORS[slug];
  if (!comp) notFound();

  const featureKeys = Object.keys(ORIGIN_FEATURES);

  return (
    <main className="min-h-screen bg-[#f6f5f2] text-[#1a1a1a]">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-[#e4e2dd] bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#5046e5] to-[#7c3aed]">
              <span className="text-xs font-extrabold text-white">O</span>
            </div>
            <span className="font-bold tracking-tight">
              OriginClip<span className="text-[#5046e5]">AI</span>
            </span>
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-gradient-to-r from-[#5046e5] to-[#7c3aed] px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-500/25"
          >
            Try free
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* HEADER */}
        <div className="mb-4 text-sm font-medium text-[#6b6960]">
          <Link href="/" className="hover:text-[#5046e5]">Home</Link>
          {' / '}
          <span>Compare</span>
          {' / '}
          <span className="text-[#1a1a1a]">{comp.name}</span>
        </div>

        <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight">
          OriginClipAI vs {comp.name}
        </h1>
        <p className="mb-12 text-lg text-[#6b6960]">
          An honest comparison to help you pick the right content repurposing tool.
        </p>

        {/* QUICK COMPARISON TABLE */}
        <div className="mb-16 overflow-hidden rounded-2xl border border-[#e4e2dd] bg-white shadow-sm">
          <div className="grid grid-cols-3 border-b border-[#e4e2dd] bg-[#f6f5f2] text-sm font-bold">
            <div className="px-5 py-3">Feature</div>
            <div className="px-5 py-3 text-[#5046e5]">OriginClipAI</div>
            <div className="px-5 py-3">{comp.name}</div>
          </div>
          {featureKeys.map((key, i) => (
            <div
              key={key}
              className={`grid grid-cols-3 text-sm ${i < featureKeys.length - 1 ? 'border-b border-[#eeedea]' : ''}`}
            >
              <div className="px-5 py-3 text-[#6b6960]">{key}</div>
              <div className="px-5 py-3">
                <FeatureCell value={ORIGIN_FEATURES[key]} />
              </div>
              <div className="px-5 py-3">
                <FeatureCell value={comp.features[key] ?? 'no'} />
              </div>
            </div>
          ))}
        </div>

        {/* WHERE COMPETITOR EXCELS */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold tracking-tight">
            Where {comp.name} excels
          </h2>
          <p className="mb-4 text-[#6b6960]">{comp.description}</p>
          <ul className="space-y-2">
            {comp.strengths.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-[#16a34a]">✓</span>
                <span className="text-[#6b6960]">{s}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* WHERE ORIGINCIP IS DIFFERENT */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold tracking-tight">
            Where OriginClipAI is different
          </h2>
          <ul className="space-y-2">
            {comp.weaknesses.map((w) => (
              <li key={w} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-[#5046e5]">→</span>
                <span className="text-[#6b6960]">{w}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* PRICING */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold tracking-tight">Pricing comparison</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#5046e5]/20 bg-[#5046e5]/[0.03] p-5">
              <div className="mb-1 text-sm font-bold text-[#5046e5]">OriginClipAI</div>
              <div className="text-sm text-[#6b6960]">Free ($0) → Creator ($19/mo) → Pro ($39/mo) → Business ($79/mo)</div>
              <div className="mt-2 text-xs text-[#a09e96]">Includes video clips + all text outputs + scheduling. No hidden AI credits.</div>
            </div>
            <div className="rounded-xl border border-[#e4e2dd] bg-white p-5">
              <div className="mb-1 text-sm font-bold">{comp.name}</div>
              <div className="text-sm text-[#6b6960]">{comp.pricing}</div>
              <div className="mt-2 text-xs text-[#a09e96]">Video clips only{comp.slug === 'descript' ? ' (plus AI credits for text features)' : '. Text repurposing requires a separate tool.'}.</div>
            </div>
          </div>
        </section>

        {/* WHO SHOULD USE WHAT */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-bold tracking-tight">Which should you use?</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#e4e2dd] bg-white p-5">
              <div className="mb-2 text-sm font-bold">Use {comp.name} if:</div>
              <p className="text-sm text-[#6b6960]">{comp.bestFor}</p>
            </div>
            <div className="rounded-xl border border-[#5046e5]/20 bg-[#5046e5]/[0.03] p-5">
              <div className="mb-2 text-sm font-bold text-[#5046e5]">Use OriginClipAI if:</div>
              <p className="text-sm text-[#6b6960]">
                You want video clips AND text outputs (LinkedIn posts, X threads, newsletter sections) from one upload,
                with a structured review workflow and built-in scheduling. Especially if you also repurpose articles and PDFs.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl border border-[#e4e2dd] bg-white p-8 text-center shadow-sm">
          <h2 className="mb-3 text-2xl font-bold">Ready to try OriginClipAI?</h2>
          <p className="mb-6 text-[#6b6960]">30 free minutes. No credit card required.</p>
          <Link
            href="/sign-up"
            className="inline-block rounded-xl bg-gradient-to-r from-[#5046e5] to-[#7c3aed] px-8 py-3 text-base font-bold text-white shadow-lg shadow-indigo-500/25"
          >
            Start free
          </Link>
        </div>
      </div>
    </main>
  );
}

// --- HELPERS ---

function FeatureCell({ value }: { value: string }) {
  if (value === 'yes' || value.startsWith('yes')) {
    return <span className="font-semibold text-[#16a34a]">{value === 'yes' ? '✓ Yes' : `✓ ${value.replace('yes ', '')}`}</span>;
  }
  if (value === 'no') {
    return <span className="text-[#a09e96]">✗ No</span>;
  }
  if (value === 'partial' || value.startsWith('partial')) {
    return <span className="text-[#d97706]">◐ {value === 'partial' ? 'Partial' : value.replace('partial ', '')}</span>;
  }
  return <span className="text-[#6b6960]">{value}</span>;
}
