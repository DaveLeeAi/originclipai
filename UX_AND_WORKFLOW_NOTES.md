# UX_AND_WORKFLOW_NOTES.md

> UX decisions, workflow architecture, and interaction patterns for OriginClipAI v1 — informed by competitive research and the interactive prototype.

---

## Core UX Principle

**AI proposes, human decides.**

Every competitor markets "one-click automation" and delivers content that requires 20-40% manual review. OriginClipAI treats the review step as the product's center of gravity, not an afterthought. The entire UX is built around making the review-and-approve cycle fast, honest, and satisfying.

---

## The Four-Step Pipeline

The user-facing workflow maps to four sequential steps. The sidebar pipeline makes progress visible at all times.

```
INGEST → PROCESSING → REVIEW → SCHEDULE
```

### Step 1: Ingest

**Primary action:** Paste a URL or upload a file.

**UX decisions:**
- Single input field accepts YouTube URLs, article URLs, any public video URL. Auto-detects type.
- File upload supports MP4, MP3, WAV, M4A, PDF via drag-and-drop or file picker.
- Source type cards below the input field make capabilities discoverable (YouTube, PDF, Video, Audio).
- No multi-step wizard. One input, one "Process" button.
- URL validation happens inline — green check for valid YouTube URLs, yellow warning for unknown URLs, red for invalid.

**Why this matters:** OpusClip and Vizard both have clean ingest UX. We match their simplicity while expanding input types. The key differentiator is the article/PDF source cards — they signal "this tool does more than video" from the first interaction.

**Edge cases:**
- YouTube URL with timestamp → offer to start from that timestamp
- Playlist URL → reject with message "paste individual video URLs" (v1)
- Article URL with paywall → detect and warn before processing
- PDF with no text (scanned) → warn, offer OCR pathway (v2)

---

### Step 2: Processing

**Primary action:** Wait while AI analyzes content.

**UX decisions:**
- Animated progress indicator with step-by-step checklist (not just a spinner).
- Steps shown: Transcript generated → Speakers identified (N) → N clip candidates scored → N text outputs drafted → Captions rendered.
- Each step checks off in real-time as the backend completes it.
- Processing time estimate displayed. Honest — "~3 minutes for a 60-minute video."
- Auto-advances to Review when complete. No manual "continue" button.

**Why this matters:** Processing is anxiety-inducing. Competitors show a spinner and a percentage. The checklist approach builds confidence — the user sees concrete progress, not abstract loading. It also sets expectations for what's coming (clips AND text outputs).

**Technical note:** Backend sends SSE (Server-Sent Events) or WebSocket updates per processing step. Each step has a discrete status: `pending → running → complete → error`.

---

### Step 3: Review (Core UX Surface)

**Primary action:** Review, approve, edit, or skip each AI-generated output.

This is the most important screen in the product. It's where creators spend 80% of their time.

**Layout:** Three-panel design.
1. **Left panel (420px):** Scrollable list of all outputs (clips or text) with preview metadata.
2. **Right panel (flex):** Detailed preview of selected item with action buttons.
3. **Tabs at top:** "Video Clips (N)" and "Text Outputs (N)" — switching is instant.

#### Clip Review

**List item shows:**
- Thumbnail placeholder (9:16 aspect ratio)
- Clip duration overlay
- Status dot (approved / review / rejected)
- Status label
- Engagement score pill (color-coded: green 90+, amber 80+, gray below)
- Clip title (AI-generated, 1-2 lines)
- Speaker badge (color-coded per speaker)
- Platform icons (if scheduled)

**Detail panel shows:**
- 9:16 video preview with rendered captions
- Clip title
- Metadata badges (duration, score, speaker)
- **Action row:** Approve (green, primary) / Edit / Skip
- **Schedule-to section:** Platform toggle buttons (TikTok, YouTube, LinkedIn)
- Transcript excerpt for the clip (expandable)

**Interaction patterns:**
- Click clip in list → loads in detail panel
- Approve → moves to "approved" status, stays in list (grayed/checked)
- Skip → moves to "rejected" status, dims in list
- Edit → opens lightweight editor (trim start/end, adjust caption timing)
- Keyboard shortcuts: `A` = approve, `S` = skip, `→` = next clip, `←` = previous

**Why this matters:** OpusClip dumps clips in a grid with no structured review. Users scroll, click, evaluate, scroll back. Our approve/skip flow with keyboard shortcuts makes review 3x faster. The linear queue model (like reviewing a PR) is more efficient than the grid-browse model.

#### Text Output Review

**List item shows:**
- Platform icon (LinkedIn, X, Mail)
- Output label ("LinkedIn Post", "X Thread (7 posts)", "Newsletter Section")
- Content preview (3 lines, truncated)
- Word count
- Status dot

**Detail panel shows:**
- Full text content in an editable area
- Word count badge
- **Action row:** Refine with AI / Copy / Schedule
- "Refine with AI" opens a prompt input: "Make it shorter" / "More professional" / "Add a hook" / custom instruction

