// src/components/ingest/ingest-form.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function IngestForm() {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setError(null);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/v1/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `Failed to create job (${res.status})`);
        setIsProcessing(false);
        return;
      }

      router.push(`/jobs/${data.jobId}`);
    } catch {
      setError('Network error. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setError(null);
    setIsProcessing(true);

    try {
      // Step 1: Get upload URL
      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size, mimeType: file.type }),
      });

      const { uploadUrl, fileKey } = await res.json();

      // Step 2: Upload file
      await fetch(uploadUrl, { method: 'PUT', body: file });

      // Step 3: Create job from uploaded file
      const jobRes = await fetch('/api/v1/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileKey }),
      });

      const jobData = await jobRes.json();

      if (!jobRes.ok) {
        setError(jobData.error ?? 'Failed to create job');
        setIsProcessing(false);
        return;
      }

      router.push(`/jobs/${jobData.jobId}`);
    } catch {
      setError('Upload failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="w-full max-w-[640px]">
        <h1 className="mb-2 text-center text-[30px] font-bold leading-tight tracking-tight">
          What are we repurposing?
        </h1>
        <p className="mb-8 text-center text-[15px] text-[#6b6960]">
          Paste a URL, upload a file, or drop content below
        </p>

        {/* URL Input */}
        <div className="mb-5 flex gap-2 rounded-2xl border border-[#e4e2dd] bg-white p-1.5 shadow-md">
          <div className="flex items-center pl-3 text-[#a09e96]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Paste YouTube URL, article URL, or any public link..."
            className="flex-1 bg-transparent py-2.5 text-[15px] outline-none placeholder:text-[#a09e96]"
            disabled={isProcessing}
          />
          <Button
            onClick={handleSubmit}
            disabled={!url.trim() || isProcessing}
            size="md"
          >
            {isProcessing ? 'Processing…' : 'Process'}
          </Button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-[#dc2626]/20 bg-[#dc2626]/[0.04] px-4 py-3 text-sm text-[#dc2626]">
            {error}
          </div>
        )}

        {/* Source type cards */}
        <div className="mb-6 grid grid-cols-4 gap-3">
          {[
            { label: 'YouTube URL', desc: 'Any public video', color: '#dc2626' },
            { label: 'PDF / Article', desc: 'Blog, whitepaper', color: '#5046e5' },
            { label: 'Upload MP4', desc: 'Local video file', color: '#7c3aed' },
            { label: 'Audio File', desc: 'MP3, WAV, M4A', color: '#0891b2' },
          ].map((src) => (
            <div
              key={src.label}
              className="cursor-pointer rounded-xl border border-[#e4e2dd] bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#5046e5] hover:shadow-md"
            >
              <div className="mb-2 text-xs font-bold" style={{ color: src.color }}>
                ●
              </div>
              <div className="text-xs font-bold">{src.label}</div>
              <div className="mt-0.5 text-[11px] text-[#a09e96]">{src.desc}</div>
            </div>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver
              ? 'border-[#5046e5] bg-[#5046e5]/[0.03]'
              : 'border-[#e4e2dd] hover:border-[#d4d2cc]'
          }`}
        >
          <p className="mb-2 text-sm text-[#6b6960]">
            Drag and drop a file here, or{' '}
            <label className="cursor-pointer font-semibold text-[#5046e5] hover:underline">
              browse
              <input
                type="file"
                className="hidden"
                accept="video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/mp4,application/pdf"
                onChange={handleFileSelect}
                disabled={isProcessing}
              />
            </label>
          </p>
          <p className="text-xs text-[#a09e96]">
            MP4, MOV, WebM, MP3, WAV, M4A, PDF — up to 5GB
          </p>
        </div>
      </div>
    </div>
  );
}
