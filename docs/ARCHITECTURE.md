# ARCHITECTURE.md

> Detailed technical architecture for OriginClipAI v1. This is the engineering reference. For strategic rationale behind these choices, see `/ARCHITECTURE_IMPLICATIONS.md`.

---

## Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 (App Router) | Dashboard, SSR, API routes |
| Styling | Tailwind CSS | Utility-first CSS |
| State | React Server Components + SWR | Server-first, client cache |
| Auth | Supabase Auth (NextAuth adapter) | Email + Google OAuth |
| Database | PostgreSQL (Supabase) | Primary data store |
| Queue | BullMQ (Redis) | Job orchestration |
| Cache | Redis (Upstash) | Session, rate limiting |
| Storage | Supabase Storage / Cloudflare R2 | Video files, rendered clips |
| Transcription | Whisper (Modal.com) + AssemblyAI | Speech-to-text |
| LLM | Claude API (Anthropic) | Analysis + text generation |
| Video | FFmpeg + MediaPipe | Reframe, caption, encode |
| Payments | Stripe | Subscriptions, billing |
| Hosting | Vercel (frontend) + Railway/Render (workers) | Deployment |
| Monitoring | Sentry + PostHog | Error tracking + analytics |

---

## Application Architecture

### Next.js App Router Structure

```
src/app/
├── (auth)/
│   ├── sign-in/page.tsx
│   ├── sign-up/page.tsx
│   └── layout.tsx
├── (dashboard)/
│   ├── layout.tsx                 ← App shell: sidebar + top bar
│   ├── page.tsx                   ← Job list / dashboard home
│   ├── new/page.tsx               ← Ingest page
│   ├── jobs/[id]/
│   │   ├── page.tsx               ← Processing status
│   │   ├── review/page.tsx        ← Review queue
│   │   └── schedule/page.tsx      ← Schedule page
│   ├── settings/
│   │   ├── page.tsx               ← General settings
│   │   ├── connections/page.tsx   ← Social connections
│   │   ├── api-keys/page.tsx      ← API key management
│   │   └── billing/page.tsx       ← Plan + usage + invoices
│   └── templates/page.tsx         ← Custom prompt templates
├── api/
│   ├── v1/
│   │   ├── jobs/route.ts          ← POST create, GET list
│   │   ├── jobs/[id]/route.ts     ← GET status
│   │   ├── jobs/[id]/clips/route.ts
│   │   ├── jobs/[id]/texts/route.ts
│   │   ├── jobs/[id]/stream/route.ts  ← SSE for processing updates
│   │   ├── clips/[id]/route.ts    ← PATCH approve/reject
│   │   ├── clips/[id]/download/route.ts
│   │   ├── texts/[id]/route.ts    ← PATCH update
│   │   ├── texts/[id]/refine/route.ts ← POST AI refinement
│   │   ├── schedule/route.ts      ← POST create, GET list
│   │   └── schedule/[id]/route.ts ← DELETE cancel
│   ├── webhooks/
│   │   └── stripe/route.ts        ← Stripe webhook handler
│   └── auth/
│       └── callback/route.ts      ← OAuth callbacks
├── (marketing)/
│   ├── page.tsx                   ← Landing page
│   ├── pricing/page.tsx
│   ├── blog/[slug]/page.tsx
│   ├── compare/[competitor]/page.tsx
│   ├── features/[feature]/page.tsx
│   └── use-cases/[usecase]/page.tsx
└── layout.tsx                     ← Root layout
```

### Component Architecture

```
src/components/
├── ui/                            ← Design system primitives
│   ├── badge.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── status-dot.tsx
│   ├── score-pill.tsx
│   ├── speaker-badge.tsx
│   ├── platform-icon.tsx
│   ├── tab-bar.tsx
│   └── progress-bar.tsx
├── layout/
│   ├── app-shell.tsx              ← Sidebar + top bar wrapper
│   ├── sidebar.tsx                ← Pipeline navigation
│   └── top-bar.tsx                ← Branding + settings + usage
├── ingest/
│   ├── url-input.tsx              ← URL paste input field
│   ├── file-upload.tsx            ← Drag-and-drop uploader
│   └── source-type-cards.tsx      ← Source type selection
├── processing/
│   └── progress-checklist.tsx     ← Step-by-step progress display
├── review/
│   ├── clip-list.tsx              ← Left panel clip list
│   ├── clip-detail.tsx            ← Right panel clip preview
│   ├── text-list.tsx              ← Left panel text list
│   ├── text-detail.tsx            ← Right panel text editor
│   ├── review-actions.tsx         ← Approve/edit/skip buttons
│   └── platform-selector.tsx      ← Platform toggle buttons
├── schedule/
│   ├── schedule-grid.tsx          ← Card grid of scheduled items
│   ├── schedule-card.tsx          ← Individual schedule card
│   └── time-picker.tsx            ← Date/time selection
└── shared/
    ├── video-player.tsx           ← Clip preview player
    ├── text-editor.tsx            ← Inline text editing
    └── empty-state.tsx            ← Empty state patterns
```

