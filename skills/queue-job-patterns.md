# skills/queue-job-patterns.md

> BullMQ queue and job patterns for OriginClipAI. Read before creating or modifying any queue, worker, or job.

---

## Queue Setup Pattern

All queues are defined in one file. Workers import queue instances from here to enqueue the next step.

```typescript
// src/lib/queue/connection.ts
import { Redis } from 'ioredis';

export const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

// src/lib/queue/queues.ts
import { Queue } from 'bullmq';
import { connection } from './connection';
import { QUEUE_CONFIG } from './config';

export const ingestQueue = new Queue('ingest', { connection });
export const transcribeQueue = new Queue('transcribe', { connection });
export const analyzeQueue = new Queue('analyze', { connection });
export const renderQueue = new Queue('render', { connection });
export const scheduleQueue = new Queue('schedule', { connection });
export const exportQueue = new Queue('export', { connection });
```

---

## Job Data Typing

Every queue has a typed payload. No `any`. No untyped job data.

```typescript
// src/types/queue.ts
export interface IngestJobData {
  jobId: string;
  sourceType: SourceType;
  sourceUrl?: string;
  sourceFileKey?: string;
}

export interface TranscribeJobData {
  jobId: string;
  sourceFileKey: string;
  engine: 'whisper' | 'assemblyai';
  language?: string;
}

export interface AnalyzeJobData {
  jobId: string;
  transcriptId?: string;
  sourceType: SourceType;
  sourceText?: string;
  customPromptIds?: string[];
}

export interface RenderJobData {
  jobId: string;
  clipId: string;
  sourceFileKey: string;
  startTime: number;
  endTime: number;
  aspectRatios: AspectRatio[];
  captionStyle: string;
  wordTimestamps: WordTimestamp[];
  speakerColors: Record<string, string>;
}

export interface ScheduleJobData {
  scheduledPostId: string;
  platform: Platform;
  socialConnectionId: string;
  clipId?: string;
  textOutputId?: string;
}

export interface ExportJobData {
  jobId: string;
  userId: string;
  exportType: 'single_clip' | 'all_clips' | 'all_texts' | 'full_package';
  clipId?: string;
}
```

---

## Enqueueing Pattern

When one worker finishes, it enqueues the next step. Never chain workers directly.

```typescript
// ✅ Correct — enqueue via queue instance
import { transcribeQueue } from '@/lib/queue/queues';

// Inside ingest handler, after successful download:
await db.job.update({ where: { id: jobId }, data: { status: 'TRANSCRIBING' } });
await transcribeQueue.add('transcribe', {
  jobId,
  sourceFileKey: uploadedKey,
  engine: 'whisper',
});

// ❌ Wrong — calling worker function directly
import { handleTranscribeJob } from '../transcribe/handler';
await handleTranscribeJob(transcribeData); // NEVER DO THIS
```

---

## Progress Reporting Pattern

Workers report progress to the database, not to BullMQ's built-in progress (which is ephemeral).

```typescript
// src/lib/db/job-progress.ts
import { db } from './client';
import type { JobProgress, StepStatus } from '@/types/job';

export async function updateJobProgress(
  jobId: string,
  step: keyof JobProgress,
  status: StepStatus,
  details?: Record<string, unknown>
) {
  const job = await db.job.findUniqueOrThrow({ where: { id: jobId } });
  const progress = job.progress as JobProgress;
  
  progress[step] = status;
  if (details) {
    progress.details = { ...progress.details, ...details };
  }

  await db.job.update({
    where: { id: jobId },
    data: { 
      progress,
      currentStep: `${step}:${status}`,
      ...(status === 'error' ? { status: 'FAILED' } : {}),
    },
  });
}

// Usage in worker:
await updateJobProgress(jobId, 'transcribe', 'running');
// ... do transcription ...
await updateJobProgress(jobId, 'transcribe', 'complete', { speakersFound: 2 });
```

---

## Retry and Error Handling

### Retryable vs. Permanent Failures

