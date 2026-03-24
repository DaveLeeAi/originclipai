# OriginClipAI

Headless multi-platform content repurposing engine for solo creators. Takes long-form content (YouTube videos, podcasts, articles, PDFs) and produces short-form video clips, LinkedIn posts, X threads, newsletter sections, and more — with a structured review workflow and built-in social scheduling.

## What It Does

1. **Ingest** — Paste a YouTube URL, upload a video/audio file, drop in an article URL, or upload a PDF
2. **Transcribe** — Whisper or AssemblyAI transcription with speaker diarization and word-level timestamps
3. **Analyze** — LLM-powered clip detection (8-20 scored candidates), text generation (LinkedIn, X threads, newsletter, summary, chapters), and custom prompt templates
4. **Render** — Auto-reframe (9:16, 1:1, 16:9), face tracking, auto-captions with word-level highlighting and speaker color coding
5. **Review** — Approve/edit/skip queue with keyboard shortcuts for clips and inline editing for text outputs
6. **Schedule** — OAuth-connected publishing to YouTube Shorts, TikTok, LinkedIn, and X with time-based scheduling and retry
7. **Export** — Individual clip download, batch ZIP, text as Markdown, full export package

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript (strict)
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **ORM:** Prisma
- **Queue:** BullMQ + Redis
- **LLM:** Claude API (Anthropic)
- **Transcription:** AssemblyAI (default) or Whisper (Modal.com)
- **Video:** FFmpeg + MediaPipe face detection
- **Billing:** Stripe
- **Social:** YouTube, TikTok, LinkedIn, X platform adapters

## Architecture

```
API Layer (Next.js)  →  enqueues jobs
Queue (BullMQ/Redis) →  buffers and dispatches
Workers (separate)   →  process and write results to DB
Dashboard (Next.js)  →  reads from DB, real-time SSE updates
```

Workers are independent Node.js processes. Each worker consumes from one BullMQ queue. The job pipeline flows: `CREATED → INGESTING → TRANSCRIBING → ANALYZING → RENDERING → COMPLETE`. Text-only inputs (articles, PDFs) skip transcribing and rendering.

## Current Status

### What's Built

- **Pipeline code:** Ingest, transcribe, analyze, render, schedule, and export workers with full queue orchestration
- **Dashboard:** Job list, ingest form, processing progress (SSE), review queue (clips + texts), scheduling, settings, billing
- **API:** Versioned REST API (`/api/v1/`) with Supabase session auth and API key auth for Pro+ plans
- **Billing:** Stripe checkout, portal, webhook handling, usage tracking per billing cycle
- **Marketing:** Landing page, pricing, blog, docs, competitor comparison pages with shared layout
- **Onboarding:** First-run onboarding flow with persistence
- **Auth:** Supabase Auth with sign-in/sign-up, middleware-based session refresh, protected routes

### What's Not Yet Tested End-to-End

The vertical slice (YouTube URL → clips + text in review queue) has not been tested with real environment variables. All pieces are built and the build is clean, but the pipeline has not been exercised against real APIs (AssemblyAI, Claude, Supabase Storage, Redis/BullMQ).

**To test:** Set up real environment variables (see below), run `npm run dev` + `npm run workers:dev`, paste a YouTube URL, and watch it flow.

## Getting Started

### Prerequisites

- Node.js 20+
- Redis (for BullMQ) — local or Upstash
- FFmpeg + FFprobe (for video processing)
- yt-dlp (for YouTube downloads)
- Supabase project (for DB, auth, storage)
- AssemblyAI API key (for transcription)
- Anthropic API key (for LLM analysis)

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your values — see .env.example for descriptions

# Generate Prisma client
npm run db:generate

# Push schema to Supabase (dev)
npm run db:push

# Create your dev profile
# Set DEV_USER_ID and DEV_USER_EMAIL in .env.local first
npm run db:seed-dev

# Start development (two terminals)
npm run dev          # Next.js dev server (http://localhost:3000)
npm run workers:dev  # BullMQ workers with hot reload
```

### Environment Variables

See [.env.example](.env.example) for the full list. Minimum for the vertical slice:

```
DATABASE_URL, DIRECT_DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
REDIS_URL
ANTHROPIC_API_KEY
ASSEMBLYAI_API_KEY
NEXT_PUBLIC_APP_URL
```

## Project Structure

```
src/
  app/                   # Next.js App Router
    (auth)/              # Sign in/up pages
    (dashboard)/         # Protected app pages (jobs, schedule, settings)
    (marketing)/         # Public pages (landing, pricing, blog, docs)
    api/                 # API routes
      auth/              # OAuth flows (YouTube, TikTok, LinkedIn, X)
      v1/               # Versioned REST API
  components/            # React components (ui, layout, review, schedule)
  lib/                   # Shared code
    providers/           # Abstracted external services
    social/              # Platform adapters (YouTube, TikTok, LinkedIn, X)
    queue/               # BullMQ setup
    db/                  # Prisma client
  workers/               # Independent worker processes
    ingest/              # Download/extract source content
    transcribe/          # Whisper/AssemblyAI transcription + diarization
    analyze/             # LLM clip detection + text generation
    render/              # FFmpeg reframe + captions
    schedule/            # Social media posting
    export/              # ZIP bundle creation
  prompts/               # LLM prompt templates
  types/                 # Shared TypeScript types
```

## Commands

```bash
npm run dev              # Start Next.js dev server
npm run workers          # Start all BullMQ workers
npm run workers:dev      # Workers with hot reload
npm test                 # Run test suite (121 tests)
npm run build            # Production build
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to DB (dev)
npm run db:migrate       # Run migrations (prod)
npm run db:seed-dev      # Create dev profile
npm run db:studio        # Open Prisma Studio
npm run lint             # ESLint + Prettier
npm run typecheck        # TypeScript strict check
```

## Plans

| Plan | Price | Minutes/mo | Features |
|------|-------|-----------|----------|
| Free | $0 | 30 | Watermarked, 720p |
| Creator | $19/mo | 300 | No watermark, 1080p, scheduling |
| Pro | $39/mo | 900 | API access, custom prompts, priority |
| Business | $79/mo | 2,400 | Everything in Pro + SLA |

## Build Phases

| Phase | Status | Focus |
|-------|--------|-------|
| 1 | Built | Core pipeline (ingest, transcribe, analyze) |
| 2 | Built | Video processing (reframe, captions, face tracking) |
| 3 | Built | Dashboard UI (jobs, review queue, settings) |
| 4 | Built | Scheduling, extended inputs, custom prompts, export |
| 5 | Built | API keys, Stripe billing, onboarding, landing page |

**Next step:** Connect real environment variables and test the vertical slice end-to-end.

## License

Proprietary. All rights reserved.
