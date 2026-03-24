# skills/worker-design-rules.md

> Rules for designing and implementing BullMQ workers in OriginClipAI. Every worker must follow these patterns.

---

## The Five Worker Laws

### 1. Workers Are Stateless

A worker holds no state between jobs. No module-level variables that accumulate data. No caches that persist across job executions. Every job starts with a clean slate and reads everything it needs from the database or job payload.

```typescript
// ❌ Wrong — module-level state
let processedCount = 0;
const cache = new Map();

export async function handleJob(job: Job) {
  processedCount++;
  if (cache.has(job.data.url)) return cache.get(job.data.url);
  // ...
}

// ✅ Correct — no state, read everything from DB/payload
export async function handleJob(job: Job<IngestJobData>) {
  const jobRecord = await db.job.findUniqueOrThrow({ where: { id: job.data.jobId } });
  // Work with jobRecord, not cached state
}
```

**Why:** Workers can crash and restart. Multiple worker instances can run in parallel. Shared state between jobs creates race conditions and data loss.

### 2. Workers Are Idempotent

Running the same job twice produces the same result without duplicating data. Workers must check what's already been done before doing it again.

```typescript
export async function handleTranscribeJob(job: Job<TranscribeJobData>) {
  // Check if transcript already exists (job was retried after partial completion)
  const existing = await db.transcript.findUnique({ where: { jobId: job.data.jobId } });
  if (existing) {
    // Already transcribed — skip to next step
    await analyzeQueue.add('analyze', { jobId: job.data.jobId, transcriptId: existing.id });
    return;
  }

  // Not yet transcribed — do the work
  const result = await transcriptionProvider.transcribe(audioPath, options);
  
  // Use upsert, not create, for safety
  const transcript = await db.transcript.upsert({
    where: { jobId: job.data.jobId },
    create: { jobId: job.data.jobId, ...result },
    update: { ...result },
  });
}
```

**Why:** BullMQ retries failed jobs. Network issues can cause a job to fail after partial completion. The worker must handle being called again gracefully.

### 3. Workers Report Progress

Every meaningful step inside a worker updates the `jobs.progress` JSONB column. The dashboard reads this column for real-time status display.

```typescript
export async function handleAnalyzeJob(job: Job<AnalyzeJobData>) {
  await updateJobProgress(job.data.jobId, 'analyze', 'running');
  
  // Step 1: Speaker role detection
  await updateJobProgress(job.data.jobId, 'analyze', 'running', { substep: 'speaker_roles' });
  const roles = await detectSpeakerRoles(transcript);
  
  // Step 2: Clip analysis
  await updateJobProgress(job.data.jobId, 'analyze', 'running', { substep: 'clip_scoring' });
  const clips = await analyzeClips(transcript, roles);
  await updateJobProgress(job.data.jobId, 'analyze', 'running', { clipsFound: clips.length });
  
  // Step 3: Text generation
  await updateJobProgress(job.data.jobId, 'analyze', 'running', { substep: 'text_generation' });
  const texts = await generateTextOutputs(transcript, roles);
  
  // Done
  await updateJobProgress(job.data.jobId, 'analyze', 'complete', {
    clipsFound: clips.length,
    textsGenerated: texts.length,
  });
}
```

**Minimum progress updates per worker:**
- Start: `'running'`
- Each major substep: update with substep name
- Success: `'complete'` with counts
- Failure: `'error'` (handled by catch block)

### 4. Workers Handle Their Own Errors

Workers catch errors, update the job status, and then re-throw for BullMQ retry. They never swallow errors silently and never leave a job in limbo.

```typescript
export async function handleRenderJob(job: Job<RenderJobData>) {
  try {
    await updateJobProgress(job.data.jobId, 'render', 'running');
    
    // ... rendering work ...
    
    await db.clip.update({
      where: { id: job.data.clipId },
      data: { renderStatus: 'complete', renderedFiles: files },
    });
    
  } catch (error) {
    // Update clip status
    await db.clip.update({
      where: { id: job.data.clipId },
      data: { renderStatus: 'failed' },
    }).catch(() => {}); // Don't let status update failure mask the original error
    
    // Update job progress
    await updateJobProgress(job.data.jobId, 'render', 'error').catch(() => {});
    
    // Log full error for debugging
    console.error(`Render failed for clip ${job.data.clipId}:`, error);
    
    // Re-throw for BullMQ retry
    throw error;
  }
}
```

**Error update pattern:** The `.catch(() => {})` on status updates prevents a secondary failure from masking the original error. The original error is always re-thrown.

### 5. Workers Never Call Other Workers

Workers communicate through queues. When worker A finishes, it enqueues a job for worker B. It never imports worker B's handler and calls it.

