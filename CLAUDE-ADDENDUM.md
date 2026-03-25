# CLAUDE.md — v2 ADDENDUM (March 2026)

> This addendum overrides conflicting sections in the original CLAUDE.md.
> Paste this into Claude Code alongside the original CLAUDE.md.
> If there's a conflict, THIS document wins.

---

## Current Reality (read this first)

The repo has ~23,000 lines of TypeScript across 150+ files. The architecture is sound. The pipeline (ingest → transcribe → analyze → review) exists as real code. But **the product has not been tested end-to-end with real API calls.** Mock mode works. Real Gemini calls fail intermittently.

**What works today:**
- Auth (sign-up, sign-in, profile auto-creation, forgot password)
- Job creation from article URLs
- Ingest worker (downloads article, stores in Supabase Storage)
- Mock mode (MOCK_AI=true) — full pipeline with fixture data
- Review queue UI (clips tab, text tab, copy, edit, save, refine)
- Progress checklist with SSE streaming
- Keyboard shortcuts in review
- Job list with status filters

**What is broken or untested:**
- Gemini API calls fail intermittently during analyze step — error isolation is missing
- YouTube URL ingestion requires yt-dlp + FFmpeg (not installed on dev machine)
- Video rendering is intentionally skipped (render step marked as 'skipped')
- Settings page inputs don't save
- No job delete functionality
- No toast notification system
- No confirmation dialogs for destructive actions
- Build fails with OOM on production (needs NODE_OPTIONS=--max-old-space-size=4096)

---

## LLM Provider Rules (UPDATED)

The default LLM provider is **Gemini Flash** (gemini-dev mode), not Anthropic Claude. This changed because Gemini is ~40x cheaper for development iteration.

### Provider Modes

| Mode | Env Var | Provider | Cost | Use When |
|------|---------|----------|------|----------|
| `mock` | `MOCK_AI=true` | MockLLMProvider | $0 | UI development, testing pipeline logic |
| `gemini-dev` | `LLM_PROVIDER_MODE=gemini-dev` | Gemini 2.0 Flash | ~$0.30/M input | Development, iteration, testing |
| `anthropic-prod` | `LLM_PROVIDER_MODE=anthropic-prod` | Claude Sonnet | ~$3/M input | Production, high-quality output |

**Rules:**
- Always test with `mock` mode first when building UI or pipeline logic
- Use `gemini-dev` for testing real LLM output formatting and quality
- Never hard-code a provider. Always go through `getLLMProvider()`
- Every LLM call MUST have its own try-catch. If LinkedIn post generation fails, summary generation must still succeed.

### Error Isolation Rule (NEW)

**Every individual LLM call must fail independently.** The analyze handler runs 3-6 LLM calls per job (insights, summary, LinkedIn posts, X threads, newsletter, chapter markers). If ANY single call fails:
1. Log the error with full details (provider, model, error message, first 200 chars of response)
2. Continue with remaining calls
3. Store partial results in the database
4. Mark the job as complete (not failed) with a `warnings` field noting which outputs failed
5. Only mark the job as `failed` if ALL LLM calls fail

---

## Transcription Provider Rules (UPDATED)

Default engine is **AssemblyAI**, not Whisper. Set via `TRANSCRIPTION_ENGINE=assemblyai` in .env.local.

Whisper (via Replicate) is available but requires REPLICATE_API_TOKEN. Don't configure it for development.

---

## Render Pipeline (UPDATED)

Video rendering is **intentionally skipped** for the vertical slice. The analyze handler marks jobs as `complete` with render step as `skipped` after generating clips and text outputs.

The review queue works with clip metadata (titles, scores, timestamps, transcript excerpts) without rendered video files. This is the correct v1 behavior for articles and text-only content.

Re-enable rendering later when:
1. yt-dlp and FFmpeg are installed
2. YouTube URL ingestion is tested
3. The analyze step works reliably with real LLM calls

---

## UX Standards (UPDATED — based on competitor research)

### Design Language — Production Signals

These are the specific UI patterns that separate "AI toy" from "production SaaS." Every component Claude Code builds must follow these:

**Status Indicators (mandatory on every job card):**
- Queued: gray dot + clock icon + "Queued" text
- Processing: blue animated dot + spinner + current step label ("Analyzing...")
- Complete: green dot + checkmark + "Complete" text
- Failed: red dot + X + "Failed" text + error preview
- Cancelled: gray dot + dash + "Cancelled" text

