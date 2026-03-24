# ARCHITECTURE_IMPLICATIONS.md

> Technical architecture decisions for OriginClipAI v1, informed by competitive research, cost modeling, and scaling requirements for a PLG SaaS product.

---

## Architecture Principle

**Modular pipeline over monolith.** Every processing step (ingest, transcribe, analyze, clip, render, generate text) is an independent job that communicates via a queue. This enables independent scaling, retry logic per step, and future API exposure of individual pipeline stages.

---

## System Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                            │
│                                                                │
│   Next.js 14 App Router (Dashboard)    REST API (Headless)     │
│   ├─ Ingest UI                         ├─ POST /jobs           │
│   ├─ Processing Status (SSE)           ├─ GET /jobs/:id        │
│   ├─ Review Queue                      ├─ GET /jobs/:id/clips  │
│   ├─ Schedule Manager                  ├─ GET /jobs/:id/texts  │
│   └─ Settings / Billing                ├─ POST /schedule       │
│                                        └─ Webhooks             │
└─────────────────────────┬──────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│                       API LAYER                                │
│                                                                │
│   Next.js API Routes / tRPC                                    │
│   ├─ Auth (NextAuth / Clerk)                                   │
│   ├─ Job orchestration                                         │
│   ├─ Rate limiting & billing enforcement                       │
│   └─ SSE/WebSocket for processing updates                      │
└─────────────────────────┬──────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│                      QUEUE LAYER                               │
│                                                                │
│   BullMQ (Redis-backed)                                        │
│   ├─ ingest.queue      — download/extract source content       │
│   ├─ transcribe.queue  — speech-to-text + diarization          │
│   ├─ analyze.queue     — LLM clip scoring + text generation    │
│   ├─ render.queue      — video processing (reframe, caption)   │
│   ├─ schedule.queue    — social platform posting               │
│   └─ export.queue      — ZIP bundle packaging                  │
└─────────────────────────┬──────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│                     WORKER LAYER                               │
│                                                                │
│   Ingest Worker         — yt-dlp, Puppeteer, PDF parser        │
│   Transcribe Worker     — Whisper (self-hosted) / AssemblyAI   │
│   Analyze Worker        — Claude/GPT-4o API calls              │
│   Render Worker         — FFmpeg + face detection              │
│   Schedule Worker       — Platform API clients                 │
│   Export Worker         — Archiver (ZIP creation)              │
└─────────────────────────┬──────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                │
│                                                                │
│   PostgreSQL (Supabase)     — jobs, clips, texts, users, auth  │
│   Redis                     — queue state, caching, sessions   │
│   S3-compatible storage     — source files, rendered clips,    │
│   (Supabase Storage / R2)     transcripts, exports             │
└────────────────────────────────────────────────────────────────┘
```

---

## Technology Choices (Justified)

### Frontend: Next.js 14 App Router

**Why:** Consistent with Dave's existing stack (CalcuAI, HealthInsuranceRenew, NicheToDemand). Server components for dashboard rendering. API routes for backend. App Router for layouts and streaming.

**Alternatives considered:**
- SvelteKit — faster runtime, but less ecosystem support and Dave has no existing projects in it.
- Remix — good data loading patterns, but Next.js has stronger Vercel deployment story and Dave's familiarity.

### Database: PostgreSQL via Supabase

**Why:** Supabase provides managed PostgreSQL + auth + storage + realtime subscriptions in one platform. Consistent with Dave's HomeSnapFix stack. Row Level Security for multi-tenant isolation. Realtime subscriptions enable live processing status without custom WebSocket infrastructure.

**Alternatives considered:**
- PlanetScale (MySQL) — good scaling story, but PostgreSQL's JSONB columns are better for storing variable clip/text metadata.
- Neon (PostgreSQL) — lighter weight, but Supabase bundles auth + storage which reduces integration surface.

### Queue: BullMQ on Redis

**Why:** Battle-tested Node.js job queue. Supports priority queues, delayed jobs (scheduling), retry with backoff, job progress reporting, and rate limiting. Redis is the backing store — single dependency for queue + caching + sessions.

**Alternatives considered:**
- AWS SQS — managed but adds AWS dependency and complicates local dev.
- Inngest — serverless job orchestration, good for event-driven. But BullMQ's explicit queue model maps better to the pipeline architecture and gives full control over retry/priority.
- Temporal — powerful workflow orchestration but heavy infrastructure for v1.

### Object Storage: Supabase Storage or Cloudflare R2

**Why:** Video files, rendered clips, and export packages need blob storage. Supabase Storage integrates with the rest of the Supabase stack. Cloudflare R2 is cheaper for egress-heavy workloads (free egress) — important when users download multiple clips per job.

**Decision:** Start with Supabase Storage for simplicity. Migrate to R2 if egress costs become significant at scale.

### Transcription: Whisper (primary) + AssemblyAI (fallback)

**Why:**
- **Whisper** (self-hosted via replicate.com or modal.com): Near-free batch transcription at $0.001-0.003/min. 58 languages. Self-hostable for cost control. Known hallucination issue in silent segments — mitigated with post-processing filter.
- **AssemblyAI Universal-2**: Best commercial accuracy at $0.0025/min. Integrated speaker diarization. PII redaction. 30% fewer hallucinations than Whisper. Used as fallback when Whisper quality is insufficient or for production-critical jobs.

**Cost per hour of source content:** $0.06-0.15 (Whisper) or $0.15 (AssemblyAI).

### LLM for Analysis & Text Generation: Claude API (primary)

**Why:** Claude's long context window (200K tokens) handles full transcripts of 3-hour videos in a single pass. Strong instruction following for structured output (JSON clip candidates, platform-specific text formats). Competitive pricing.

**Usage pattern:**
1. **Clip analysis:** Send full transcript + speaker labels → receive structured JSON of clip candidates with scores, boundaries, and reasoning.
2. **Text generation:** Send transcript segments + output format instructions → receive platform-specific text outputs (LinkedIn format, X thread format, newsletter format).
3. **Refinement:** Send existing text + user instruction → receive refined version.

**Cost estimate:** ~$0.10-0.50 per job depending on transcript length and number of outputs.

**Alternatives considered:**
- GPT-4o — comparable quality, slightly different pricing model. Claude's longer context window is advantageous for full-transcript analysis.
- Open-source (Llama 3, Mistral) — 80% cost reduction possible for well-defined tasks. Viable for v2 cost optimization but adds self-hosting complexity for v1.

### Video Processing: FFmpeg + lightweight face detection

**Why:** FFmpeg is the industry standard for video transcoding, trimming, stitching, and overlay rendering. Face detection for auto-reframe uses a lightweight model (e.g., MediaPipe Face Detection or YOLO-face) running on CPU — no GPU required for detection, only for Whisper transcription.

**Pipeline per clip:**
1. Extract clip segment from source (FFmpeg trim)
2. Detect face positions per frame (or keyframe sampling)
3. Compute reframe crop rectangle (center on face, smooth motion)
4. Render reframed clip with caption overlay (FFmpeg filter complex)
5. Output MP4 at 1080p

**Cost estimate:** $0.01-0.05 per minute of rendered video on cloud compute.

**Alternatives considered:**
- Remotion Lambda — React-based video rendering on AWS Lambda. Good for template-based videos but FFmpeg is more flexible for reframe + caption overlay workflows.
- Shotstack API — managed video rendering API. Good abstraction but adds vendor dependency and per-minute costs. Keep as fallback option.

### Social API Clients: Per-Platform OAuth + Posting

| Platform | API | Key Constraints |
|----------|-----|-----------------|
| YouTube | Data API v3 | 10,000 units/day quota. Shorts upload supported. OAuth 2.0. |
| TikTok | Content Posting API | Requires content audit approval for public visibility. ~15 posts/day/creator. |
| LinkedIn | Marketing API | Requires approved developer app. Rate limited. Text + image posts. |
| X/Twitter | API v2 | Paid API tiers. $100/mo Basic plan for posting. Rate limited. |

**Architecture pattern:** Each platform gets its own adapter class with standardized interface: `connect(oauth) → post(content) → status()`. The schedule worker dequeues jobs at the scheduled time and calls the appropriate adapter.

**Key risk:** TikTok requires content audit approval before the app can post publicly visible content. This is a multi-week process. Start the approval process in Phase 1, not Phase 4.

---

## Pipeline Job Architecture

### Job Lifecycle

```
CREATED → INGESTING → TRANSCRIBING → ANALYZING → RENDERING → COMPLETE
                                                              ↓
                                                         (per output)
                                                    SCHEDULING → POSTED
