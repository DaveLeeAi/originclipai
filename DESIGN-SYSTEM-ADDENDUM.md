# DESIGN_SYSTEM.md — v2 ADDENDUM (March 2026)

> This addendum adds missing component patterns to the existing DESIGN_SYSTEM.md.
> Based on competitive UX research of OpusClip, Vizard, Descript, Castmagic, Munch, and Gling.
> All components MUST follow these patterns. No exceptions.

---

## Missing UI Primitives (must build before any new features)

The current component library has only: badge.tsx, button.tsx, card.tsx.
The following are REQUIRED for a production-grade SaaS:

### 1. Toast Notification (`src/components/ui/toast.tsx`)

```
Position: fixed bottom-center, 24px from bottom
Stack: up to 3 visible, newest on top
Width: max-w-sm (384px)
Border-radius: rounded-xl
Shadow: shadow-lg

Types:
- success: green-soft bg, green left border, green checkmark icon
- error: red-soft bg, red left border, red X icon, sticky (no auto-dismiss)
- warning: amber-soft bg, amber left border, amber warning icon
- info: accent-soft bg, accent left border, accent info icon
- undo: amber-soft bg, amber left border, "Undo" button on right side

Auto-dismiss: 4 seconds for success/info, 6 seconds for undo, never for error
Animation: slide up + fade in on appear, slide down + fade out on dismiss

Usage pattern:
  const { toast } = useToast();
  toast.success('Changes saved');
  toast.error('Failed to delete job');
  toast.undo('Job deleted', () => undoDelete(jobId));
```

### 2. Confirmation Dialog (`src/components/ui/confirm-dialog.tsx`)

```
Overlay: bg-black/40, backdrop-blur-sm
Container: max-w-sm, rounded-2xl, bg-white, shadow-2xl, p-6
Title: text-lg font-bold
Description: text-sm text-secondary, mt-2
Actions: mt-6, flex gap-3 justify-end
  - Cancel: ghost button, auto-focused
  - Confirm: red button for destructive, accent button for neutral

Usage pattern:
  const confirmed = await confirm({
    title: 'Delete this job?',
    description: 'All clips and text outputs will be permanently removed.',
    confirmText: 'Delete',
    variant: 'destructive',
  });
  if (confirmed) { ... }
```

### 3. Dropdown Menu (`src/components/ui/dropdown-menu.tsx`)

```
Trigger: three-dot icon button (⋮), 32x32, rounded-lg
Menu: min-w-[180px], rounded-xl, bg-white, shadow-lg, border, py-1
Items: px-3 py-2, text-sm, hover:bg-surface-hover, rounded-lg mx-1
Separator: h-px bg-border-subtle mx-2 my-1
Destructive items: text-red, hover:bg-red-soft

Placement: bottom-end (right-aligned below trigger)
Animation: scale from 95% + fade in, 150ms
Close on: click outside, click item, Escape key
```

### 4. Checkbox (`src/components/ui/checkbox.tsx`)

```
Size: 18x18
Border: border-[#e4e2dd], rounded-md
Checked: bg-accent, border-accent, white checkmark
Indeterminate: bg-accent, border-accent, white dash
Focus: ring-2 ring-accent/30
Disabled: opacity-50, cursor-not-allowed

Used for: bulk selection in jobs list, clip approval batch
```

### 5. Tooltip (`src/components/ui/tooltip.tsx`)

```
Background: bg-[#1a1a1a], text-white
Text: text-xs, max-w-[200px]
Border-radius: rounded-lg
Padding: px-2.5 py-1.5
Arrow: 6px triangle
Delay: 500ms hover before show, 100ms before hide
Position: top by default, auto-flip
```

---

## Job Card Pattern (UPDATED)

Every job card in the list MUST include:

```
┌──────────────────────────────────────────────────────────┐
│  [TYPE] Title of the job                    [⋮ menu]     │
│  Article · 38 min ago                                    │
│                                                          │
│  [error message if failed, truncated to 1 line]          │
│                                                          │
│  [7 clips] [10 text] · Complete ●                        │
│  ─── or ───                                              │
│  [Retry] · Failed ●                                      │
│  ─── or ───                                              │
│  Analyzing... ● (with animated dot)                      │
└──────────────────────────────────────────────────────────┘

Three-dot menu actions:
- View → navigate to /jobs/:id/review (or /jobs/:id if processing)
- Retry → POST /api/v1/jobs/:id/retry (only if failed)
- Cancel → PATCH /api/v1/jobs/:id { status: 'cancelled' } (only if processing)
- Delete → DELETE /api/v1/jobs/:id (with confirmation dialog)
```

