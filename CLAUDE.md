# CLAUDE.md

> Master operating instructions for OriginClipAI. Every Claude Code session must read this file first. No exceptions.

---

## What This Product Is

OriginClipAI is a **headless multi-platform content repurposing engine** for solo creators. It takes long-form content (YouTube videos, podcasts, articles, PDFs) and produces short-form video clips, LinkedIn posts, X threads, newsletter sections, and other platform-native outputs — with a structured human review workflow and built-in social scheduling.

This is not a video editor. This is not a social media management tool. This is not an AI wrapper around FFmpeg. This is a **pipeline-first SaaS product** that treats every input as a job, every output as reviewable, and every integration as abstractable.

---

## What This Product Is NOT

Read this list before writing any code. If your work drifts toward any of these, stop.

- **Not a general-purpose video editor.** We do not compete with Descript, Premiere, or CapCut. We do not build timeline UIs, multi-track editing, or effects panels.
- **Not a recording tool.** We do not record video or audio. We process existing content. Riverside and Loom own recording.
- **Not a social media dashboard.** We schedule posts from our outputs. We do not aggregate analytics, manage comments, or monitor mentions. Buffer and Hootsuite own that.
- **Not a content calendar.** v1 has a scheduling queue, not a calendar view.
- **Not an agency tool.** v1 is single-user. No multi-seat, no client workspaces, no white-label. Solo creators only.
- **Not an AI art generator.** We do not generate B-roll footage, stock imagery, or AI visuals in v1.

---

## Target User

Solo creator who publishes weekly long-form content (YouTube videos, podcast episodes, blog posts, newsletters) and needs to repurpose it across TikTok, YouTube Shorts, LinkedIn, and X without hiring a team.

**Persona:** Publishes 1-2 long-form pieces per week. Currently uses 2-3 tools (OpusClip + Castmagic + manual posting). Spends 4-6 hours per week on repurposing. Wants that down to 1-2 hours. Willing to pay $19-39/month if the tool actually works.

---

## V1 Scope Control

### IN — ship these in v1

**Inputs:** YouTube URL, public video URL, MP4 upload, audio upload (MP3/WAV/M4A), article/blog URL, PDF upload.

**Processing:** Transcription (Whisper primary, AssemblyAI fallback), speaker diarization, speaker role detection (host vs. guest), LLM-powered clip detection with scoring, LLM-powered text generation.

**Video outputs:** 8-20 scored clip candidates per job, auto-reframe (9:16, 1:1, 16:9), face tracking, auto-captions (3-5 styles), word-level highlighting, speaker color coding, 1080p MP4 export, SRT/VTT export.

**Text outputs:** LinkedIn posts (2-3), X threads (1-2), newsletter sections (1-2), summary, chapter markers, social captions per clip, blog draft from video/audio. Custom prompt templates.

**Review:** Structured approve/edit/skip queue for clips. Structured approve/refine/schedule workflow for text. Unified clips + text tabs. Keyboard shortcuts. Regenerate single output.

**Scheduling:** YouTube Shorts, TikTok, LinkedIn (text), X (text + threads). OAuth connections. Time-based queue. Retry with backoff.

**Export:** Individual MP4, batch ZIP, text outputs as Markdown, full export package (everything bundled).

**API:** Self-serve API keys on Pro+ plans. REST endpoints for full pipeline. Webhooks on job completion, clip render, post published/failed.

**Billing:** Free (30 min/month, watermark) → Creator $19/mo (300 min) → Pro $39/mo (900 min, API) → Business $79/mo (2400 min).

### OUT — do not build these in v1

Do not write code for, scaffold for, or design around any of the following. They are explicitly v2+.

| Feature | Why not v1 |
|---------|-----------|
| Instagram Reels scheduling | Most restrictive API. Ship TikTok + YouTube first. |
| Facebook scheduling | Low priority for solo creators. |
| 4K export | Doubles render cost. 1080p is sufficient for short-form. |
| AI B-Roll / stock footage | Complex feature, not core pipeline. |
| Brand voice training | Requires fine-tuning infra. Custom prompts are sufficient. |
| Multi-seat / teams | Solo creators only in v1. |
| Brand kits | Manual caption customization covers the need. |
| RSS feed monitoring | Manual URL input sufficient for PLG. |
| Cloud storage integration | Direct upload covers the need. |
| Calendar view | Queue with timestamps is sufficient. |
| XML export (Premiere/DaVinci) | Niche. MP4 covers 95% of creators. |
| Content analytics | Separate product surface. |
| Multimodal clip analysis (visual) | Expensive. Transcript + audio energy is 80% of the value. |
| Real-time collaboration | Not a v1 concern. |

