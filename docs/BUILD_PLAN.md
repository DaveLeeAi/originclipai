# BUILD_PLAN.md

> Phase-by-phase build plan for OriginClipAI v1. Each phase produces a shippable increment. Total timeline: 16 weeks to public beta.

---

## Phase 0: Foundations (Week 1)

### Objective
Repo setup, infrastructure provisioning, and platform API approval kickoff.

### Tasks
- [ ] Initialize Next.js 14 project with App Router, TypeScript strict mode
- [ ] Configure Tailwind CSS with design system tokens (see DESIGN_SYSTEM.md)
- [ ] Set up Supabase project (PostgreSQL + Auth + Storage)
- [ ] Create initial DB migration (users, jobs, transcripts, clips, text_outputs, scheduled_posts)
- [ ] Set up Redis instance (Upstash) for BullMQ
- [ ] Configure BullMQ with queue definitions (ingest, transcribe, analyze, render, schedule, export)
- [ ] Set up environment variables structure (.env.local.example)
- [ ] Configure ESLint, Prettier, Husky pre-commit hooks
- [ ] **START TikTok content audit application** (multi-week approval process)
- [ ] **START YouTube Data API quota increase request**
- [ ] Set up LinkedIn developer app
- [ ] Set up X/Twitter API Basic plan ($100/mo)
- [ ] Create CI pipeline (GitHub Actions: lint, typecheck, test)

### Milestone
`npm run dev` shows empty Next.js app. `npm run workers` starts BullMQ workers that log to console. DB schema deployed. All platform API applications submitted.

---

## Phase 1: Core Pipeline — CLI/API (Weeks 2-4)

### Objective
End-to-end pipeline from YouTube URL to clips + text outputs, runnable via API or CLI. No GUI yet.

### Week 2: Ingest + Transcribe
- [ ] Ingest worker: YouTube URL → yt-dlp download → store in Supabase Storage
- [ ] Ingest worker: detect input type from URL pattern
- [ ] Transcribe worker: extract audio from video (FFmpeg)
- [ ] Transcribe worker: Whisper transcription via Modal.com or Replicate
- [ ] Transcribe worker: AssemblyAI fallback path
- [ ] Transcribe worker: speaker diarization → speaker labels
- [ ] Transcribe worker: hallucination post-filter
- [ ] Transcribe worker: word-level timestamp extraction
- [ ] Job status updates via Supabase realtime (or SSE endpoint)
- [ ] Write tests: ingest with valid YouTube URL, invalid URL, transcription accuracy spot-check

### Week 3: Analyze (Clip Detection + Text Generation)
- [ ] Analyze worker: send transcript to Claude API for clip candidate identification
- [ ] Prompt template: clip scoring (see PROMPT_STRATEGY.md)
- [ ] Analyze worker: parse LLM response into structured clip candidates (start/end, score, title, speaker)
- [ ] Speaker role detection: infer host vs. guest from talk-time ratios + question patterns
- [ ] Analyze worker: send transcript to Claude API for text output generation
- [ ] Prompt templates: LinkedIn post, X thread, newsletter section, summary, chapter markers
- [ ] Store clip candidates and text outputs in DB
- [ ] Write tests: clip detection produces valid boundaries, text outputs match expected formats

### Week 4: API Endpoints + Integration
- [ ] REST API: POST /api/v1/jobs (create job from URL or file reference)
- [ ] REST API: GET /api/v1/jobs/:id (status + metadata)
- [ ] REST API: GET /api/v1/jobs/:id/clips (list clip candidates)
- [ ] REST API: GET /api/v1/jobs/:id/texts (list text outputs)
- [ ] REST API: PATCH /api/v1/clips/:id (approve/reject)
- [ ] REST API: PATCH /api/v1/texts/:id (update content/status)
- [ ] Webhook: job.completed notification
- [ ] End-to-end test: POST YouTube URL → poll status → receive clips + texts
- [ ] CLI script for manual testing: `node scripts/process.js <youtube-url>`

### Phase 1 Milestone
`curl -X POST /api/v1/jobs -d '{"url":"https://youtube.com/watch?v=xxx"}' ` returns a job ID. Polling returns clips and text outputs within 5 minutes. **Core pipeline works headlessly.**

---

## Phase 2: Video Processing (Weeks 5-7)

### Objective
Clips render with correct aspect ratios, face tracking, and captioning.

