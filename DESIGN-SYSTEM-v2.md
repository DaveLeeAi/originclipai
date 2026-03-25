# DESIGN-SYSTEM-v2.md — Production Redesign Spec (March 2026)

> Complete design system for OriginClipAI production rebuild.
> Based on competitive teardown of OpusClip, Castmagic, Munch, Vizard, Descript, Riverside, Kapwing.
> Benchmarked against Linear, Vercel, Notion, Raycast for premium SaaS quality signals.
> This document is the **source of truth** for all UI work. DESIGN-SYSTEM-ADDENDUM.md defers to this.

---

## Strategic Position

OriginClipAI occupies the gap between video-only clippers (OpusClip, Vizard) and text-only repurposers (Castmagic). Our UI must communicate "this replaces three tools" through a unified review queue that handles clips + text in one workflow, with the visual polish of Linear/Vercel and the simplicity of a "review and approve" flow.

**Light-first** (competitors are all dark-mode-only or dark-default). **Keyboard-driven.** **Information-dense without being cluttered.**

---

## Implementation Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Components | **shadcn/ui** (Radix UI + Tailwind) | Full code ownership, accessibility, semantic theming |
| Styling | **Tailwind CSS v4** + CSS custom properties | Token-based, dark mode via class toggle |
| Icons | **Lucide React** (16px inline, 20px nav, 24px feature) | Default in shadcn/ui, consistent 1.5px stroke |
| Animation | **Framer Motion** | Page transitions, staggered lists, progress animations |
| Font | **Inter** (sans) + **Geist Mono** (data/timestamps) | Premium SaaS standard, free, screen-optimized |

---

## Typography Scale

```
Page title (h1):     24px / 600 / 1.25 line-height / -0.01em
Section heading (h2): 20px / 600 / 1.3 / -0.005em
Card title (h3):     16px / 600 / 1.4 / 0
Body:                14px / 400 / 1.5 / 0
Secondary/meta:      13px / 400 / 1.5 / 0
Labels/UI:           13px / 500 / 1.4 / 0
Badges/caps:         12px / 500 / 1.35 / +0.01em
Buttons:             14px / 500 / 1.0 / 0
Monospace data:      13px / Geist Mono 400 / tabular-nums
```

Weight usage: **400** body, **500** labels/buttons/nav, **600** headings, **700** hero metrics only.

---

## Color System

### Light Mode (default)

```css
--bg-base:        #FFFFFF;
--bg-surface-1:   #F8FAFC;     /* card backgrounds, sidebar */
--bg-surface-2:   #F1F5F9;     /* hover states, active items */
--bg-surface-3:   #E2E8F0;     /* pressed states, dividers */
--text-primary:   #0F172A;     /* slate-900 */
--text-secondary: #64748B;     /* slate-500 */
--text-tertiary:  #94A3B8;     /* slate-400: placeholders */
--border-default: rgba(0,0,0,0.08);
--border-hover:   rgba(0,0,0,0.12);
--border-strong:  rgba(0,0,0,0.16);
```

### Dark Mode

```css
--bg-base:        #0A0A0F;
--bg-surface-1:   #111118;
--bg-surface-2:   #1A1A24;
--bg-surface-3:   #232330;
--text-primary:   #F1F5F9;
--text-secondary: #94A3B8;
--text-tertiary:  #64748B;
--border-default: rgba(255,255,255,0.08);
--border-hover:   rgba(255,255,255,0.12);
--border-strong:  rgba(255,255,255,0.16);
```

### Accent & Status (both modes)

```css
--accent-primary:  #6366F1;     /* Electric indigo — CTAs, active */
--accent-hover:    #818CF8;
--accent-subtle:   rgba(99,102,241,0.12);
--success:         #22C55E;
--success-subtle:  rgba(34,197,94,0.12);
--error:           #EF4444;
--error-subtle:    rgba(239,68,68,0.12);
--warning:         #F59E0B;
--warning-subtle:  rgba(245,158,11,0.12);
--info:            #3B82F6;
--info-subtle:     rgba(59,130,246,0.12);
--pending:         #A855F7;
--pending-subtle:  rgba(168,85,247,0.12);
```

