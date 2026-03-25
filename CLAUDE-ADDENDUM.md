# CLAUDE.md — v2 ADDENDUM (March 2026, UPDATED)

> This addendum overrides conflicting sections in the original CLAUDE.md.
> If there's a conflict, THIS document wins.
> **UI REDESIGN IN PROGRESS** — read DESIGN-SYSTEM-v2.md before touching any UI.

---

## Current Reality (read this first)

The repo has ~25,000 lines of TypeScript across 150+ files. The architecture is sound. The pipeline (ingest → transcribe → analyze → review) exists as real code. But **the UI is being rebuilt from scratch** with a new design system.

**What works today:**
- Auth (sign-up, sign-in, profile auto-creation, forgot password)
- Job creation from article URLs
- Ingest worker (downloads article, stores in Supabase Storage)
- Mock mode (MOCK_AI=true) — full pipeline with fixture data
- Gemini 2.5 Flash as default LLM (LLM_PROVIDER_MODE=gemini-dev)
- Error isolation in analyze handler (individual try-catch per LLM call)
- Review queue UI (clips tab, text tab, copy, edit, save, refine)
- Progress checklist with SSE streaming
- Keyboard shortcuts in review
- Job list with status filters
- Job delete with confirmation dialog + toast
- Settings page (account, caption style saves)
- Toast notification system
- Dropdown menus on job cards
- Empty states on all list views

**What is broken or needs work:**
- 15 TypeScript errors (implicit any, missing Prisma exports)
- Worker crashes ("The service is no longer running") — BullMQ/Redis disconnect
- Dual auth system conflict (old cookie-based vs new Supabase)
- Source type cards on New Job page are decorative (no onClick)
- Connections page crashes (no OAuth credentials configured)
- Billing upgrade buttons crash (no Stripe keys configured)
- Billing link missing from sidebar nav
- **Entire UI needs redesign** — current UI is developer-prototype quality

---

## UI REDESIGN RULES (NEW — March 2026)

### Read DESIGN-SYSTEM-v2.md First

Before writing ANY UI code, read `DESIGN-SYSTEM-v2.md`. It contains the complete design system with exact tokens, component specs, and page layouts. Non-negotiable.

### Stack Change

| Before | After |
|--------|-------|
| Custom Tailwind components | **shadcn/ui** (Radix UI primitives) |
| Inline SVG icons | **Lucide React** |
| System font stack | **Inter** (sans) + **Geist Mono** (data) |
| No animation library | **Framer Motion** |
| Light mode only | **Light + Dark mode** via CSS vars |
| Old palette (#5046e5 etc.) | **New tokens** (--accent-primary: #6366F1 etc.) |

### Migration Rules

1. **Do not mix old and new palettes in the same component.** Rebuilding = v2 tokens. Patching = keep existing.
2. **Install shadcn/ui components as needed.** `npx shadcn-ui@latest add <component>`.
3. **All new CSS uses custom properties** from globals.css, not hardcoded hex.
4. **Dark mode from day one.** `.dark` class toggle, localStorage + prefers-color-scheme.
5. **Every interactive element needs hover + focus states.** 150ms default transition.

### Redesign Priority Order

1. Design system foundation (fonts, CSS vars, Tailwind theme, shadcn/ui base)
2. Dashboard / Job list
3. Processing status
4. Review queue
5. New Job creation
6. Settings pages
7. Landing page
8. Marketing pages

---

## LLM Provider Rules (unchanged)

Default: **Gemini Flash** (gemini-dev mode). Always test with mock first. Never hard-code a provider. Every LLM call must have its own try-catch.

### Error Isolation Rule (unchanged)

Every individual LLM call must fail independently. Partial results saved. Job marked complete with warnings unless ALL calls fail.

---

## Anti-Drift Rules (UPDATED)

1-16: Same as before.
17. **Do not use old hex colors in new components. Use CSS vars from DESIGN-SYSTEM-v2.md.**
18. **Do not build custom components when shadcn/ui has one.**
19. **Do not skip dark mode. Every new component must work in both themes.**
20. **Do not use generic spinners. Use content-shaped skeleton loading.**

---

## Before You Start Any Task (UPDATED)

1. Read CLAUDE.md + this addendum.
2. **If touching UI: read DESIGN-SYSTEM-v2.md first.** Non-negotiable.
3. Check mode: mock (UI) or gemini-dev (LLM testing).
4. Read relevant docs/ spec.
5. If modifying UI: shadcn/ui, new tokens, Inter font.
6. If modifying pipeline: Error Isolation Rule.
7. Write code. `npx tsc --noEmit`. Fix all errors.
8. One concern per commit.