**Interaction patterns:**
- Click text item → loads full content in detail panel
- Inline editing directly in the preview area
- "Refine with AI" sends the current text + instruction to LLM, replaces content
- "Copy" copies to clipboard with one click (for manual posting)
- "Schedule" opens platform scheduling options

---

### Step 4: Schedule

**Primary action:** Set publish times for approved outputs.

**Layout:** Card grid showing all approved clips and text outputs ready for scheduling.

**Card shows:**
- Thumbnail or platform icon
- Title / preview
- Platform destination badges
- "Not scheduled" / scheduled time
- "Set Time" button → date/time picker

**UX decisions:**
- Simple queue, not a calendar (v1). Calendar view is v2.
- Each card independently schedulable to different platforms and times.
- Approved clips show platform destinations selected during review.
- Text outputs can be scheduled to LinkedIn, X, or copied for manual posting.
- Time picker defaults to "optimal" posting time based on platform (e.g., LinkedIn: Tuesday 9am, TikTok: Thursday 7pm) — user can override.

**Why this matters:** OpusClip's scheduler is widely broken. We ship a simpler, more reliable version. Fewer platforms (4 vs. 6-7), but they actually work. Reliability > breadth in v1.

---

## Cross-Cutting UX Patterns

### Theme

- **Light theme primary** (warm off-white #f6f5f2). Dark theme as toggle (v1.1).
- Shadow-driven hierarchy for card depth.
- Indigo accent (#5046e5) — distinctive, not the overused purple gradient.
- Warm gray borders (#e4e2dd) — avoids cold Bootstrap feel.

### Typography

- **Display:** Instrument Sans — clean, modern, slightly geometric.
- **Body:** DM Sans — excellent readability, warm character.
- **Mono:** JetBrains Mono — for scores, timestamps, technical metadata.

### Color System for Status

| Status | Color | Usage |
|--------|-------|-------|
| Approved | Green (#16a34a) | Clips and text approved for scheduling |
| Review | Amber (#d97706) | Default state — needs human decision |
| Rejected/Skipped | Red (#dc2626) | Dismissed by user |
| Draft | Gray (#a09e96) | Text outputs not yet reviewed |
| Processing | Indigo (#5046e5) | Currently being generated |

### Score Display

- **90+:** Green badge — high confidence
- **80-89:** Amber badge — moderate confidence
- **Below 80:** Gray badge — low confidence
- No "virality" label. Just a number with color context. Hover tooltip explains scoring factors.

### Speaker Badges

- Each detected speaker gets a consistent color throughout the UI.
- Speaker 1 (host): Indigo badge
- Speaker 2 (guest): Cyan badge
- Additional speakers: Amber, Green (up to 4 in v1)
- Badge text: speaker name if detected from transcript, otherwise "Speaker 1", "Speaker 2"

### Empty States

Every screen has a purposeful empty state:
- **Ingest:** "What are we repurposing?" with source type cards
- **Review (no selection):** "Select a clip to preview" with subtle icon
- **Schedule (nothing approved):** "Approve clips and text outputs first" with arrow pointing to Review step
- **Dashboard (no jobs):** "Process your first video" with prominent ingest CTA

### Loading & Progress

- Skeleton screens for content loading (not spinners)
- Processing checklist (not progress bar alone)
- Optimistic UI for approve/skip actions (instant visual feedback, server sync in background)

---

## Mobile Considerations (v1)

v1 is **desktop-first**. The three-panel review layout requires a wide viewport.

Minimum viable mobile support:
- Ingest screen works on mobile (URL paste + process)
- Processing screen works on mobile (checklist progress)
- Review and Schedule are desktop-only with a "continue on desktop" message on mobile
- Full mobile review is v2

---

## Onboarding Flow (v1)

First-time user experience:

1. **Sign up** (email or Google OAuth)
2. **Welcome screen** — "Paste a YouTube URL to try OriginClipAI" with example URL pre-filled
3. **Processing** — first job runs with extra explanatory tooltips on the checklist
4. **Review** — guided highlight of the approve/skip/edit pattern on first clip
5. **Schedule** — prompt to connect first platform (TikTok or YouTube)
6. **Free tier nudge** — after first job completes: "You have 4 free jobs remaining this month"

No product tour overlay. No 12-step wizard. Learn by doing with contextual hints.

---

## Accessibility (v1 baseline)

- Keyboard navigation for all review actions
- ARIA labels on all interactive elements
- Sufficient color contrast (WCAG AA minimum)
- Focus management for panel switches
- Screen reader support for status announcements ("Clip approved", "Text output copied")

---

## Key Metrics to Track in UX

| Metric | What it tells us |
|--------|-----------------|
| Time from ingest to first approve | How fast is the review cycle? |
| Approve rate per job | What % of AI outputs pass human review? |
| Skip rate per job | What % of AI outputs are rejected? |
| Regenerate rate | How often do users ask for re-generation? |
| Review-to-schedule conversion | Do approved items actually get scheduled? |
| Session depth | How many clips/texts reviewed per session? |
| Keyboard shortcut adoption | Are power users emerging? |