**Anti-drift rule:** If you find yourself writing code that enables any "OUT" feature — even "just the schema" or "just the placeholder" — stop. Do not pre-build for v2. v1 ships lean or it doesn't ship.

---

## Architecture Rules

### 1. Everything is a Job

The job is the central abstraction. Every user action that triggers processing creates a job. Every job flows through the pipeline: `CREATED → INGESTING → TRANSCRIBING → ANALYZING → RENDERING → COMPLETE`. Text-only inputs skip `TRANSCRIBING` and `RENDERING`.

Do not create processing pathways that bypass the job model. Do not add side-channel data flows. If a feature doesn't fit the job pipeline, it doesn't fit v1.

### 2. Workers Are Independent Processes

Workers run as separate Node.js processes, not inside Next.js. Each worker consumes from one BullMQ queue. Workers do not call each other directly — they communicate through the database and queue.

```
API Layer (Next.js)  →  enqueues jobs
Queue (BullMQ/Redis) →  buffers and dispatches
Workers (separate)   →  process and write results to DB
Dashboard (Next.js)  →  reads from DB, subscribes to realtime
```

Do not put worker logic inside API routes. Do not make workers depend on the Next.js process. Workers must be independently deployable and restartable.

### 3. Provider Abstraction Is Mandatory

Every external service must be wrapped in an abstraction layer. Never call a third-party API directly from worker business logic.

**Required abstractions:**

| Concern | Interface | v1 Implementation |
|---------|-----------|-------------------|
| Transcription | `TranscriptionProvider` | Whisper (Modal.com), AssemblyAI fallback |
| LLM | `LLMProvider` | Claude API (Anthropic) |
| Storage | `StorageProvider` | Supabase Storage |
| Social posting | `SocialAdapter` per platform | YouTube, TikTok, LinkedIn, X adapters |
| Video rendering | `RenderPipeline` | FFmpeg + MediaPipe |
| Billing | `BillingProvider` | Stripe |

**Why this matters:** We will swap providers. Whisper might become Deepgram. Claude might become GPT-4o for certain tasks. Supabase Storage might become R2. The worker code must not know or care which provider is behind the interface.

**Implementation pattern:**
```typescript
// ✅ Correct
const transcript = await transcriptionProvider.transcribe(audioPath, { language: 'en' });

// ❌ Wrong — direct provider call in worker logic
const response = await fetch('https://api.assemblyai.com/v2/transcript', { ... });
```

### 4. Prompts Are Data, Not Code

LLM prompt templates live in `/src/prompts/` as structured objects — not inline strings in worker files. Each prompt file exports:
- System message
- User message builder function
- Response parser function
- Model and temperature settings

When the analyze worker needs to score clips, it imports the prompt template and calls the LLM provider with it. The worker does not construct prompts itself.

### 5. Schema-First, Not Code-First

Database schema changes come first. Code follows schema. Never shape the schema around what's convenient for the current code — shape it around what the data actually is.

Use Prisma as the ORM. Migrations are generated from the Prisma schema. Do not write raw SQL for schema changes.

### 6. Server Components by Default

Next.js pages and layouts are Server Components unless they require interactivity (forms, real-time updates, client-side state). The review queue is a Client Component (keyboard shortcuts, selection state). The job list page is a Server Component.

Rule of thumb: if a component handles user input or real-time state, make it a Client Component. Everything else is Server.

---

## Coding Standards

### TypeScript
- Strict mode. No `any` types except at third-party adapter boundaries (and those must be typed internally).
- Zod for all external input validation (API requests, webhook payloads, LLM responses).
- Explicit return types on all exported functions.

### Naming
- Files: `kebab-case.ts`
- Components: `PascalCase.tsx`
- Functions: `camelCase`
- Types/Interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- DB columns: `snake_case`
- API routes: `/api/v1/kebab-case`

### Git
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- One concern per commit. Do not bundle.
- Feature branches: `feat/[feature-name]`

### Testing
- Write tests for: all API endpoints, all worker job processors, all prompt parsers, all provider adapters.
- Do not write tests for: React component rendering (v1), CSS styling, static pages.
- Test command: `npm test`. Run before declaring any work complete.
- If the area you touched has no tests, write them.

### Dependencies
- Check for existing alternatives before adding new npm packages.
- No packages over 5MB unless justified.
- Pin exact versions in package.json.

---

## UX Standards

