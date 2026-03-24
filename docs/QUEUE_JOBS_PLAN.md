# QUEUE_JOBS_PLAN.md

> BullMQ job queue architecture for OriginClipAI v1. Defines queues, workers, job payloads, state machines, retry logic, and concurrency.

---

## Queue Overview

Six queues, each with dedicated workers. Jobs flow through queues sequentially, orchestrated by the API layer.

```
ingest.queue → transcribe.queue → analyze.queue → render.queue
                                                        ↓
                                              schedule.queue (time-triggered)
                                              export.queue (on-demand)
```

---

## Queue Definitions

### ingest.queue

**Purpose:** Download source content and extract metadata.

**Payload:**
```typescript
interface IngestJobData {
  jobId: string;           // DB job ID
  sourceType: SourceType;  // 'youtube_url' | 'video_url' | 'video_upload' | 'audio_upload' | 'article_url' | 'pdf_upload'
  sourceUrl?: string;      // For URL-based inputs
  sourceFileKey?: string;  // For upload-based inputs
}
```

**Worker behavior by source type:**
- `youtube_url`: Run yt-dlp → download best quality ≤1080p → extract metadata (title, description, duration, thumbnail) → store video in object storage
- `video_url`: HTTP download → store in object storage → extract duration via FFprobe
- `video_upload`: Validate file → extract duration via FFprobe → already in storage
- `audio_upload`: Validate file → extract duration via FFprobe → already in storage
- `article_url`: Puppeteer headless → extract body text + title + author + date → store as JSON
- `pdf_upload`: pdf-parse → extract text → store as JSON

**On success:** Update job status to `transcribing` (video/audio) or `analyzing` (article/PDF). Enqueue next step.

**On failure:** Update job status to `failed` with error message. No retry for invalid URLs. Retry 2x for network errors.

**Concurrency:** 5 workers.
**Timeout:** 10 minutes (large video downloads).

---

### transcribe.queue

**Purpose:** Speech-to-text with speaker diarization.

**Payload:**
```typescript
interface TranscribeJobData {
  jobId: string;
  sourceFileKey: string;   // Storage key for video/audio file
  engine: 'whisper' | 'assemblyai';  // Primary or fallback
  language?: string;       // Force language (optional)
}
```

**Worker behavior:**
1. Extract audio from video (if video source): FFmpeg → WAV/MP3
2. Send to transcription engine:
   - **Whisper (default):** Call Modal.com/Replicate serverless endpoint. Model: whisper-large-v3.
   - **AssemblyAI (fallback):** Call AssemblyAI API with speaker_labels=true.
3. Parse response into structured format:
   - Full text
   - Segments with timestamps and speaker IDs
   - Word-level timestamps
4. Run speaker diarization (if not provided by engine):
   - AssemblyAI includes it natively
   - Whisper requires separate diarization pass (pyannote.audio or AssemblyAI diarization-only)
5. Run hallucination post-filter:
   - Remove segments matching known patterns: "Thank you for watching", "Please subscribe", "Like and share"
   - Remove repeated phrases in silent gaps
6. Store transcript in DB

**On success:** Update job status to `analyzing`. Enqueue analyze job.

**On failure:** If Whisper fails, retry with AssemblyAI fallback. If both fail, job fails.

**Concurrency:** 3 workers (GPU-bound).
**Timeout:** 30 minutes (large files on slow GPUs).

---

### analyze.queue

**Purpose:** LLM-powered clip detection and text generation.

**Payload:**
```typescript
interface AnalyzeJobData {
  jobId: string;
  transcriptId: string;
  sourceType: SourceType;
  sourceText?: string;     // For article/PDF (no transcript, direct text)
  customPromptIds?: string[];  // User's custom prompt template IDs
}
```

**Worker behavior:**

**For video/audio sources (has transcript):**
1. Load transcript from DB
2. **Clip analysis call:** Send full transcript + speaker data to Claude API
   - Prompt: identify standalone-coherent segments, score them, suggest titles
   - Response: structured JSON array of clip candidates
   - (See PROMPT_STRATEGY.md for full prompt)
