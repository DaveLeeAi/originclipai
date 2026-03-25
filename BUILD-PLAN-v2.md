# BUILD_PLAN.md — v2 REALITY CHECK (March 2026)

> This replaces the original BUILD_PLAN.md which described a 16-week plan.
> This document reflects what's actually built, what's broken, and what to build next.

---

## Honest Status

### What's Built (code exists and runs)

| System | Status | Notes |
|--------|--------|-------|
| Auth (sign-up, sign-in, OAuth, forgot pw) | ✅ Working | Profile auto-creates on first dashboard visit |
| Database schema (Prisma) | ✅ Working | 9 models, all deployed to Supabase |
| Job creation (article URLs) | ✅ Working | YouTube URLs need yt-dlp installed |
| Ingest worker | ✅ Working | Articles: HTTP fetch + HTML strip. YouTube: needs yt-dlp |
| Transcribe worker | ⚠️ Untested | AssemblyAI provider exists, never tested with real call |
| Analyze worker (mock mode) | ✅ Working | Returns fixture data correctly |
| Analyze worker (Gemini mode) | ❌ Failing | Intermittent failures, missing error isolation |
| Render worker | ⏸️ Skipped | Intentionally disabled for vertical slice |
| Review queue UI | ✅ Working | Clips tab, text tab, copy, edit, refine, approve |
| Progress checklist (SSE) | ✅ Working | Step-by-step with real-time updates |
| Job list with filters | ✅ Working | Status + source type filters |
| Billing UI | ✅ Built | Not wired to real Stripe (no keys configured) |
| Social scheduling | ✅ Built | Not wired to real OAuth (no keys configured) |
| Export worker | ✅ Built | Not tested end-to-end |
| Landing page | ✅ Built | Basic, no marketing layout |
| Pricing page | ✅ Built | |
| Mock mode | ✅ Working | MOCK_AI=true for $0 development |
| Gemini provider | ⚠️ Partial | Connected but fails intermittently |
| Cost controls | ✅ Built | Generation toggles, caching, daily caps |

### What's Broken

| Issue | Severity | Root Cause |
|-------|----------|------------|
| Gemini analyze calls fail ~50% of time | CRITICAL | No error isolation — one failed LLM call kills entire job |
| No job delete | HIGH | No DELETE endpoint, no UI button |
| Settings don't save | HIGH | Inputs exist but no onChange/save handlers |
| No toast notifications | HIGH | Actions succeed silently or fail silently |
| No confirmation dialogs | MEDIUM | Delete/cancel have no safety net |
| Build OOM on production | MEDIUM | Needs NODE_OPTIONS=--max-old-space-size=4096 |
| Processing speed (articles) | MEDIUM | Unnecessary Supabase Storage round-trip for text content |

### What's Not Built Yet (and shouldn't be until above is fixed)

- YouTube URL end-to-end (needs yt-dlp + FFmpeg)
- Video rendering (FFmpeg pipeline)
- Social OAuth connections
- Stripe billing (real payments)
- Email notifications

---

## Next Sprint: Reliability + Essentials (1-2 days)

Priority order. Do not reorder. Each task must be committed separately.

### Sprint 1: Make Gemini calls reliable

**Task 1.1: Error isolation in analyze handler**
- Wrap every LLM call in individual try-catch
- Failed calls log error + continue with remaining calls
- Partial results saved to database
- Job marked complete with warnings, not failed

**Task 1.2: Gemini provider hardening**
- Add 60-second timeout via AbortController
- Log full request/response for debugging
- Handle Gemini rate limits (429) with backoff
- Handle malformed JSON with cleaner retry logic

**Task 1.3: Test with real Gemini call**
- Process one article URL in gemini-dev mode
- Verify at least some text outputs appear in review queue
- Document any remaining failures

### Sprint 2: Missing UI essentials

**Task 2.1: Toast notification system**
- Create toast provider + useToast hook
- Wire to all existing actions (copy, save, approve, refine)

**Task 2.2: Job delete**
- DELETE /api/v1/jobs/:id endpoint
- Three-dot menu on job cards
- Confirmation dialog
- Toast with undo

**Task 2.3: Cancel job**
- PATCH /api/v1/jobs/:id with cancel status
- Button in three-dot menu (only for processing jobs)

**Task 2.4: Functional settings**
- Wire onChange to all settings inputs
- PATCH /api/v1/settings endpoint
- Save on change with toast confirmation

**Task 2.5: Empty states**
- Jobs list empty state with CTA
- Review page empty clip/text states with explanations

### Sprint 3: Polish (only after Sprint 1-2 are done)

- Dropdown menu component
- Checkbox + bulk select on job cards
- Batch delete failed jobs
- Processing elapsed time display
- "Navigate away" messaging during processing
- Toast when background job completes
- Sidebar active route highlighting
- Pagination for jobs list (replace take: 50)

---

## Quality Gates

Before declaring any sprint complete:

1. `npx tsc --noEmit` — 0 errors
2. `npm test` — all tests pass
3. Manual test: create job with article URL in gemini-dev mode → see text outputs in review
4. Manual test: delete a job → confirmation dialog → toast → job removed from list
5. Manual test: all settings inputs save and persist on page reload

---

## What NOT to Build Next

Do not build any of these until the above sprints are complete and the vertical slice works reliably with real Gemini calls:

- YouTube URL ingestion (needs yt-dlp + FFmpeg setup)
- Video rendering pipeline
- Social OAuth integration
- Stripe billing integration
- Marketing page redesign
- Blog content
- API documentation
- Mobile responsiveness
- Dark mode