### Week 5: Reframe + Face Detection
- [ ] Render worker: FFmpeg clip extraction (trim source to clip boundaries)
- [ ] Face detection module: MediaPipe or YOLO-face on keyframes (every 0.5s)
- [ ] Reframe logic: compute crop rectangle centered on primary face
- [ ] Reframe logic: smooth crop motion (avoid jittery panning)
- [ ] Render 9:16 vertical clips
- [ ] Render 1:1 square clips
- [ ] Render 16:9 passthrough (no reframe needed)
- [ ] Store rendered files in object storage
- [ ] Write tests: reframe with 1 face, 2 faces, no face detected, face moving

### Week 6: Captioning
- [ ] Caption renderer: word-level timing from transcript segments
- [ ] Caption style 1: centered bold with highlight word (karaoke style)
- [ ] Caption style 2: bottom-aligned with background box
- [ ] Caption style 3: top-aligned minimal
- [ ] Speaker color coding in captions (host = indigo, guest = cyan)
- [ ] FFmpeg drawtext/ass subtitle overlay pipeline
- [ ] Write tests: caption timing sync, long words, speaker changes, special characters

### Week 7: Render Pipeline Polish
- [ ] Batch rendering: render all approved clips for a job in parallel
- [ ] Render progress reporting (per-clip status updates)
- [ ] Output validation: verify aspect ratio, resolution (1080p), duration
- [ ] Error handling: retry failed renders, report permanent failures
- [ ] Download endpoint: GET /api/v1/clips/:id/download
- [ ] SRT/VTT generation per clip

### Phase 2 Milestone
Approved clips download as properly reframed, captioned 1080p MP4 files. All three aspect ratios render correctly. **Video processing pipeline complete.**

---

## Phase 3: Dashboard & Review UI (Weeks 8-10)

### Objective
Full web dashboard with ingest, processing status, review queue, and basic settings.

### Week 8: Layout + Ingest + Processing UI
- [ ] App shell: sidebar navigation (pipeline steps), top bar (branding, settings, usage meter)
- [ ] Ingest page: URL input field + source type cards + file upload dropzone
- [ ] Input validation: YouTube URL detection, file type validation, size limit check
- [ ] Processing page: SSE-powered progress checklist (transcript → speakers → clips → texts → captions)
- [ ] Auto-advance from processing to review on completion
- [ ] Error state handling: failed jobs show error message with retry option
- [ ] Auth: sign up / sign in pages (email + Google OAuth via Supabase Auth)
- [ ] Protected routes: redirect unauthenticated users to sign-in

### Week 9: Review Queue
- [ ] Review layout: left panel (output list) + right panel (detail/preview)
- [ ] Clips tab: list all clip candidates with thumbnails, scores, speaker badges, status dots
- [ ] Clip detail: 9:16 video preview (rendered clip playback), metadata, action buttons
- [ ] Clip actions: Approve (→ approved status), Edit (opens trim UI), Skip (→ rejected status)
- [ ] Text tab: list all text outputs with type icons, previews, word counts
- [ ] Text detail: full content in editable textarea, word count, action buttons
- [ ] Text actions: Refine with AI (sends refinement prompt), Copy to clipboard, Schedule
- [ ] Regenerate button: re-run analysis for a single clip or text output
- [ ] Keyboard shortcuts: A (approve), S (skip), → (next), ← (previous)

### Week 10: Settings + Jobs List
- [ ] Dashboard home: list of all user jobs with status, date, source title
- [ ] Job detail page: summary stats (N clips, N texts, N approved, N scheduled)
- [ ] Settings page: connected social accounts (OAuth status per platform)
- [ ] Settings page: default caption style preference
- [ ] Settings page: API key management (Pro+ plans)
- [ ] Usage display: minutes used / minutes available this month
- [ ] Responsive: ensure ingest + processing work on mobile (review is desktop-only v1)

### Phase 3 Milestone
Creator can sign up, paste a YouTube URL, watch processing progress, review clips and text outputs, approve/skip, and see their job history. **Dashboard fully functional.**

---

## Phase 4: Scheduling + Extended Inputs (Weeks 11-13)

### Objective
Social scheduling works for 4 platforms. Article and PDF inputs functional.

