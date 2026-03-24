# Development Mock Mode

Stop burning paid API costs during debugging. Mock mode replaces all external API calls with local fixture data.

## Quick Start

```bash
# 1. Set env flags in .env.local
MOCK_AI=true
DEV_NO_EXTERNAL_APIS=true
DEV_AUTH_BYPASS=true

# 2. Seed a completed demo job
npx tsx scripts/seed-demo.ts

# 3. Start the app
npm run dev

# 4. Open the review UI
# http://localhost:3000/jobs  (job list)
# http://localhost:3000/jobs/<id>/review  (review queue — ID printed by seed script)
```

## Environment Flags

| Flag | What it does |
|------|-------------|
| `MOCK_AI=true` | LLM calls (Anthropic Claude) return fixture data. Zero API cost. |
| `DEV_NO_EXTERNAL_APIS=true` | Blocks ALL paid APIs: Anthropic, AssemblyAI, Replicate. Also activates mock transcription. |
| `FORCE_REANALYZE=true` | Override the dedupe guard. Forces re-analysis even if outputs already exist for a job. |

Use both `MOCK_AI` and `DEV_NO_EXTERNAL_APIS` for fully offline local development.

## What Gets Mocked

| Service | Flag Required | Mock Behavior |
|---------|--------------|---------------|
| Anthropic Claude (LLM) | `MOCK_AI=true` | Returns fixture clips, insights, quotes, LinkedIn posts, X threads, newsletter sections, chapter markers, summaries |
| AssemblyAI (transcription) | `DEV_NO_EXTERNAL_APIS=true` | Returns fixture transcript with 2 speakers, 23 segments, word timestamps |
| Replicate/Whisper (transcription) | `DEV_NO_EXTERNAL_APIS=true` | Same as above — mock provider handles both engines |
| Text refinement (`/api/v1/texts/:id/refine`) | `MOCK_AI=true` | Returns mock refined text without calling Claude |

## Seed Demo Data

The seed script creates a fully completed job with realistic data:

```bash
npx tsx scripts/seed-demo.ts
```

This creates:
- 1 dev profile (uses `DEV_USER_ID` from env)
- 1 completed job (YouTube interview, 12 min)
- 1 transcript (23 segments, 2 speakers with roles)
- 7 clip candidates (scored 82-94, with hooks and social captions)
- 20+ text outputs: summary, 6 key insights, 5 notable quotes, 3 LinkedIn posts, 1 X thread, 2 newsletter sections, chapter markers

The review UI is fully functional with this seeded data.

## Caching / Dedupe Guards

To prevent re-running expensive operations on the same content:

- **Transcribe handler:** Checks if transcript already exists for a job before calling the transcription API. Skips if found.
- **Analyze handler:** Checks if clips or text outputs already exist for a job. Skips re-analysis unless `FORCE_REANALYZE=true` is set.
- **Queue retries:** In mock mode, paid queues (`transcribe`, `analyze`) have retries disabled (attempts=1). Failures surface immediately.

## Switching to Real API Mode

For final verification with real APIs:

```bash
# 1. Disable mock mode
MOCK_AI=false
DEV_NO_EXTERNAL_APIS=false

# 2. Set real API keys
ANTHROPIC_API_KEY=sk-ant-...
ASSEMBLYAI_API_KEY=...
REPLICATE_API_TOKEN=...

# 3. Force re-analysis if needed (to regenerate outputs with real AI)
FORCE_REANALYZE=true

# 4. Restart workers
npm run workers:dev
```

## How to Tell You're in Mock Mode

All mock operations log with the `[MOCK]` prefix:

```
[MOCK] [llm] Using MockLLMProvider — no Anthropic API calls will be made
[MOCK] [llm] chat() called — detecting prompt type from 2 messages
[MOCK] [llm] → returning clip candidates fixture
[MOCK] [transcription] Using MockTranscriptionProvider — no assemblyai API calls will be made
[queue] Dev mock mode: retries disabled for paid queues (transcribe, analyze)
```

Grep for `[MOCK]` in your logs to verify no paid APIs are being called.

## File Map

| File | Purpose |
|------|---------|
| `src/lib/dev-mode.ts` | Central mock mode flag checks (`isMockAI()`, `isNoExternalAPIs()`, `logMock()`) |
| `src/lib/fixtures/demo-job.ts` | All fixture data (transcript, clips, texts, insights, quotes) |
| `src/lib/providers/llm-mock.ts` | Mock LLM provider — routes by prompt content to return correct fixture shape |
| `src/lib/providers/transcription-mock.ts` | Mock transcription provider — returns fixture transcript |
| `scripts/seed-demo.ts` | Seeds one completed demo job into the database |