---

## Server Architecture

### Worker Processes

Workers run as separate Node.js processes, not inside Next.js. Deployed on Railway or Render.

```
src/workers/
├── index.ts                       ← Worker process entry point (starts all workers)
├── ingest/
│   ├── worker.ts                  ← BullMQ worker definition
│   ├── youtube.ts                 ← yt-dlp download logic
│   ├── article.ts                 ← Puppeteer article scraping
│   ├── pdf.ts                     ← PDF text extraction
│   └── validators.ts              ← Input validation
├── transcribe/
│   ├── worker.ts
│   ├── whisper.ts                 ← Whisper API client (Modal/Replicate)
│   ├── assemblyai.ts              ← AssemblyAI API client
│   ├── diarization.ts             ← Speaker diarization logic
│   └── hallucination-filter.ts    ← Post-processing filter
├── analyze/
│   ├── worker.ts
│   ├── clip-analyzer.ts           ← Clip detection via LLM
│   ├── text-generator.ts          ← Text output generation
│   ├── speaker-roles.ts           ← Role detection
│   └── output-parser.ts           ← JSON response parsing + validation
├── render/
│   ├── worker.ts
│   ├── ffmpeg.ts                  ← FFmpeg command builders
│   ├── face-detect.ts             ← Face detection logic
│   ├── reframe.ts                 ← Crop rectangle calculation
│   ├── captions.ts                ← ASS subtitle generation
│   └── validators.ts              ← Output validation (resolution, aspect ratio)
├── schedule/
│   ├── worker.ts
│   ├── adapters/
│   │   ├── youtube.ts
│   │   ├── tiktok.ts
│   │   ├── linkedin.ts
│   │   └── x-twitter.ts
│   └── token-refresh.ts           ← OAuth token refresh logic
└── export/
    ├── worker.ts
    └── packager.ts                ← ZIP creation logic
```

### Shared Library

```
src/lib/
├── supabase/
│   ├── client.ts                  ← Browser Supabase client
│   ├── server.ts                  ← Server Supabase client
│   └── admin.ts                   ← Service role client (workers)
├── queue/
│   ├── connection.ts              ← Redis connection
│   ├── queues.ts                  ← Queue instances
│   └── config.ts                  ← Queue configuration
├── llm/
│   ├── client.ts                  ← Claude API client
│   └── structured-output.ts       ← JSON response parser
├── storage/
│   ├── upload.ts                  ← File upload helpers
│   └── download.ts                ← Signed URL generation
├── billing/
│   ├── stripe.ts                  ← Stripe client
│   ├── usage.ts                   ← Minute tracking
│   └── limits.ts                  ← Plan limit enforcement
└── utils/
    ├── duration.ts                ← Time formatting
    ├── validation.ts              ← Zod schemas
    └── errors.ts                  ← Error types
```

---

## Data Flow: YouTube URL → Complete Outputs