**IMPORTANT:** The old palette (#5046e5, #7c3aed, #f6f5f2, #e4e2dd, #6b6960, #a09e96, #1a1a1a) is RETIRED. All new components use the tokens above. Migration: replace old hex values file-by-file as each surface is rebuilt.

---

## Spacing (8px base grid)

```css
--space-1:  4px;    /* icon gaps, tight inline */
--space-2:  8px;    /* between related elements */
--space-3:  12px;   /* input padding, small gaps */
--space-4:  16px;   /* card padding compact, grid gaps */
--space-5:  20px;   /* medium gaps */
--space-6:  24px;   /* card padding standard, between cards */
--space-8:  32px;   /* section spacing */
--space-12: 48px;   /* page-level spacing */
--space-16: 64px;   /* hero section breaks */
```

---

## Border Radius

```css
--radius-sm:   4px;    /* badges, tags */
--radius-md:   6px;    /* buttons, inputs */
--radius-lg:   8px;    /* cards, panels */
--radius-xl:   12px;   /* modals, large containers */
--radius-2xl:  16px;   /* feature cards, hero elements */
--radius-full: 9999px; /* avatars, pill badges */
```

---

## Shadows (light mode only — dark mode uses surface elevation)

```css
--shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px -1px rgba(0,0,0,0.08);
--shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08);
--shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1);
```

---

## Animation Timing

```css
--duration-instant: 100ms;  /* active/pressed */
--duration-fast:    150ms;  /* hover, focus */
--duration-normal:  200ms;  /* panel open/close */
--duration-slow:    300ms;  /* modal entry */
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out:     cubic-bezier(0, 0, 0.2, 1);
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);
```

---

## Layout Structure

**Inverted-L layout** (Linear pattern):
- Collapsible left sidebar: 240px expanded, 56px collapsed (icon-only)
- Top header with breadcrumb/tabs
- Content area: max-width 1280px centered, 32px gutters desktop, 16px mobile

Sidebar: Logo → Nav (Dashboard, Jobs, Templates, Integrations, Settings) → Usage meter → User avatar.

---

## Page-Specific Specs

### Dashboard / Job List

Hybrid row-card layout. Each job is a full-width row:
- Source thumbnail (60×40px, radius-md) → Title (16px/600) + meta (platform + duration + time, 13px) → Status dot+label → Output counts ("8 clips, 3 posts") → Three-dot menu
- Row hover: bg-surface-1, shadow-sm, "Review →" ghost button fades in
- Filter chips: All, Processing, Ready, Reviewed, Published
- Cmd+K search

### Processing Status

Multi-step stepper:
- Active: pulsing blue dot (8px, 1.5s), contextual message
- Complete: green checkmark
- Pending: hollow circle
- Thin progress bar (4px, Framer Motion animated)
- Background processing with sidebar indicator + toast on complete

### Review Queue (three-panel)

Left sidebar (280px): outputs grouped by type with counts
Center: platform mockup previews (LinkedIn frame, X thread frame, etc.)
Right (400px, slides in): edit panel
Actions: ✓ Approve (A), ✎ Edit (E), ✕ Reject (R), → Next
Score: circular progress ring (32px), color by threshold, AI rationale text
Batch: fixed bottom bar on multi-select

### New Job Creation

Centered modal (560px): URL input (48px) → drop zone → auto-populated metadata → output toggles → template selector → collapsed advanced → "Create job" button

---

## Component Specs

### Buttons
Primary: accent-primary bg, white text, h-10, px-5, radius-md, hover translateY(-1px)
Secondary: transparent, border-default, hover bg-surface-1
Ghost: transparent, hover bg-surface-1
Destructive: secondary base, hover → error color + error-subtle bg
Small: h-8, px-3, 13px
Focus: 0 0 0 2px bg-base, 0 0 0 4px accent-primary

### Cards
bg-surface-1, border-default, radius-lg, padding space-6, hover border-hover + shadow-md

### Status Badges
8px dot + 13px/500 label. NO colored background pills.

### Inputs
h-10, px-3, radius-md, border-default, focus border accent-primary + 3px accent-subtle ring

### Skeletons
Content-shaped shimmer (1.5s, surface-1 → surface-2 → surface-1). Never generic spinners.

---

## What NOT To Do

- Do NOT use the old color palette (#5046e5, #7c3aed, #f6f5f2, etc.)
- Do NOT use colored background pills for status — dots only
- Do NOT use generic spinners — content-shaped skeletons
- Do NOT skip hover/focus states on interactive elements
- Do NOT use inline styles — Tailwind utilities mapped to CSS vars
- Do NOT build without dark mode — CSS vars from day one
- Do NOT say "viral" — use "quality score" or "engagement score"