### Design Language
- Light theme (warm off-white `#f6f5f2`). Dark theme is v1.1.
- Indigo accent (`#5046e5`), not purple gradients.
- Warm gray borders (`#e4e2dd`), not cool grays.
- Shadow-driven depth hierarchy.
- Fonts: Instrument Sans (display), DM Sans (body), JetBrains Mono (data).
- See `docs/DESIGN_SYSTEM.md` for full token reference.

### Review Queue Is the Product

The review queue (clips tab + text tab) is where creators spend 80% of their time. Every UX decision about the review queue should optimize for speed and confidence:
- Approve/skip with keyboard shortcuts (A / S)
- Navigate clips with arrow keys
- Score pills are color-coded (green 90+, amber 80+, gray below)
- Speaker badges on every clip
- Text outputs are inline-editable
- "Refine with AI" is one click, not a modal

### No "Virality" Language

We do not use the word "viral" or "virality" anywhere in the product. Not in scores, not in labels, not in marketing copy. We call it "engagement score." This is a conscious differentiation from OpusClip's discredited Virality Score.

### Honest Processing UX

Processing progress shows a step-by-step checklist, not a fake percentage bar. Each step (transcript → speakers → clips → texts → captions) checks off as the backend completes it. This builds trust.

---

## Build Priorities

Phase order is non-negotiable. Do not skip ahead.

1. **Phase 1 (Core Pipeline):** YouTube URL → transcription → clip detection → text generation → API endpoints. No GUI. Must work headlessly via `curl`.
2. **Phase 2 (Video Processing):** Reframe, face tracking, captioning. Clips export as properly rendered MP4s.
3. **Phase 3 (Dashboard):** Next.js dashboard — ingest, processing, review queue, settings.
4. **Phase 4 (Scheduling + Extended Inputs):** Social OAuth, scheduling workers, article/PDF/audio inputs.
5. **Phase 5 (API + Billing + Launch):** API keys, Stripe, onboarding, landing page.

**Within each phase:** Build the worker/backend first, then the UI. Never build UI for functionality that doesn't exist in the backend yet.

---

## Worker / Job Philosophy

### Job State Machine

```
CREATED → INGESTING → TRANSCRIBING → ANALYZING → RENDERING → COMPLETE
                                                                  ↑
                                                             (or FAILED at any step)
```

Text-only path: `CREATED → INGESTING → ANALYZING → COMPLETE`

### Worker Rules

1. **Workers are stateless.** All state lives in the database. A worker can crash at any point and the job can be retried.
2. **Workers are idempotent.** Running the same job twice produces the same result (or safely skips already-completed work).
3. **Workers report progress.** Update `jobs.progress` JSONB column at each meaningful step. The dashboard reads this for real-time display.
4. **Workers handle their own errors.** Catch, log, update job status to `failed` with error message, and re-throw for BullMQ retry logic.
5. **Workers never call other workers.** The orchestration is: worker completes → updates DB → enqueues next queue. Never direct worker-to-worker invocation.

### Concurrency Limits

| Queue | Workers | Why |
|-------|---------|-----|
| ingest | 5 | I/O bound (downloads). Can parallelize freely. |
| transcribe | 3 | GPU-bound (Whisper). Limited by provider capacity. |
| analyze | 5 | API-bound (LLM). Limited by rate limits, not compute. |
| render | 3 | CPU-intensive (FFmpeg). Memory-heavy. |
| schedule | 2 | Rate-limit-sensitive. Platforms throttle aggressively. |
| export | 3 | I/O bound (ZIP creation). Light. |

### Retry Policy

| Queue | Max Retries | Backoff | Timeout |
|-------|-------------|---------|---------|
| ingest | 3 | Exponential, 5s base | 10 min |
| transcribe | 2 | Exponential, 10s base | 30 min |
| analyze | 3 | Exponential, 3s base | 5 min |
| render | 3 | Exponential, 5s base | 10 min |
| schedule | 4 | Exponential, 5 min base | 5 min |
| export | 2 | Fixed, 5s | 5 min |

---

## Speaker-Aware Clipping (v1 Priority)

Speaker-aware clipping is a **v1 differentiator**, not a v2 nice-to-have. It must ship before any B-roll, effects, or advanced captioning work.

### What "Speaker-Aware" Means in v1