---

## Text Output Card Pattern (UPDATED)

Based on Castmagic's collapsible section model:

```
┌──────────────────────────────────────────────┐
│  [▼] LinkedIn Post 1: Focus Topic    [📋] [↻] │
│                                                │
│  Full text content visible when expanded...    │
│  Editable inline with Save/Cancel buttons      │
│  when user clicks into the text area.          │
│                                                │
│  [✓ Approve]  [Refine with AI]                 │
└────────────────────────────────────────────────┘

Icons by type:
- Summary: 📄 document icon
- Key insights: 💡 lightbulb icon (amber card background)
- Notable quotes: 💬 quote marks (green card background)
- LinkedIn post: LinkedIn logo/color
- X thread: X logo/color
- Newsletter: ✉ envelope icon
- Chapter markers: 📍 pin icon (table layout with timestamps)

Actions on every text output:
- 📋 Copy (one-click, toast: "Copied to clipboard")
- ↻ Regenerate (re-run LLM for this output only)
- ✓ Approve (mark as approved)
- ✎ Edit (inline edit mode)
- 💾 Save (when in edit mode)
```

---

## Clip Card Pattern (for video jobs)

```
┌──────────────────────────────────────┐
│  [Thumbnail placeholder]              │
│                                       │
│  AI-Generated Title                   │
│  1:23 duration · from 4:32 in source  │
│                                       │
│  [██████████░░] 87  ← score bar      │
│  "Strong hook, complete thought"      │
│                                       │
│  [♥ Like]  [👎 Dislike]  [✎ Edit]    │
└───────────────────────────────────────┘

Score display:
- 80-99: green bar, green number
- 50-79: amber bar, amber number  
- below 50: gray bar, gray number

Score is NOT called "virality score" — it's "engagement score" or just "score"
```

---

## Empty State Pattern

Every list view needs a proper empty state, not just "0 total":

```
┌──────────────────────────────────────────────┐
│                                                │
│         [illustration/icon]                    │
│                                                │
│    Your [items] will appear here               │
│    Brief explanation of what goes here          │
│                                                │
│    [ Primary CTA Button ]                      │
│    Learn more →                                │
│                                                │
└────────────────────────────────────────────────┘
```

Specific empty states:
- Jobs list: "Upload your first video or paste an article URL to get started"
- Clips (in review): "No clips generated" + explanation why (article = no video clips)
- Text outputs: "No text outputs yet"
- Schedule: "Nothing scheduled yet"
- Templates: "Create custom prompts to generate exactly the output you need"

---

## Processing Progress Pattern (UPDATED)

Replace the current simple checklist with a more informative version:

```
┌──────────────────────────────────────────────┐
│  Analyzing your content                        │
│  "How to Do Great Work" by Paul Graham         │
│                                                │
│  [✓] Source downloaded          3s             │
│  [●] Generating text outputs    ~20s remaining │
│      Generating LinkedIn posts...               │
│  [○] Finalizing                                │
│                                                │
│  You can navigate away — we'll notify you       │
│  when it's done.                               │
└────────────────────────────────────────────────┘

Rules:
- Show elapsed time for completed steps
- Show estimated remaining time for active step
- Show descriptive substep label ("Generating LinkedIn posts...")
- Show "You can navigate away" message after 5 seconds
- When complete while user is on another page, show toast: "Your content is ready! [View]"
```

---

## Responsive Breakpoints

```
- Mobile: < 640px  → single column, stacked layout
- Tablet: 640-1024px → sidebar collapsed to icons
- Desktop: > 1024px → full sidebar + content area

The review queue is the most critical responsive target:
- Desktop: side-by-side (list left, detail right)
- Tablet: list only, detail in modal/overlay
- Mobile: list only, tap to navigate to detail page
```

---

## Interaction Feedback Rules

**Every user action must have visual feedback within 100ms:**

| Action | Feedback |
|--------|----------|
| Click button | Button shows loading spinner, disabled state |
| Copy text | Toast: "Copied to clipboard" + button text changes to "Copied ✓" for 2s |
| Save edit | Toast: "Changes saved" + save button briefly shows checkmark |
| Delete item | Confirmation dialog → Toast: "Deleted · Undo" |
| Approve item | Item moves to approved section + toast |
| Reject item | Item collapses or moves to rejected section |
| Navigation | Active sidebar item highlighted immediately |
| Error | Toast with error message + retry option if applicable |
| Form validation | Inline error below field, red border |

**No silent failures.** If an API call fails, the user must see a toast with the error.
