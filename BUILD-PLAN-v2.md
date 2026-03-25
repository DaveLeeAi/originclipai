# BUILD_PLAN.md — v2 REALITY CHECK (March 2026, UPDATED)

> Reflects actual state + UI redesign plan.
> Sprints 1-2 fix stability. Sprint 3 polishes. Sprint 4 rebuilds the UI.

---

## Honest Status

### What Works

| System | Status |
|--------|--------|
| Auth (sign-up, sign-in, forgot pw) | ✅ Working |
| Database schema (Prisma, 9 models) | ✅ Working |
| Job creation (article URLs) | ✅ Working |
| Ingest worker | ✅ Working |
| Analyze worker (mock mode) | ✅ Working |
| Analyze worker (Gemini) — error isolation | ✅ Implemented |
| Review queue UI | ✅ Working |
| Job delete + toast + confirm dialog | ✅ Working |
| Settings (caption style, account name) | ✅ Working |
| Mock mode (MOCK_AI=true) | ✅ Working |
| Gemini provider (2.5-flash, timeout, retry) | ✅ Hardened |

### What's Broken

| Issue | Severity |
|-------|----------|
| 15 TypeScript errors | HIGH |
| Worker crashes mid-job (Redis disconnect) | CRITICAL |
| Dual auth conflict (schedule/billing routes) | HIGH |
| Source type cards decorative | MEDIUM |
| Connections/Billing pages crash | MEDIUM |
| UI looks like a prototype | CRITICAL |

---

## Sprint 1: Stability (1 day)

1. Fix 15 TypeScript errors
2. Fix dual auth (migrate schedule + billing routes to Supabase auth)
3. Wire source type cards or add Coming Soon states
4. Coming-soon states for Connections and Billing
5. Add Billing to sidebar nav
6. Worker crash diagnostics

## Sprint 2: Reliability (1 day)

1. Fix worker crashes (Redis connection, memory, graceful shutdown)
2. Test article pipeline end-to-end in gemini-dev
3. Verify partial results on LLM failures
4. Test settings persistence

## Sprint 3: Polish (1 day)

1. Processing elapsed time
2. Navigate-away messaging
3. Background job completion toast
4. Sidebar active route highlighting
5. Jobs list pagination

---

## Sprint 4: UI Redesign (3-5 days)

> Read DESIGN-SYSTEM-v2.md before any task here.

### 4.1 Foundation (half day)
Install Inter + Geist Mono, CSS vars in globals.css (light+dark), update tailwind.config.ts, `npx shadcn-ui@latest init`, add core components, install Lucide React + Framer Motion, dark mode toggle.

### 4.2 Dashboard / Job List (1 day)
Rebuild AppShell (collapsible sidebar, Lucide icons, new tokens). Rebuild JobsList (row-card layout, status dots, output counts). Filter chips. Cmd+K search. Skeleton loading. Keep all existing functionality.

### 4.3 Processing Status (half day)
Multi-step stepper (Framer Motion animated dots). Thin progress bar. Substep messages. Background indicator in sidebar. Toast on completion.

### 4.4 Review Queue (1-2 days)
Three-panel layout. Left: output list by type. Center: platform mockup previews. Score rings. Keyboard shortcuts (A/E/R). Batch actions bar. Edit panel slides from right. Staggered list animation.

### 4.5 New Job Creation (half day)
Centered modal. Working source type cards. Auto-populated metadata. Output toggles. Template selector. Advanced settings collapsed.

### 4.6 Settings + Coming Soon (half day)
Restyle all settings. Connections: disabled with "Coming soon". Billing: plan cards visible, upgrade disabled. API Keys + Templates: restyled, plan-gated.

### 4.7 Landing + Marketing (1 day)
Rebuild hero, features, pricing, FAQ with new design system. Fix blog links. Restyle nav + footer.

---

## Quality Gates

1. `npx tsc --noEmit` — 0 errors
2. `npm test` — all pass
3. Create job → see outputs in review
4. Delete job → confirm → toast → removed
5. Settings save + persist on reload
6. Dark mode toggle → every page correct
7. Every button has hover + focus states
8. Every page has skeleton loading
