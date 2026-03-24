# PROJECT_SPEC.md

> Master product specification for OriginClipAI v1.

---

## Product Definition

**OriginClipAI** is a headless multi-platform content repurposing engine that turns long-form content into short-form video clips, LinkedIn posts, X threads, newsletter drafts, and other platform-specific outputs — with a structured review workflow and built-in social scheduling.

### Target User
Solo creators and YouTubers who produce weekly long-form content (podcasts, YouTube videos, blog posts) and need to repurpose it across multiple platforms efficiently.

### Business Model
PLG SaaS: Free tier (30 min/month, watermarked) → Creator ($19/mo) → Pro ($39/mo) → Business ($79/mo).

### Core Value Proposition
One upload → video clips + text outputs → review → schedule. Replaces a 3-tool stack (video clipper + text generator + scheduler) with one unified workflow.

---

## Supported Input Types

| Input | Format | Extraction Method |
|-------|--------|-------------------|
| YouTube URL | Any public YouTube video URL | yt-dlp download → extract video + metadata |
| Public video URL | Direct MP4/WebM links | HTTP download |
| Video upload | MP4, MOV, WebM (max 5GB) | Direct file upload to storage |
| Audio upload | MP3, WAV, M4A, OGG (max 1GB) | Direct file upload to storage |
| Article URL | Any public article/blog URL | Headless browser scrape → extract body text + metadata |
| PDF upload | Any PDF file (max 100MB) | Text extraction (pdf-parse or similar) |

### Input Detection Logic
The ingest system auto-detects input type from the provided URL or file:
- URL containing `youtube.com` or `youtu.be` → YouTube pipeline
- URL ending in `.mp4`, `.webm`, `.mov` → direct video download
- URL ending in `.pdf` → PDF download + text extraction
- Any other URL → article scraping pipeline
- File upload → detected by MIME type

---

## Output Types

### Video Outputs (from video/audio inputs)

| Output | Description |
|--------|-------------|
| Video clips (8-20 per job) | Short segments (30s-90s configurable) with auto-reframe and captions |
| Aspect ratios | 9:16 (primary), 1:1, 16:9 |
| Captions | 3-5 animated styles, word-level highlighting, speaker color coding |
| Transcript | Full transcript with speaker labels and timestamps |

### Text Outputs (from all input types)

| Output | Description |
|--------|-------------|
| LinkedIn posts (2-3) | Platform-formatted, hook-driven, 150-300 words |
| X threads (1-2) | 5-10 post threads with numbered structure |
| Newsletter sections (1-2) | 300-600 word sections ready for Substack/ConvertKit |
| Summary | 2-3 paragraph executive summary |
| Chapter markers | YouTube-formatted timestamp chapters |
| Social captions | Per-clip captions with hashtags |
| Blog draft (from video/audio) | 800-1500 word blog post derived from transcript |

### Export Outputs

| Output | Format |
|--------|--------|
| Individual clip download | MP4 (1080p) |
| Batch clip download | ZIP containing all approved clips |
| Caption export | SRT and VTT per clip |
| Text outputs export | Markdown file with all text outputs |
| Full export package | ZIP containing everything: clips + captions + text + transcript |

---

## Pipeline Specification

### Step 1: Ingest
- Accept input (URL or file)
- Validate and classify input type
- For YouTube: download video + extract metadata (title, description, duration, thumbnail)
- For article: scrape body text + extract metadata (title, author, date, images)
- For PDF: extract text + metadata
- For uploads: validate file, store in object storage
- Produce: source file (video/audio) or source text (article/PDF), plus metadata

### Step 2: Transcribe (video/audio inputs only)
- Run speech-to-text on source audio
- Primary engine: Whisper (self-hosted via serverless GPU)
- Fallback engine: AssemblyAI (when quality matters or Whisper fails)
- Produce: full transcript with word-level timestamps
- Run speaker diarization → label speakers
- Detect speaker roles (host vs. guest) via talk-time analysis and question detection
- Post-process: filter known Whisper hallucination patterns