1. **Speaker diarization:** Every transcript segment is tagged with a speaker ID.
2. **Speaker role detection:** The analyze worker infers host vs. guest from talk-time ratios, question frequency, and introduction patterns.
3. **Speaker-filtered clip scoring:** Clips are tagged with primary speaker. The LLM prompt explicitly asks: "weight guest insights higher than host questions."
4. **Speaker badges in review UI:** Every clip shows which speaker drives it (color-coded badge).
5. **Future-ready:** The schema supports `speaker_role` enum and `speakers_present` JSONB on clips. This enables "show me only guest clips" filtering when the UI is ready.

### What It Does NOT Mean in v1
- No per-speaker video layout switching (picture-in-picture, split screen)
- No speaker-specific voice isolation
- No speaker identification by name from audio (manual label only)

---

## Provider-Specific Rules

### Transcription
- Default engine: Whisper (via Modal.com serverless GPU)
- Fallback: AssemblyAI (when Whisper fails or quality is flagged)
- Always run hallucination post-filter on Whisper output (known phantom phrases: "Thank you for watching", "Subscribe", "Like and share", repeated phrases in silence)
- Always extract word-level timestamps (required for captions)
- Always run speaker diarization (required for speaker-aware clipping)

### LLM (Claude API)
- Use Claude Sonnet for cost efficiency in v1. Opus available as Pro+ upgrade path.
- Temperature 0.3 for clip analysis (consistency). Temperature 0.7 for text generation (variety).
- All prompts must return structured JSON. No freeform text responses.
- All LLM responses must be parsed through Zod schemas. If parsing fails, retry once with format reinforcement.
- Never send user PII to the LLM. Transcripts are content, not personal data.

### Video (FFmpeg)
- All FFmpeg commands go in `/src/workers/render/` with full documentation.
- Test reframe logic with: solo speaker, 2-person interview, 3+ speakers, no face detected, face moving rapidly.
- Output validation after every render: check aspect ratio, resolution, duration, file size.
- Never render at resolution higher than source. If source is 720p, output is 720p.

### Social APIs
- Start TikTok content audit application in Phase 0. It takes weeks. Do not wait until Phase 4.
- Each platform adapter handles its own OAuth token refresh.
- Each adapter has its own rate limiter (per-user, per-platform).
- Never post without explicit user approval (scheduled_posts.status must be 'queued').
- Log all platform API responses for debugging failed posts.

---

## Anti-Drift Rules

These rules exist because AI coding assistants (including Claude Code) have known failure modes. Read and follow them.

1. **Do not refactor adjacent code.** If you're fixing a bug in the render worker, do not reorganize the ingest worker's file structure "while you're at it."
2. **Do not add abstraction layers that aren't needed yet.** If there's one implementation, there's no interface needed. Add the interface when the second implementation arrives.
3. **Do not pre-optimize.** Ship correct code first. Profile later. The exception is known O(n²) patterns in hot paths — fix those upfront.
4. **Do not add "helpful" features that aren't in scope.** No "I also added a dark mode toggle since I was in the settings page." If it's not in the current task, it doesn't get built.
5. **Do not change the pipeline step order** without updating all docs (CLAUDE.md, QUEUE_JOBS_PLAN.md, PROJECT_SPEC.md, ARCHITECTURE.md).
6. **Do not use browser storage APIs** (localStorage, sessionStorage) for app state. All state lives in Supabase (persistent) or React state (ephemeral).
7. **Do not hardcode anything.** No API keys, URLs, configuration values, magic numbers, or provider-specific strings in business logic.
8. **Do not create database tables or columns for v2 features.** The schema serves v1. When v2 features are designed, the schema will be extended then.
9. **Do not write marketing copy into the codebase.** No "10x your content" or "viral clips" in component text, alt tags, or comments.
10. **Do not skip tests.** If you touched it, test it. If there are no tests for the file you touched, write them before moving on.

---

## File Structure