**Toast Notifications (mandatory for all user actions):**
- Copy: "Copied to clipboard" (green, auto-dismiss 3s)
- Save: "Changes saved" (green, auto-dismiss 3s)
- Delete: "Job deleted · Undo" (amber, 6s with undo button)
- Error: "Failed to save" (red, sticky until dismissed)
- Position: bottom-center, stack up to 3

**Confirmation Dialogs (mandatory for all destructive actions):**
- Delete job: "Delete this job? All clips and text outputs will be permanently removed."
- Cancel job: "Cancel this job? Processing will stop and cannot be resumed."
- Red button for destructive action, gray for cancel
- Focus on the safe option by default

**Three-Dot Overflow Menu (mandatory on all list items):**
- Jobs: View, Retry (if failed), Cancel (if processing), Delete
- Clips: Approve, Reject, Export, Delete
- Text outputs: Copy, Edit, Regenerate, Delete

**Empty States (mandatory for all list views):**
- Jobs list (empty): illustration + "Your content will appear here" + "Upload your first video" CTA + link to sample project
- Clips (none): "No clips generated for this job" + explanation
- Text outputs (none): "No text outputs yet" + explanation
- Schedule (empty): "Nothing scheduled" + "Process a video to get started"

**Keyboard Shortcuts (keep existing, add these):**
- `?` : Show shortcut help overlay
- `D` : Delete selected item (with confirmation)
- `Ctrl+Z` / `Cmd+Z` : Undo last action (if within undo window)

### No "Virality" Language (unchanged)

We do not use the word "viral" or "virality" anywhere. We call it "engagement score." This is a conscious differentiation from OpusClip.

---

## Processing Speed Rules (NEW)

### User Expectations (from competitor research)
- Article processing: < 30 seconds
- 5-minute video: < 2 minutes
- 30-minute video: < 5 minutes

### Implementation Rules
1. Show step-by-step progress with elapsed time per step
2. Show estimated remaining time as a range ("~20-40 seconds"), never a single number
3. Allow users to navigate away during processing — show a badge in sidebar ("2 jobs processing")
4. Send toast when processing completes if user navigated away
5. Never show a fake progress bar. Use step indicators with descriptive labels.

---

## Anti-Drift Rules (UPDATED — add these to existing list)

11. **Do not make LLM calls during UI development.** Use MOCK_AI=true. Switch to gemini-dev only when testing LLM output format.
12. **Do not add UI components without toast feedback.** Every button that triggers a mutation (save, delete, copy, approve) must show a toast confirming the action.
13. **Do not add a delete action without a confirmation dialog.** No exceptions.
14. **Do not leave settings inputs non-functional.** If a settings UI exists, the save/update API must also exist and be wired.
15. **Do not skip error boundaries.** Every route segment needs error.tsx and loading.tsx.
16. **Every LLM call must fail independently.** See Error Isolation Rule above.

---

## Environment Variables (UPDATED)

```env
# === MINIMUM FOR DEVELOPMENT ===
DATABASE_URL=                        # Supabase pooler (port 6543)
DIRECT_DATABASE_URL=                 # Supabase direct (port 5432, no pgbouncer)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=                           # Upstash Redis URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# === LLM PROVIDER ===
LLM_PROVIDER_MODE=gemini-dev         # mock | gemini-dev | anthropic-prod
GEMINI_API_KEY=                      # Required for gemini-dev mode
# ANTHROPIC_API_KEY=                 # Required for anthropic-prod mode

# === MOCK MODE (zero cost) ===
# MOCK_AI=true                       # Use fixture data for all LLM calls
# DEV_NO_EXTERNAL_APIS=true          # Block ALL paid APIs

# === TRANSCRIPTION ===
TRANSCRIPTION_ENGINE=assemblyai
ASSEMBLYAI_API_KEY=                  # Required for real transcription

# === OPTIONAL ===
# REPLICATE_API_TOKEN=               # For Whisper transcription
# STRIPE_SECRET_KEY=                 # For billing (not needed for vertical slice)
```

---

## Before You Start Any Task (UPDATED)

1. Read CLAUDE.md (this file + the addendum).
2. Check which mode you should work in: mock (UI work) or gemini-dev (LLM testing).
3. Read the relevant docs/ spec for the area you're working in.
4. If modifying UI components: read DESIGN_SYSTEM.md. Every component needs toast feedback, error handling, and loading states.
5. If modifying the pipeline: read the Error Isolation Rule above.
6. Write code. Run `npx tsc --noEmit`. Fix all errors.
7. One concern per commit.
