// src/components/onboarding/onboarding-flow.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface OnboardingFlowProps {
  userName?: string;
  onComplete: () => void;
}

const EXAMPLE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const STEPS = [
  { key: 'welcome', title: 'Welcome to OriginClipAI' },
  { key: 'first-job', title: 'Process your first video' },
  { key: 'connect', title: 'Connect a platform' },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

export function OnboardingFlow({ userName, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<StepKey>('welcome');
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const currentIndex = STEPS.findIndex((s) => s.key === step);

  const handleStartJob = async () => {
    const targetUrl = url.trim() || EXAMPLE_URL;
    setIsProcessing(true);

    try {
      // Detect source type from URL
      const isYouTube = /youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts/.test(targetUrl);
      const sourceType = isYouTube ? 'youtube_url' : 'article_url';

      const res = await fetch('/api/v1/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType, sourceUrl: targetUrl }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to create job');
      }

      const { jobId } = await res.json();
      router.push(`/jobs/${jobId}`);
    } catch (err) {
      console.error('[onboarding] Job creation failed:', err);
      setIsProcessing(false);
    }
  };

  const handleSkipToConnect = () => setStep('connect');
  const handleSkipAll = () => onComplete();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[#e4e2dd] bg-white p-8 shadow-2xl">
        {/* Progress dots */}
        <div className="mb-8 flex justify-center gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`h-1.5 rounded-full transition-all ${
                i <= currentIndex ? 'w-8 bg-[#5046e5]' : 'w-4 bg-[#e4e2dd]'
              }`}
            />
          ))}
        </div>

        {/* STEP: Welcome */}
        {step === 'welcome' && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5046e5] to-[#7c3aed] shadow-lg shadow-indigo-500/30">
              <span className="text-2xl font-extrabold text-white">O</span>
            </div>
            <h2 className="mb-3 text-2xl font-bold tracking-tight">
              {userName ? `Welcome, ${userName}` : 'Welcome to OriginClipAI'}
            </h2>
            <p className="mb-8 text-[#6b6960]">
              One upload → video clips, LinkedIn posts, X threads, and newsletter sections.
              Let&apos;s process your first piece of content.
            </p>
            <button
              onClick={() => setStep('first-job')}
              className="w-full rounded-xl bg-gradient-to-r from-[#5046e5] to-[#7c3aed] px-6 py-3 text-base font-bold text-white shadow-md shadow-indigo-500/25 transition hover:shadow-lg"
            >
              Let&apos;s go
            </button>
            <button
              onClick={handleSkipAll}
              className="mt-3 w-full py-2 text-sm text-[#a09e96] hover:text-[#6b6960]"
            >
              Skip onboarding
            </button>
          </div>
        )}

        {/* STEP: First Job */}
        {step === 'first-job' && (
          <div>
            <h2 className="mb-2 text-xl font-bold tracking-tight">
              Paste a YouTube URL to try it
            </h2>
            <p className="mb-6 text-sm text-[#6b6960]">
              Or use our example video. We&apos;ll generate clips, LinkedIn posts, X threads,
              and more — it takes about 3-5 minutes.
            </p>

            <div className="mb-4 rounded-xl border border-[#e4e2dd] bg-[#f6f5f2] p-1.5">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full rounded-lg bg-white px-4 py-3 text-sm outline-none placeholder:text-[#a09e96]"
              />
            </div>

            {!url.trim() && (
              <p className="mb-6 text-xs text-[#a09e96]">
                Leave blank to use our example video
              </p>
            )}

            <button
              onClick={handleStartJob}
              disabled={isProcessing}
              className="w-full rounded-xl bg-gradient-to-r from-[#5046e5] to-[#7c3aed] px-6 py-3 text-base font-bold text-white shadow-md shadow-indigo-500/25 transition hover:shadow-lg disabled:opacity-60"
            >
              {isProcessing ? 'Creating job...' : 'Process this video'}
            </button>

            <button
              onClick={handleSkipToConnect}
              className="mt-3 w-full py-2 text-sm text-[#a09e96] hover:text-[#6b6960]"
            >
              Skip — I&apos;ll do this later
            </button>
          </div>
        )}

        {/* STEP: Connect Platform */}
        {step === 'connect' && (
          <div>
            <h2 className="mb-2 text-xl font-bold tracking-tight">
              Connect a platform for scheduling
            </h2>
            <p className="mb-6 text-sm text-[#6b6960]">
              Optional — you can always do this later in Settings. Connect to start scheduling
              approved clips and posts directly from OriginClipAI.
            </p>

            <div className="mb-6 space-y-3">
              {[
                { name: 'YouTube', desc: 'Upload Shorts directly', color: '#dc2626' },
                { name: 'TikTok', desc: 'Post clips with captions', color: '#000000' },
                { name: 'LinkedIn', desc: 'Publish text posts', color: '#0a66c2' },
                { name: 'X / Twitter', desc: 'Post tweets and threads', color: '#1a1a1a' },
              ].map((platform) => (
                <button
                  key={platform.name}
                  onClick={() => router.push('/settings/connections')}
                  className="flex w-full items-center gap-4 rounded-xl border border-[#e4e2dd] bg-white px-4 py-3 text-left transition hover:border-[#5046e5] hover:shadow-sm"
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: platform.color }}
                  >
                    <span className="text-xs font-bold">{platform.name[0]}</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{platform.name}</div>
                    <div className="text-xs text-[#a09e96]">{platform.desc}</div>
                  </div>
                  <span className="ml-auto text-xs font-medium text-[#5046e5]">Connect →</span>
                </button>
              ))}
            </div>

            <button
              onClick={onComplete}
              className="w-full rounded-xl bg-gradient-to-r from-[#5046e5] to-[#7c3aed] px-6 py-3 text-base font-bold text-white shadow-md shadow-indigo-500/25"
            >
              Done — go to dashboard
            </button>

            <button
              onClick={onComplete}
              className="mt-3 w-full py-2 text-sm text-[#a09e96] hover:text-[#6b6960]"
            >
              Skip — I&apos;ll connect later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