### Week 11: Social Scheduling
- [ ] OAuth connection flow: YouTube, TikTok (if approved), LinkedIn, X
- [ ] Connected accounts management UI
- [ ] Schedule UI: card grid of approved outputs with platform badges + time picker
- [ ] Schedule worker: dequeue posts at scheduled time
- [ ] YouTube adapter: Shorts upload via Data API v3
- [ ] TikTok adapter: video upload via Content Posting API
- [ ] LinkedIn adapter: text post via Marketing API
- [ ] X adapter: text post (and thread) via API v2
- [ ] Post status tracking: queued → posting → posted / failed
- [ ] Failed post retry with exponential backoff (max 3 attempts)
- [ ] Write tests: mock API calls for each platform, test retry logic

### Week 12: Article + PDF + Audio Inputs
- [ ] Article ingest: Puppeteer headless scrape → extract body text + title + metadata
- [ ] Article ingest: handle common paywall patterns (warn user, don't proceed)
- [ ] PDF ingest: pdf-parse text extraction → store extracted text
- [ ] Audio ingest: accept MP3/WAV/M4A upload → transcribe pipeline (skip video steps)
- [ ] Text-only analysis pipeline: article/PDF text → LLM → text outputs only (no clips)
- [ ] Audio-only pipeline: transcribe → analyze (clips + text) → render audio clips as video with waveform or static image background
- [ ] Update ingest UI: source type cards functional with proper routing

### Week 13: Custom Prompts + Export Packages
- [ ] Custom prompt template UI: user defines output format with variables
- [ ] Prompt template storage in DB (per-user)
- [ ] Custom prompts used in analyze worker when available
- [ ] Export: individual clip MP4 download
- [ ] Export: batch ZIP download (all approved clips)
- [ ] Export: text outputs as Markdown file
- [ ] Export: full package ZIP (clips + captions + texts + transcript)
- [ ] Export: SRT/VTT files per clip

### Phase 4 Milestone
Full v1 feature set functional. All input types work. Scheduling posts to YouTube, TikTok (pending approval), LinkedIn, and X. Export packages downloadable. **Feature-complete.**

---

## Phase 5: API, Billing & Launch (Weeks 14-16)

### Objective
API documentation, billing enforcement, onboarding flow, landing page. Ready for public beta.

### Week 14: API & Webhooks
- [ ] API key generation + management (Pro+ plans)
- [ ] API rate limiting (per-key, tiered by plan)
- [ ] API documentation page (interactive, based on OpenAPI spec)
- [ ] Webhook configuration UI: add webhook URL, select events
- [ ] Webhook delivery: job.completed, clip.rendered, post.published, post.failed
- [ ] Webhook retry logic (3 attempts with exponential backoff)
- [ ] Zapier integration: trigger on job.completed

### Week 15: Billing + Free Tier Enforcement
- [ ] Stripe integration: subscription creation, plan changes, cancellation
- [ ] Usage tracking: count processing minutes per billing cycle
- [ ] Free tier enforcement: watermark on clips, 720p cap, 30 min limit
- [ ] Paid tier enforcement: minute limits, feature gates (API on Pro+)
- [ ] Upgrade prompts: shown when free tier limits approached
- [ ] Billing settings page: current plan, usage, invoices, cancel
- [ ] Cancellation flow: simple, no dark patterns (competitive differentiator)

### Week 16: Onboarding + Landing Page + Launch
- [ ] Onboarding flow: welcome → paste first URL → processing → review → connect platform
- [ ] Contextual tooltips for first-time review experience
- [ ] Landing page: hero (value prop), how it works (4 steps), pricing, FAQ
- [ ] Landing page: SEO-optimized (see SEO_CONTENT_PLAN.md)
- [ ] Open Graph / social sharing metadata
- [ ] Error monitoring: Sentry or similar
- [ ] Analytics: PostHog or Mixpanel for product analytics
- [ ] Health check endpoint for uptime monitoring
- [ ] Final QA pass: test all input types, all output types, all platforms
- [ ] **Public beta launch**

### Phase 5 Milestone
Product is live. Users can sign up, process content, review outputs, schedule posts, and pay. API is documented and functional. **Public beta launched.**

---

## Post-Launch Priority Queue (v1.1 and v2)

### v1.1 (Weeks 17-20)
- Instagram Reels scheduling
- Facebook scheduling
- 4:5 aspect ratio
- Dark theme toggle
- Emoji in captions
- Mobile review UI
- Calendar view for schedule

### v2 (Weeks 21+)
- Brand voice training
- AI B-Roll generation
- Multi-seat / team collaboration
- Brand kits
- RSS feed monitoring
- 4K export
- Content analytics dashboard
- XML export (Premiere/DaVinci)
- Multimodal clip analysis (visual)
