# skills/backend-architecture.md

> Backend architecture rules for OriginClipAI. Read before writing any server-side code.

---

## Core Principle

The backend is a **job pipeline with API endpoints on top**. There is no monolithic server process. The Next.js app handles HTTP requests and enqueues jobs. Workers consume jobs from queues and write results to the database. The dashboard reads from the database.

```
HTTP Request → API Route → Validate → Enqueue → Return job ID
                                         ↓
                                    Queue (Redis)
                                         ↓
                                    Worker Process
                                         ↓
                                    Database Write
                                         ↓
                                    Dashboard Reads (Realtime)
```

---

## Layer Separation

### API Layer (Next.js API Routes)

Lives in `src/app/api/`. Responsibilities:

- Authenticate request (Supabase JWT or API key)
- Validate input (Zod schema)
- Check billing limits (minutes remaining)
- Read from database (GET endpoints)
- Enqueue jobs (POST endpoints that trigger processing)
- Return JSON responses

API routes do NOT:
- Call external services directly (no LLM calls, no FFmpeg, no yt-dlp)
- Process anything that takes more than 2 seconds
- Hold long-running connections (except SSE streams for progress)
- Import worker code

```typescript
// ✅ Correct API route
export async function POST(req: Request) {
  const user = await authenticate(req);
  const body = await req.json();
  const input = createJobSchema.parse(body);
  
  await checkBillingLimits(user.id);
  
  const job = await db.job.create({ data: { userId: user.id, ...input } });
  await ingestQueue.add('ingest', { jobId: job.id, ...input });
  
  return Response.json({ jobId: job.id });
}

// ❌ Wrong — processing inside API route
export async function POST(req: Request) {
  const transcript = await whisper.transcribe(audioFile); // NEVER DO THIS
}
```

### Worker Layer (Separate Processes)

Lives in `src/workers/`. Responsibilities:

- Consume jobs from BullMQ queues
- Call external services through provider abstractions
- Write results to database
- Report progress to `jobs.progress` column
- Enqueue the next pipeline step on success
- Handle errors and update job status on failure

Workers do NOT:
- Serve HTTP requests
- Import Next.js code or App Router modules
- Call other workers directly
- Access `req` or `res` objects
- Read from or write to browser state

### Provider Layer (Abstractions)

Lives in `src/lib/providers/`. Every external service has an interface:

```typescript
// src/lib/providers/transcription.ts
export interface TranscriptionProvider {
  transcribe(audioPath: string, options: TranscribeOptions): Promise<TranscriptionResult>;
  getSupportedLanguages(): string[];
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
  wordTimestamps: WordTimestamp[];
  speakers: Speaker[];
  language: string;
  confidence: number;
}
```

Then implementations:
```
src/lib/providers/transcription/
├── interface.ts        ← TranscriptionProvider interface
├── whisper.ts          ← WhisperProvider implements TranscriptionProvider
├── assemblyai.ts       ← AssemblyAIProvider implements TranscriptionProvider
└── index.ts            ← Factory: getTranscriptionProvider(engine)
```

Workers import the interface, not the implementation:
```typescript
// ✅ Correct
import { getTranscriptionProvider } from '@/lib/providers/transcription';
const provider = getTranscriptionProvider(job.data.engine);
const result = await provider.transcribe(audioPath, options);

// ❌ Wrong — importing implementation directly in worker logic
import { WhisperAPI } from '@/lib/providers/transcription/whisper';
```

---

## File Organization Rules

### One file, one responsibility
- `youtube.ts` handles YouTube downloads. It does not handle Vimeo.
- `clip-analyzer.ts` handles clip detection. It does not generate text outputs.
- `worker.ts` defines the BullMQ worker. It does not contain business logic — it calls handler functions.

### Worker file pattern
Every worker follows this structure:

```typescript
// src/workers/ingest/worker.ts
import { Worker } from 'bullmq';
import { connection } from '@/lib/queue/connection';
import { handleIngestJob } from './handler';

export const ingestWorker = new Worker(
  'ingest',
  async (job) => {
    await handleIngestJob(job);
  },
  {
    connection,
    concurrency: 5,
  }
);

// src/workers/ingest/handler.ts — actual business logic
export async function handleIngestJob(job: Job<IngestJobData>) {
  await job.updateProgress({ step: 'downloading' });
  // ... actual logic here
}
```

The worker.ts file is thin. The handler.ts file has the logic. This makes handlers testable without BullMQ infrastructure.

---

## Error Handling Pattern

```typescript
export async function handleTranscribeJob(job: Job<TranscribeJobData>) {
  try {
    await updateJobStatus(job.data.jobId, 'transcribing');
    
    // ... do work ...
    
    await updateJobStatus(job.data.jobId, 'analyzing');
    await analyzeQueue.add('analyze', { jobId: job.data.jobId });
    
  } catch (error) {
    await updateJobStatus(job.data.jobId, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      failedStep: 'transcribe',
    });
    throw error; // Re-throw so BullMQ handles retry
  }
}
```

Rules:
- Always update job status to `failed` with error message before re-throwing
- Always re-throw so BullMQ retry logic kicks in
- Never swallow errors silently
- Log the full error (including stack trace) but store only the message in the DB

---

## Database Access Pattern

Workers use the Prisma client directly — NOT Supabase client. The Supabase client is for the frontend (with RLS). Workers use the service role connection.

```typescript
// src/lib/db/client.ts
import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient();

// Workers import this
import { db } from '@/lib/db/client';
const job = await db.job.update({ where: { id: jobId }, data: { status: 'transcribing' } });
```

---

## Environment-Based Configuration

No hardcoded values. All configuration comes from environment variables or the queue config file.

```typescript
// src/lib/queue/config.ts
export const QUEUE_CONFIG = {
  ingest: {
    concurrency: parseInt(process.env.INGEST_CONCURRENCY ?? '5'),
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 5000 },
  },
  // ...
};
```

---

## What NOT to Do

- Do not put business logic in API routes
- Do not import Next.js modules in workers
- Do not call external services without a provider abstraction
- Do not create God objects or service classes that do everything
- Do not use `any` types at layer boundaries — define interfaces
- Do not write raw SQL — use Prisma
- Do not store secrets in code — use environment variables
- Do not create circular dependencies between workers