```
1. User pastes YouTube URL in dashboard
   └── POST /api/v1/jobs {url: "https://youtube.com/watch?v=xxx"}
       ├── Validate URL
       ├── Check user billing (minutes available)
       ├── Insert job row (status: created)
       ├── Enqueue ingest job
       └── Return job ID + SSE stream URL

2. Ingest worker picks up job
   ├── yt-dlp: download video (best quality ≤1080p)
   ├── FFprobe: extract duration, resolution
   ├── yt-dlp: extract metadata (title, description, thumbnail)
   ├── Upload video to storage
   ├── Update job (status: transcribing, source metadata populated)
   └── Enqueue transcribe job

3. Transcribe worker picks up job
   ├── FFmpeg: extract audio track (WAV)
   ├── Whisper API: transcribe audio
   ├── Parse response: segments, timestamps, words
   ├── Speaker diarization: label speakers
   ├── Hallucination filter: remove phantom phrases
   ├── Insert transcript row
   ├── Update job (status: analyzing, speakers found: N)
   └── Enqueue analyze job

4. Analyze worker picks up job
   ├── Load transcript from DB
   ├── LLM call 1: speaker role detection
   ├── LLM call 2: clip candidate analysis (returns 12-15 candidates)
   ├── LLM calls 3-7 (parallel): LinkedIn posts, X threads, newsletter, summary, chapters
   ├── Insert clip rows (status: review)
   ├── Insert text_output rows (status: draft)
   ├── Update job (status: rendering, clip_count: N, text_output_count: N)
   └── Enqueue render jobs (one per clip)

5. Render workers pick up clips (parallel)
   ├── FFmpeg: extract clip segment from source
   ├── Face detection: find faces in keyframes
   ├── Reframe: compute crop for 9:16, 1:1, 16:9
   ├── Captions: generate ASS subtitle file
   ├── FFmpeg: render each aspect ratio with captions
   ├── Upload rendered files to storage
   ├── Update clip row (rendered_files, render_status: complete)
   └── When all clips rendered: update job (status: complete)

6. Dashboard shows review queue
   └── User reviews clips + text outputs
       ├── Approve/skip clips
       ├── Edit/refine text outputs
       └── Select platforms per output

7. User schedules approved outputs
   ├── Insert scheduled_post rows (status: queued)
   └── BullMQ delayed job created for each post

8. Schedule worker fires at scheduled time
   ├── Load post + connection + content
   ├── Refresh OAuth token if needed
   ├── Call platform API (upload video or create text post)
   ├── Update scheduled_post (status: posted, platform_post_url)
   └── Fire webhook: post.published
```

---

## Deployment Architecture

```
┌─────────────────────────────┐
│         Vercel               │
│  ┌───────────────────────┐  │
│  │  Next.js Frontend     │  │
│  │  + API Routes         │  │
│  │  + SSE Endpoints      │  │
│  └───────────────────────┘  │
└──────────────┬──────────────┘
               │ HTTPS
               ▼
┌──────────────────────────────┐     ┌──────────────────────┐
│    Railway / Render           │     │    Supabase          │
│  ┌────────────────────────┐  │     │  ┌────────────────┐  │
│  │  Worker Process        │  │◄───►│  │  PostgreSQL    │  │
│  │  (all 6 queue workers) │  │     │  │  Auth          │  │
│  └────────────────────────┘  │     │  │  Storage       │  │
└──────────────┬───────────────┘     │  │  Realtime      │  │
               │                      │  └────────────────┘  │
               ▼                      └──────────────────────┘
┌──────────────────────────────┐
│    Upstash Redis              │
│  ┌────────────────────────┐  │
│  │  BullMQ Queues         │  │
│  │  Session Cache         │  │
│  │  Rate Limiting         │  │
│  └────────────────────────┘  │
└──────────────────────────────┘

External APIs:
├── Modal.com / Replicate (Whisper GPU)
├── AssemblyAI (transcription fallback)
├── Anthropic (Claude API)
├── YouTube Data API
├── TikTok Content API
├── LinkedIn Marketing API
├── X API v2
└── Stripe (billing)
```

---

## Security

### Authentication Flow
1. User signs up/in via Supabase Auth (email or Google OAuth)
2. Supabase issues JWT with user ID
3. All API routes verify JWT via Supabase middleware
4. API key auth (Pro+ plans): Bearer token → lookup key hash in DB → validate

### Secrets Management
- All secrets in environment variables
- Vercel encrypted env vars for frontend
- Railway/Render encrypted env vars for workers
- Social OAuth tokens encrypted at rest in DB (Supabase handles this)
- API keys stored as bcrypt hashes (never plaintext)

### Rate Limiting
- Per-user: 10 jobs/hour (free), 30 jobs/hour (paid)
- Per-API-key: 60 requests/minute
- Per-social-platform: respect platform-specific limits
- Implemented via Redis counters with TTL

---

## Monitoring & Observability

| Tool | Purpose |
|------|---------|
| Sentry | Error tracking (frontend + workers) |
| PostHog | Product analytics (user behavior, funnel) |
| Bull Board | Queue monitoring (depth, processing time, failures) |
| Vercel Analytics | Web vitals, page load performance |
| Upstash Console | Redis metrics |
| Supabase Dashboard | DB metrics, auth events, storage usage |