3. **Speaker role detection:** Analyze speaker talk-time ratios and question patterns
   - Speaker with most questions + lowest talk-time % = likely host
   - Speaker with most declarative statements + highest insight density = likely guest
4. **Text generation calls (parallel):**
   - LinkedIn post generation (2-3 posts)
   - X thread generation (1-2 threads)
   - Newsletter section generation (1-2 sections)
   - Summary generation
   - Chapter markers generation
   - Custom prompt template execution (if any)
5. Store all clip candidates and text outputs in DB
6. Update job clip_count and text_output_count

**For article/PDF sources (text only):**
1. Load extracted text
2. **Text generation calls (parallel):**
   - LinkedIn post generation
   - X thread generation
   - Newsletter section generation
   - Summary generation
   - Custom prompt templates
3. Store text outputs in DB
4. No clip candidates (no video source)

**On success:** Update job status to `rendering` (video/audio) or `complete` (text-only).

**On failure:** Retry 2x with exponential backoff. If LLM returns unparseable response, retry with explicit format reinforcement in prompt.

**Concurrency:** 5 workers (API-bound, not compute-bound).
**Timeout:** 5 minutes.

---

### render.queue

**Purpose:** Video processing — reframe, caption, encode.

**Payload:**
```typescript
interface RenderJobData {
  jobId: string;
  clipId: string;
  sourceFileKey: string;
  startTime: number;
  endTime: number;
  aspectRatios: ('9x16' | '1x1' | '16x9')[];
  captionStyle: string;
  wordTimestamps: WordTimestamp[];  // For caption overlay
  speakerColors: Record<string, string>;  // speaker_id → hex color
}
```

**Worker behavior per clip:**
1. Extract clip segment from source: `ffmpeg -i source.mp4 -ss {start} -to {end} -c copy clip_raw.mp4`
2. Run face detection on keyframes (every 0.5s):
   - MediaPipe Face Detection or YOLO-face
   - Output: array of face bounding boxes per keyframe
3. For each aspect ratio:
   a. Compute crop rectangle: center on primary face, smooth motion between keyframes
   b. Handle edge cases: no face → center crop; multiple faces → largest face or center between
   c. Apply reframe: `ffmpeg -vf "crop=w:h:x:y"` with keyframe interpolation
   d. Overlay captions: generate ASS subtitle file from word timestamps + style
   e. Encode: `ffmpeg ... -c:v libx264 -preset medium -crf 23 -s 1080x1920 (9:16)` etc.
   f. Upload rendered file to storage
   g. Update clip.rendered_files with storage key

**On success:** Update clip.render_status to `complete`. When all clips for a job are rendered, update job status to `complete`.

**On failure:** Retry 2x. If FFmpeg errors, log full command + stderr for debugging.

**Concurrency:** 3 workers (CPU-intensive).
**Timeout:** 10 minutes per clip.

**Note:** Render jobs are enqueued per-clip, not per-job. A job with 10 clips produces 10 render queue entries that process in parallel.

---

### schedule.queue

**Purpose:** Post content to social platforms at scheduled times.

**Payload:**
```typescript
interface ScheduleJobData {
  scheduledPostId: string;
  platform: Platform;
  socialConnectionId: string;
  clipId?: string;         // For video posts
  textOutputId?: string;   // For text posts
}
```

**Worker behavior:**
1. Load scheduled post, connection tokens, and content from DB
2. Refresh OAuth token if expired
3. Call platform-specific adapter:
   - **YouTube:** Upload video via Data API v3, set as Short, add title/description
   - **TikTok:** Upload video via Content Posting API, add caption
   - **LinkedIn:** Create text post via Marketing API, attach image if available
   - **X:** Create tweet or thread via API v2
4. On success: update post status to `posted`, store platform_post_id and platform_post_url
5. On failure: increment retry_count, schedule retry with exponential backoff

**Retry logic:**
- Max 3 retries
- Backoff: 5 min → 15 min → 60 min
- Rate limit errors: respect Retry-After header
- Auth errors: mark connection as broken, notify user
- Content errors (size limit, format): fail permanently, notify user

**Concurrency:** 2 workers (rate-limit-sensitive).
**Timeout:** 5 minutes.

