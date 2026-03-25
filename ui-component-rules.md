# skills/ui-component-rules.md

> Rules for building UI components in OriginClipAI.
> **UPDATED March 2026 for design system v2 rebuild.**
> Read DESIGN-SYSTEM-v2.md for exact tokens and specs.

---

## The Three Laws (unchanged)

1. **Every Action Gets Feedback** — within 100ms: spinner, toast, dialog, or state change
2. **Every Destructive Action Gets Confirmation** — dialog + red button + undo toast
3. **Every List Gets an Empty State** — illustration + text + CTA

---

## Component Library: shadcn/ui

All new components MUST use shadcn/ui (Radix UI + Tailwind). Do NOT build custom when shadcn/ui has one.

```bash
npx shadcn-ui@latest add button dialog dropdown-menu toast input badge card tabs tooltip select checkbox
```

| Need | Component | Notes |
|------|-----------|-------|
| Buttons | `Button` | default, secondary, ghost, destructive, outline |
| Modals | `Dialog` | confirmations, new job creation |
| Dropdowns | `DropdownMenu` | three-dot menus |
| Toasts | `Toast` + `Toaster` | bottom-center, stacked |
| Inputs | `Input` | h-10, accent focus ring |
| Badges | `Badge` | status, output counts |
| Cards | `Card` | job rows, feature cards |
| Tabs | `Tabs` | review queue, settings |
| Tooltips | `Tooltip` | shortcut hints, truncated text |
| Checkboxes | `Checkbox` | bulk selection |

Customize each to match DESIGN-SYSTEM-v2.md tokens after install.

---

## Icons: Lucide React

```tsx
import { Plus, Trash2, MoreVertical, Check, X } from 'lucide-react';
// 16px inline, 20px nav, 24px feature
```

Replace ALL existing inline SVGs with Lucide icons during rebuild.

---

## Loading States

- **Page**: `loading.tsx` with content-shaped skeletons (NOT spinners)
- **Component**: SWR `isLoading` → skeleton matching content shape
- **Button**: disabled + `<Loader2 className="animate-spin" />`

---

## Animation

- **Framer Motion**: page transitions, staggered lists, progress bars, modals, score rings
- **CSS transitions**: hover/focus (150ms), color changes, borders, opacity
- **Never animate**: text content changes, layout shifts on data load

---

## Color Quick Reference

| Purpose | Token |
|---------|-------|
| Page bg | --bg-base |
| Card bg | --bg-surface-1 |
| Hover | --bg-surface-2 |
| Primary text | --text-primary |
| Secondary text | --text-secondary |
| Accent/CTA | --accent-primary (#6366F1) |
| Success | --success (#22C55E) |
| Error | --error (#EF4444) |
| Borders | --border-default |

Full tokens in DESIGN-SYSTEM-v2.md.