```typescript
export async function handleIngestJob(job: Job<IngestJobData>) {
  try {
    const result = await downloadVideo(job.data.sourceUrl);
    // ... success path
  } catch (error) {
    if (error instanceof InvalidUrlError) {
      // Permanent failure — do not retry
      await updateJobStatus(job.data.jobId, 'FAILED', 'Invalid URL provided');
      return; // Return without throwing — BullMQ won't retry
    }
    
    if (error instanceof NetworkError) {
      // Transient failure — let BullMQ retry
      await updateJobProgress(job.data.jobId, 'ingest', 'error');
      throw error; // Throw — BullMQ retries per config
    }
    
    // Unknown error — let BullMQ retry
    await updateJobProgress(job.data.jobId, 'ingest', 'error');
    throw error;
  }
}
```

Rules:
- **Permanent failures** (bad input, invalid content, unsupported format): update job to FAILED, return without throwing.
- **Transient failures** (network timeout, rate limit, service unavailable): throw so BullMQ retries.
- **Unknown failures**: throw so BullMQ retries. If max retries exhausted, BullMQ moves to failed state.

### Max Retry Exhaustion

Handle the case where all retries are exhausted:

```typescript
// In worker setup
worker.on('failed', async (job, error) => {
  if (job && job.attemptsMade >= job.opts.attempts!) {
    // All retries exhausted — mark job as permanently failed
    await db.job.update({
      where: { id: job.data.jobId },
      data: { 
        status: 'FAILED', 
        error: `Failed after ${job.attemptsMade} attempts: ${error.message}` 
      },
    });
  }
});
```

---

## Delayed Jobs (Scheduling)

Social scheduling uses BullMQ's delayed job feature:

```typescript
// When user schedules a post for a future time
const delayMs = scheduledAt.getTime() - Date.now();

await scheduleQueue.add('post', 
  { scheduledPostId, platform, socialConnectionId, clipId },
  { 
    delay: Math.max(0, delayMs), // Don't allow negative delay
    jobId: `schedule-${scheduledPostId}`, // Deterministic ID for cancellation
  }
);

// To cancel a scheduled post
await scheduleQueue.remove(`schedule-${scheduledPostId}`);
```

---

## Job Deduplication

Prevent duplicate jobs for the same source:

```typescript
// Use deterministic job IDs based on content
const jobId = `ingest-${userId}-${hashUrl(sourceUrl)}`;

await ingestQueue.add('ingest', data, {
  jobId, // BullMQ deduplicates by jobId
});
```

---

## Queue Priority

Paid users get priority processing:

```typescript
// When enqueueing from API
const priority = user.plan === 'FREE' ? 10 : user.plan === 'CREATOR' ? 5 : 1;

await ingestQueue.add('ingest', data, { priority });
```

Lower number = higher priority in BullMQ.

---

## Render Queue — Fan-Out Pattern

The render queue is unique: one job produces many render tasks (one per clip).

```typescript
// In analyze handler, after creating clip records:
const clips = await db.clip.findMany({ where: { jobId } });

for (const clip of clips) {
  await renderQueue.add('render', {
    jobId,
    clipId: clip.id,
    sourceFileKey,
    startTime: clip.startTime,
    endTime: clip.endTime,
    aspectRatios: ['9x16', '1x1', '16x9'],
    captionStyle: clip.captionStyle,
    wordTimestamps,
    speakerColors,
  });
}

// Track completion: when all clips for a job are rendered, mark job complete
// In render handler, after successful render:
const pendingClips = await db.clip.count({
  where: { jobId, renderStatus: { not: 'complete' } },
});

if (pendingClips === 0) {
  await db.job.update({ 
    where: { id: jobId }, 
    data: { status: 'COMPLETE', processingCompletedAt: new Date() } 
  });
}
```

---

## Graceful Shutdown

The worker entry point must handle shutdown signals:

```typescript
// src/workers/index.ts
import { ingestWorker } from './ingest/worker';
import { transcribeWorker } from './transcribe/worker';
// ... other workers

const workers = [ingestWorker, transcribeWorker, analyzeWorker, renderWorker, scheduleWorker, exportWorker];

async function shutdown() {
  console.log('Shutting down workers...');
  await Promise.all(workers.map(w => w.close()));
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('All workers started');
```

---

## What NOT to Do

- Do not process jobs inside API routes — always enqueue
- Do not call workers from other workers — always enqueue
- Do not use BullMQ's built-in progress for anything the dashboard needs — use the database
- Do not create queues dynamically — all queues are defined statically
- Do not use `removeOnComplete: true` for jobs that might need debugging — keep completed jobs for 24h
- Do not put large payloads in job data — store files in object storage, pass keys