```typescript
// ✅ Correct — enqueue the next step
await transcribeQueue.add('transcribe', { jobId, sourceFileKey, engine: 'whisper' });

// ❌ Wrong — direct invocation
import { handleTranscribeJob } from '../transcribe/handler';
await handleTranscribeJob(fakeJob);

// ❌ Also wrong — event-based coupling
eventEmitter.emit('ingest:complete', { jobId });
```

**Why:** Direct invocation breaks process isolation. If the transcribe worker crashes, it shouldn't bring down the ingest worker. Queues provide the buffer.

---

## Worker File Structure

Every worker follows the same 3-file pattern:

```
src/workers/{name}/
├── worker.ts       ← BullMQ Worker definition (thin — delegates to handler)
├── handler.ts      ← Business logic (testable without BullMQ)
└── index.ts        ← Re-exports
```

### worker.ts — Thin Wrapper

```typescript
import { Worker, Job } from 'bullmq';
import { connection } from '@/lib/queue/connection';
import { QUEUE_CONFIG } from '@/lib/queue/config';
import { handleIngestJob } from './handler';
import type { IngestJobData } from '@/types/queue';

export const ingestWorker = new Worker<IngestJobData>(
  'ingest',
  async (job: Job<IngestJobData>) => {
    await handleIngestJob(job.data, job.id);
  },
  {
    connection,
    concurrency: QUEUE_CONFIG.ingest.concurrency,
  }
);

ingestWorker.on('completed', (job) => {
  console.log(`[ingest] Job ${job.id} completed`);
});

ingestWorker.on('failed', (job, error) => {
  console.error(`[ingest] Job ${job?.id} failed:`, error.message);
});
```

### handler.ts — Business Logic

```typescript
import type { IngestJobData } from '@/types/queue';
import { db } from '@/lib/db/client';
import { updateJobProgress } from '@/lib/db/job-progress';
import { transcribeQueue } from '@/lib/queue/queues';
import { downloadYouTubeVideo } from './youtube';
import { detectSourceType } from './validators';

export async function handleIngestJob(data: IngestJobData, jobRunId?: string) {
  const { jobId, sourceType, sourceUrl } = data;
  
  try {
    await db.job.update({ where: { id: jobId }, data: { status: 'INGESTING' } });
    await updateJobProgress(jobId, 'ingest', 'running');
    
    // ... business logic ...
    
    await updateJobProgress(jobId, 'ingest', 'complete');
    await db.job.update({ where: { id: jobId }, data: { status: 'TRANSCRIBING' } });
    await transcribeQueue.add('transcribe', { jobId, sourceFileKey, engine: 'whisper' });
    
  } catch (error) {
    await updateJobProgress(jobId, 'ingest', 'error').catch(() => {});
    await db.job.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: error instanceof Error ? error.message : 'Unknown error' },
    }).catch(() => {});
    throw error;
  }
}
```

**Why the separation:** `handler.ts` can be tested by calling `handleIngestJob()` directly with mock data. No need to instantiate BullMQ workers in tests.

---

## Testing Workers

Test the handler, not the worker:

```typescript
// tests/workers/ingest/handler.test.ts
import { handleIngestJob } from '@/workers/ingest/handler';
import { db } from '@/lib/db/client';

describe('handleIngestJob', () => {
  it('downloads YouTube video and enqueues transcription', async () => {
    const job = await db.job.create({
      data: { userId: testUser.id, sourceType: 'YOUTUBE_URL', sourceUrl: 'https://youtube.com/watch?v=test' },
    });
    
    await handleIngestJob({
      jobId: job.id,
      sourceType: 'YOUTUBE_URL',
      sourceUrl: 'https://youtube.com/watch?v=test',
    });
    
    const updated = await db.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(updated.status).toBe('TRANSCRIBING');
    expect(updated.sourceFileKey).toBeTruthy();
  });

  it('fails permanently on invalid URL', async () => {
    // ...
    const updated = await db.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(updated.status).toBe('FAILED');
    expect(updated.error).toContain('Invalid URL');
  });
});
```

---

## Resource Cleanup

Workers must clean up temporary files:

```typescript
export async function handleRenderJob(data: RenderJobData) {
  const tempDir = path.join(os.tmpdir(), `render-${data.clipId}`);
  await fs.mkdir(tempDir, { recursive: true });
  
  try {
    // ... download source, process, render ...
    
    // Upload result to storage
    await storageProvider.upload(outputPath, destinationKey);
    
  } finally {
    // Always clean up temp files, even on error
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
```

---

## What NOT to Do

- Do not hold state between jobs
- Do not import Next.js or App Router code
- Do not call external APIs without using provider abstractions
- Do not call other worker handlers directly
- Do not swallow errors — always re-throw for retry
- Do not leave temp files on disk after job completion
- Do not log sensitive data (tokens, API keys, PII)
- Do not assume jobs run in order — they may run in parallel
- Do not put more than one queue consumer in a single worker file