**Scheduling mechanism:** Use BullMQ delayed jobs. When user schedules a post for Tuesday 9am, enqueue with `delay: millisUntilTuesday9am`. BullMQ processes the job at the correct time.

---

### export.queue

**Purpose:** Package outputs into downloadable bundles.

**Payload:**
```typescript
interface ExportJobData {
  jobId: string;
  userId: string;
  exportType: 'single_clip' | 'all_clips' | 'all_texts' | 'full_package';
  clipId?: string;         // For single clip export
  format?: 'zip' | 'tar';
}
```

**Worker behavior:**
1. Gather requested files from storage
2. For full package: clips + SRT files + text outputs (MD) + transcript (TXT)
3. Create ZIP archive
4. Upload to storage with expiring URL (24h)
5. Return download URL

**Concurrency:** 3 workers.
**Timeout:** 5 minutes.

---

## Job State Machine

```
                    ┌──────────┐
                    │ created  │
                    └────┬─────┘
                         │ enqueue ingest
                         ▼
                    ┌──────────┐
              ┌─────│ ingesting│─────┐
              │     └────┬─────┘     │
              │          │           │ fail
              │          ▼           ▼
              │  ┌─────────────┐  ┌──────┐
              │  │transcribing │  │failed│
              │  └──────┬──────┘  └──────┘
              │         │              ▲
              │         ▼              │
              │  ┌──────────┐          │
              │  │ analyzing │──────────┘
              │  └────┬─────┘
              │       │
              │       ▼
              │  ┌──────────┐
              │  │ rendering │──────────┐
              │  └────┬─────┘          │ fail
              │       │                ▼
              │       ▼           ┌──────┐
              │  ┌──────────┐    │failed│
              └──│ complete │    └──────┘
                 └──────────┘
                      │
                      ▼
               (user reviews)
                      │
                      ▼
              ┌──────────────┐
              │  scheduling  │ (per post, independent)
              └──────┬───────┘
                     │
              ┌──────┴───────┐
              ▼              ▼
          ┌──────┐      ┌──────┐
          │posted│      │failed│
          └──────┘      └──────┘
```

**Text-only path (article/PDF):** created → ingesting → analyzing → complete (skips transcribing and rendering).

---

## Progress Reporting

Each queue worker reports progress via:
1. **DB update:** `jobs.progress` JSONB column updated per step
2. **Supabase Realtime:** Client subscribes to job row changes
3. **SSE endpoint (fallback):** `/api/v1/jobs/:id/stream` for API consumers

Progress payload structure:
```typescript
interface JobProgress {
  ingest: 'pending' | 'running' | 'complete' | 'error';
  transcribe: 'pending' | 'running' | 'complete' | 'error' | 'skipped';
  analyze: 'pending' | 'running' | 'complete' | 'error';
  render: 'pending' | 'running' | 'complete' | 'error' | 'skipped';
  details?: {
    transcribe_pct?: number;
    clips_rendered?: number;
    clips_total?: number;
    speakers_found?: number;
  };
}
```

---

## Queue Configuration

```typescript
// queue-config.ts
export const QUEUE_CONFIG = {
  ingest: {
    name: 'ingest',
    concurrency: 5,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    timeout: 600_000,  // 10 min
  },
  transcribe: {
    name: 'transcribe',
    concurrency: 3,
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    timeout: 1_800_000,  // 30 min
  },
  analyze: {
    name: 'analyze',
    concurrency: 5,
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    timeout: 300_000,  // 5 min
  },
  render: {
    name: 'render',
    concurrency: 3,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    timeout: 600_000,  // 10 min
  },
  schedule: {
    name: 'schedule',
    concurrency: 2,
    attempts: 4,
    backoff: { type: 'exponential', delay: 300_000 },  // 5 min base
    timeout: 300_000,
  },
  export: {
    name: 'export',
    concurrency: 3,
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    timeout: 300_000,
  },
};
```

---

## Monitoring

- **BullMQ Dashboard:** Bull Board UI at `/admin/queues` (protected, admin only)
- **Metrics to track:** queue depth, processing time per step, failure rate, retry rate
- **Alerts:** queue depth > 50 jobs, failure rate > 5%, worker process crash