```

### Job Schema (PostgreSQL)

```
jobs
├── id (uuid)
├── user_id (fk → users)
├── source_type (enum: youtube_url, video_upload, audio_upload, article_url, pdf_upload)
├── source_url (nullable)
├── source_file_key (nullable, S3 key)
├── status (enum: created, ingesting, transcribing, analyzing, rendering, complete, failed)
├── transcript_id (fk → transcripts, nullable)
├── metadata (jsonb: title, duration, detected_speakers, etc.)
├── error (text, nullable)
├── created_at
└── updated_at

transcripts
├── id (uuid)
├── job_id (fk → jobs)
├── full_text (text)
├── segments (jsonb: array of {start, end, text, speaker_id, speaker_role})
├── speakers (jsonb: array of {id, label, role, talk_time_pct})
├── word_timestamps (jsonb)
└── engine (enum: whisper, assemblyai)

clips
├── id (uuid)
├── job_id (fk → jobs)
├── title (text)
├── start_time (float)
├── end_time (float)
├── duration (float)
├── score (int 0-100)
├── score_factors (jsonb: {coherence, hook_strength, topic_clarity, emotional_energy})
├── speaker_id (text)
├── speaker_role (enum: host, guest, solo, unknown)
├── status (enum: review, approved, rejected)
├── aspect_ratios (jsonb: array of rendered ratios)
├── caption_style (text)
├── rendered_file_keys (jsonb: {9x16: "s3key", 1x1: "s3key", ...})
├── transcript_excerpt (text)
├── platforms (jsonb: array of scheduled platforms)
└── created_at