```
originclipai/
├── CLAUDE.md                         ← YOU ARE HERE
├── COMPETITOR_RESEARCH.md            ← Read-only market research
├── FEATURE_MATRIX.md                 ← Read-only competitive grid
├── POSITIONING_GAPS.md               ← Read-only differentiation strategy
├── V1_SCOPE_RECOMMENDATION.md        ← Read-only scope decisions
├── UX_AND_WORKFLOW_NOTES.md          ← Read-only UX reference
├── ARCHITECTURE_IMPLICATIONS.md      ← Read-only architecture rationale
│
├── docs/
│   ├── PROJECT_SPEC.md               ← Product specification
│   ├── ARCHITECTURE.md               ← Technical architecture
│   ├── BUILD_PLAN.md                 ← Phase-by-phase build plan
│   ├── DESIGN_SYSTEM.md              ← Visual design tokens
│   ├── DB_SCHEMA_PLAN.md             ← Database schema (Prisma)
│   ├── QUEUE_JOBS_PLAN.md            ← Queue and worker architecture
│   ├── PROMPT_STRATEGY.md            ← LLM prompt templates
│   └── SEO_CONTENT_PLAN.md           ← Landing page and content SEO
│
├── prisma/
│   └── schema.prisma                 ← Source of truth for database
│
├── src/
│   ├── app/                          ← Next.js App Router
│   │   ├── (auth)/                   ← Sign in/up pages
│   │   ├── (dashboard)/              ← Protected app pages
│   │   ├── (marketing)/              ← Public pages (landing, pricing, blog)
│   │   └── api/                      ← API routes
│   │       └── v1/                   ← Versioned public API
│   ├── components/                   ← React components
│   │   ├── ui/                       ← Design system primitives
│   │   ├── layout/                   ← App shell, sidebar, top bar
│   │   ├── ingest/                   ← Ingest page components
│   │   ├── processing/               ← Processing status components
│   │   ├── review/                   ← Review queue components
│   │   └── schedule/                 ← Schedule page components
│   ├── lib/                          ← Shared library code
│   │   ├── providers/                ← Provider abstractions
│   │   │   ├── transcription.ts      ← TranscriptionProvider interface + impls
│   │   │   ├── llm.ts               ← LLMProvider interface + impls
│   │   │   ├── storage.ts           ← StorageProvider interface + impls
│   │   │   └── billing.ts           ← BillingProvider interface + impls
│   │   ├── social/                   ← Social platform adapters
│   │   │   ├── adapter.ts           ← SocialAdapter interface
│   │   │   ├── youtube.ts
│   │   │   ├── tiktok.ts
│   │   │   ├── linkedin.ts
│   │   │   └── x-twitter.ts
│   │   ├── queue/                    ← BullMQ setup
│   │   ├── db/                       ← Prisma client + helpers
│   │   └── utils/                    ← Shared utilities
│   ├── workers/                      ← Worker processes (NOT inside Next.js)
│   │   ├── index.ts                  ← Worker entry point
│   │   ├── ingest/
│   │   ├── transcribe/
│   │   ├── analyze/
│   │   ├── render/
│   │   ├── schedule/
│   │   └── export/
│   ├── prompts/                      ← LLM prompt templates
│   └── types/                        ← Shared TypeScript types
│
├── tests/                            ← Test suite
├── scripts/                          ← Dev scripts (seed, process CLI, etc.)
└── skills/                           ← Skill docs for Claude Code patterns
```

---

## Environment Variables

```env
# Database
DATABASE_URL=                          # Prisma connection string (Supabase pooler)
DIRECT_DATABASE_URL=                   # Direct connection (migrations)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Redis
REDIS_URL=                             # BullMQ + caching

# LLM
ANTHROPIC_API_KEY=

# Transcription
ASSEMBLYAI_API_KEY=
MODAL_TOKEN_ID=                        # For Whisper on Modal
MODAL_TOKEN_SECRET=

# Social Platforms
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
X_API_KEY=
X_API_SECRET=
X_BEARER_TOKEN=

# Billing
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# App
NEXT_PUBLIC_APP_URL=                   # https://app.originclipai.com
WORKER_CONCURRENCY=                    # Override default concurrency per queue
```

---

## Common Commands

```bash
npm run dev              # Start Next.js dev server
npm run workers          # Start all BullMQ workers
npm run workers:dev      # Start workers with hot reload
npm test                 # Run test suite
npm run test:watch       # Run tests in watch mode
npm run db:generate      # Generate Prisma client from schema
npm run db:migrate       # Create + apply migration
npm run db:push          # Push schema changes (dev only)
npm run db:seed          # Seed dev database
npm run db:studio        # Open Prisma Studio
npm run build            # Production build
npm run lint             # ESLint + Prettier check
npm run typecheck        # TypeScript strict check
```

---

## Before You Start Any Task

1. Read this file.
2. Read the relevant `docs/` spec for the area you're working in.
3. Check `V1_SCOPE_RECOMMENDATION.md` — confirm the feature is IN scope.
4. If modifying the pipeline: read `QUEUE_JOBS_PLAN.md`.
5. If modifying the schema: read `DB_SCHEMA_PLAN.md`.
6. If modifying prompts: read `PROMPT_STRATEGY.md`.
7. If modifying UI: read `DESIGN_SYSTEM.md`.
8. Write code. Write tests. Run tests.
9. One concern per commit.