### Step 3: Analyze
- **For video/audio:** Send transcript + speaker data to LLM
  - Identify clip candidates: segments that are standalone-coherent, have strong hooks, cover clear topics
  - Score each clip: engagement score (0-100) based on coherence, hook strength, topic clarity, emotional energy
  - Generate text outputs from full transcript
- **For articles/PDFs:** Send extracted text to LLM
  - Generate text outputs (LinkedIn posts, X threads, newsletter sections)
  - No clip detection (no video source)
- Produce: array of clip candidates (with boundaries, scores, titles) + array of text outputs

### Step 4: Render (video/audio inputs only)
- For each approved clip candidate:
  - Extract segment from source video (FFmpeg trim)
  - Run face detection for reframe crop (per-frame or keyframe sampling)
  - Render reframed versions (9:16, 1:1, 16:9)
  - Overlay captions (selected style, word-level timing, speaker colors)
  - Encode at 1080p MP4
- Produce: rendered video files stored in object storage

### Step 5: Review (user-driven)
- Present clips and text outputs in structured review queue
- User actions per clip: approve, edit (trim/caption adjust), skip
- User actions per text: approve, inline edit, refine with AI, schedule
- User selects target platforms per approved output

### Step 6: Schedule
- For each scheduled post:
  - Queue post at specified time
  - At trigger time: authenticate with platform API, upload content, confirm post
  - Track status: queued → posting → posted / failed
  - Retry failed posts with exponential backoff (max 3 retries)

---

## User Accounts and Billing

### Authentication
- Email + password signup
- Google OAuth
- Session-based auth via Supabase Auth

### Billing Tiers

| Tier | Price | Processing Minutes | Features |
|------|-------|-------------------|----------|
| Free | $0 | 30/month | Watermarked clips, 720p, basic text outputs |
| Creator | $19/mo | 300/month | No watermark, 1080p, all outputs, scheduling |
| Pro | $39/mo | 900/month | + API access, custom prompts, priority processing |
| Business | $79/mo | 2400/month | + future team seats, white-label export, SLA |

### Usage Tracking
- Processing minutes counted from source content duration
- 60-minute video = 60 minutes consumed regardless of output count
- Text-only jobs (article/PDF) = 1 minute per job (flat rate)
- Minutes reset monthly on billing cycle date

---

## API Specification (v1)

### Authentication
- API keys issued on Pro+ plans
- Bearer token authentication: `Authorization: Bearer sk_live_xxx`

### Endpoints

```
POST   /api/v1/jobs              — Create a new processing job
GET    /api/v1/jobs/:id          — Get job status and metadata
GET    /api/v1/jobs/:id/clips    — List clip candidates for a job
GET    /api/v1/jobs/:id/texts    — List text outputs for a job
PATCH  /api/v1/clips/:id         — Update clip status (approve/reject)
PATCH  /api/v1/texts/:id         — Update text output content/status
POST   /api/v1/clips/:id/render  — Trigger render for a specific clip
GET    /api/v1/clips/:id/download — Download rendered clip file
POST   /api/v1/schedule          — Schedule a post
GET    /api/v1/schedule           — List scheduled posts
DELETE /api/v1/schedule/:id       — Cancel a scheduled post
```

### Webhooks
- `job.completed` — fired when all pipeline steps complete
- `clip.rendered` — fired when a clip finishes rendering
- `post.published` — fired when a scheduled post goes live
- `post.failed` — fired when a scheduled post fails

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Time to first clip (60-min video) | < 5 minutes |
| Time to text outputs (article URL) | < 60 seconds |
| Uptime | 99.5% (excluding scheduled maintenance) |
| Concurrent jobs per user | 2 (free), 5 (paid) |
| Data retention (source files) | 24 hours post-processing |
| Data retention (outputs) | Until user deletes or account closes |
| Supported browsers | Chrome, Firefox, Safari, Edge (latest 2 versions) |