text_outputs
├── id (uuid)
├── job_id (fk → jobs)
├── type (enum: linkedin_post, x_thread, newsletter_section, summary, chapter_markers, social_caption, blog_draft)
├── label (text)
├── content (text)
├── word_count (int)
├── status (enum: draft, approved, scheduled, posted)
├── platform (nullable)
├── metadata (jsonb: thread_posts array for X threads, etc.)
└── created_at

scheduled_posts
├── id (uuid)
├── user_id (fk → users)
├── clip_id (nullable, fk → clips)
├── text_output_id (nullable, fk → text_outputs)
├── platform (enum: youtube, tiktok, linkedin, x)
├── scheduled_at (timestamptz)
├── status (enum: queued, posting, posted, failed)
├── platform_post_id (text, nullable)
├── error (text, nullable)
└── created_at
```

---

## Cost Model Per Job

For a 60-minute YouTube video processed through the full pipeline:

| Step | Cost |
|------|------|
| Ingest (yt-dlp download) | ~$0.00 (bandwidth only) |
| Transcription (Whisper) | ~$0.06-0.15 |
| LLM analysis (clip scoring) | ~$0.10-0.20 |
| LLM text generation (4 outputs) | ~$0.05-0.15 |
| Video rendering (10 clips × 60s) | ~$0.10-0.50 |
| Storage (source + clips) | ~$0.01-0.05 |
| **Total per job** | **$0.32-1.05** |

### Free Tier Economics

- Free tier: 30 min/month = ~0.5 jobs
- Cost per free user: ~$0.50/month
- At 3% free-to-paid conversion: need $16.67 revenue per converter to break even
- Creator tier at $19/month covers 38 free users per converter

### Paid Tier Unit Economics

- Creator ($19/mo, 300 min): ~5 jobs/month = $5 cost = **74% gross margin**
- Pro ($39/mo, 900 min): ~15 jobs/month = $15 cost = **62% gross margin**
- Business ($79/mo, 2400 min): ~40 jobs/month = $40 cost = **49% gross margin**

Target blended gross margin: **60-70%** — healthy for SaaS.

---

## Scaling Considerations

### What Scales Independently

| Component | Scaling Pattern |
|-----------|----------------|
| Web frontend | Vercel auto-scaling (serverless) |
| API layer | Vercel serverless functions or dedicated Node.js process |
| Ingest workers | Horizontal — add containers as queue depth grows |
| Transcription workers | GPU instances — scale with modal.com or replicate.com serverless GPU |
| Analysis workers | CPU instances — limited by LLM API rate limits, not compute |
| Render workers | CPU-heavy — scale horizontally, each worker processes one clip at a time |
| Schedule workers | Single worker sufficient for v1 — rate limited by platform APIs |

### Bottleneck Analysis

1. **Transcription** is the slowest step (~1x realtime on CPU, ~0.1x on GPU). Use serverless GPU (Modal/Replicate) to avoid idle cost.
2. **Rendering** is CPU-intensive but parallelizable — 10 clips can render on 10 workers simultaneously.
3. **LLM calls** are rate-limited but fast (~5-15 seconds per call). Batch clip analysis into a single call where possible.
4. **Social API rate limits** are the hard ceiling for scheduling. Cannot post more than platform limits regardless of infrastructure.

---

## Security & Compliance

### Authentication
- NextAuth.js or Clerk for auth (email + Google OAuth)
- JWT tokens for API authentication
- API keys (revocable) for headless access

### Data Handling
- Source videos deleted after processing (configurable retention: 24h default)
- Rendered clips stored until user deletes or account closes
- Transcripts stored persistently (required for regeneration)
- No PII collection beyond email + OAuth profile
- GDPR: data export and deletion endpoints required

### Content Safety
- No content moderation of source material (user's own content)
- Rate limiting per user to prevent abuse
- File size limits: 5GB upload max (v1)

---

## Infrastructure Bill of Materials (v1)

| Service | Purpose | Estimated Monthly Cost |
|---------|---------|----------------------|
| Vercel Pro | Frontend hosting + API | $20/mo |
| Supabase Pro | PostgreSQL + Auth + Storage | $25/mo |
| Redis (Upstash) | BullMQ queue + caching | $10-30/mo |
| Modal.com / Replicate | Serverless GPU (Whisper) | $50-200/mo (usage-based) |
| Cloud compute (Render/Railway) | Workers (ingest, analyze, render) | $50-150/mo |
| Anthropic API | LLM calls | $50-200/mo (usage-based) |
| Cloudflare R2 | Object storage (if needed) | $5-20/mo |
| X API Basic | Twitter posting | $100/mo |
| Domain + DNS | Infrastructure | $15/mo |
| **Total** | | **$325-760/mo** |

Break-even at ~17-40 paid Creator ($19/mo) subscribers. Achievable within 90 days of launch with effective PLG.

---

## Key Technical Risks

| Risk | Mitigation |
|------|-----------|
| TikTok content audit approval delayed | Start approval process in week 1, not week 11. Ship YouTube + LinkedIn + X first if TikTok delayed. |
| Whisper hallucinations in production | Post-processing filter for known hallucination patterns. AssemblyAI fallback. User-visible confidence flag. |
| Video rendering quality issues | Extensive test suite across content types (talking head, interview, screen share, multi-camera). |
| LLM output quality variance | Structured prompts with examples. Temperature controls. User regeneration as safety valve. |
| Social API rate limits hit at scale | Per-user rate limiting in schedule worker. Queue with exponential backoff. |
| Storage costs at scale | Implement retention policies. Delete source files after processing. Offer user-configurable retention. |
