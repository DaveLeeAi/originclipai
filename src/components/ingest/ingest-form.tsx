// src/components/ingest/ingest-form.tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const YOUTUBE_PATTERNS = [
  /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
  /^https?:\/\/youtu\.be\/[\w-]+/,
  /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/,
];

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov)(\?|$)/i;

type InputMode = 'youtube' | 'article' | 'video' | 'audio';

const INPUT_MODE_PLACEHOLDERS: Record<InputMode, string> = {
  youtube: 'Paste a YouTube URL...',
  article: 'Paste an article or blog URL...',
  video: '',
  audio: '',
};

function detectSourceType(url: string): { sourceType: string; sourceUrl: string } {
  if (YOUTUBE_PATTERNS.some((p) => p.test(url))) {
    return { sourceType: 'youtube_url', sourceUrl: url };
  }
  if (VIDEO_EXTENSIONS.test(url)) {
    return { sourceType: 'video_url', sourceUrl: url };
  }
  return { sourceType: 'article_url', sourceUrl: url };
}

export function IngestForm() {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeMode, setActiveMode] = useState<InputMode | null>(null);
  const router = useRouter();
  const urlInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setError(null);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/v1/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(detectSourceType(url.trim())),
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
      const isAudio = /^audio\//.test(file.type);
      const jobRes = await fetch('/api/v1/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: isAudio ? 'audio_upload' : file.type === 'application/pdf' ? 'pdf_upload' : 'video_upload',
          sourceFileKey: fileKey,
        }),
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

  const handleCardClick = (mode: InputMode): void => {
    setActiveMode(mode);
    setError(null);

    if (mode === 'youtube' || mode === 'article') {
      // Focus the URL input and update placeholder
      setTimeout(() => urlInputRef.current?.focus(), 0);
    } else if (mode === 'video') {
      // Trigger file picker for video
      if (fileInputRef.current) {
        fileInputRef.current.accept = 'video/mp4,video/quicktime,video/webm';
        fileInputRef.current.click();
      }
    } else if (mode === 'audio') {
      // Trigger file picker for audio
      if (fileInputRef.current) {
        fileInputRef.current.accept = 'audio/mpeg,audio/wav,audio/mp4';
        fileInputRef.current.click();
      }
    }
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
            ref={urlInputRef}
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={activeMode && (activeMode === 'youtube' || activeMode === 'article')
              ? INPUT_MODE_PLACEHOLDERS[activeMode]
              : 'Paste YouTube URL, article URL, or any public link...'}
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
          {([
            { label: 'YouTube URL', desc: 'Any public video', color: '#dc2626', mode: 'youtube' as InputMode },
            { label: 'PDF / Article', desc: 'Blog, whitepaper', color: '#5046e5', mode: 'article' as InputMode },
            { label: 'Upload MP4', desc: 'Local video file', color: '#7c3aed', mode: 'video' as InputMode },
            { label: 'Audio File', desc: 'MP3, WAV, M4A', color: '#0891b2', mode: 'audio' as InputMode },
          ]).map((src) => (
            <div
              key={src.label}
              onClick={() => handleCardClick(src.mode)}
              className={`cursor-pointer rounded-xl border bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                activeMode === src.mode
                  ? 'border-[#5046e5] ring-1 ring-[#5046e5]/30 shadow-md'
                  : 'border-[#e4e2dd] hover:border-[#5046e5]'
              }`}
            >
              <div className="mb-2 text-xs font-bold" style={{ color: src.color }}>
                ●
              </div>
              <div className="text-xs font-bold">{src.label}</div>
              <div className="mt-0.5 text-[11px] text-[#a09e96]">{src.desc}</div>
            </div>
          ))}
        </div>

        {/* Hidden file input for card-triggered uploads */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isProcessing}
        />

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
